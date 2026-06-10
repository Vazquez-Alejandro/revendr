const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const APIFY_TOKEN = process.env.APIFY_TOKEN
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const RESEND_API_KEY = process.env.RESEND_API_KEY
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN // Mercado Pago (futuro)

const APIFY_ACTORS = {
  google_maps: 'compass~crawler-google-places',
  instagram: 'apify~instagram-profile-scraper',
}

const RUBRO_SEARCH_TERMS = {
  inmobiliaria: 'inmobiliaria',
  estetica: 'peluqueria estetica',
  clinica: 'clinica medica',
  restaurante: 'restaurante',
  gimnasio: 'gimnasio',
  otro: 'negocio',
}

const isBusinessHours = () => {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  return hour >= 9 && hour < 18
}

const isCampaignExpired = (campaign) => {
  if (!campaign.fecha_fin) return false
  const fechaFin = campaign.fecha_fin.toDate ? campaign.fecha_fin.toDate() : new Date(campaign.fecha_fin)
  return new Date() > fechaFin
}

const app = express()
app.use(cors({ origin: true }))

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') {
    express.raw({ type: 'application/json' })(req, res, next)
  } else {
    express.json()(req, res, next)
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============ CAMPAIGNS ============

app.get('/campaigns', async (req, res) => {
  try {
    const snapshot = await db.collection('campanias')
      .orderBy('fecha_creacion', 'desc')
      .limit(50)
      .get()
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns', async (req, res) => {
  try {
    const { nombre, rubro_objetivo, mensaje_template, ciudad } = req.body
    if (!nombre || !rubro_objetivo) {
      return res.status(400).json({ success: false, error: { message: 'Nombre y rubro requeridos' } })
    }

    const docRef = await db.collection('campanias').add({
      nombre,
      rubro_objetivo,
      ciudad: ciudad || '',
      mensaje_template: mensaje_template || '',
      estado: 'activa',
      fecha_inicio: new Date(),
      fecha_creacion: new Date(),
      leads_count: 0,
      demos_generadas: 0,
      mensajes_enviados: 0,
    })

    res.status(201).json({ success: true, data: { id: docRef.id } })
  } catch (error) {
    console.error('Error creating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.patch('/campaigns/:id/status', async (req, res) => {
  try {
    const { estado } = req.body
    await db.collection('campanias').doc(req.params.id).update({
      estado,
      fecha_actualizacion: new Date(),
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ APIFY SCRAPING ============

app.post('/campaigns/:campaignId/scrape', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    const campaign = campaignDoc.data()
    const { ciudad, rubro_objetivo } = campaign
    const searchTerm = `${RUBRO_SEARCH_TERMS[rubro_objetivo] || rubro_objetivo} ${ciudad || ''}`.trim()

    if (!APIFY_TOKEN) {
      return res.status(500).json({ success: false, error: { message: 'Apify token not configured' } })
    }

    await db.collection('campanias').doc(req.params.campaignId).update({
      scraping_status: 'running',
      scraping_started_at: new Date(),
    })

    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${APIFY_ACTORS.google_maps}/runs`,
      {
        searchStringsArray: [searchTerm],
        maxCrawledPlacesPerSearch: 50,
        language: 'es',
      },
      { params: { token: APIFY_TOKEN } }
    )

    const runId = runResponse.data.data.id

    res.json({ success: true, data: { runId, status: 'running' } })

    pollApifyRun(runId, req.params.campaignId, rubro_objetivo).catch(err => {
      console.error('Background scraping error:', err)
    })
  } catch (error) {
    console.error('Error starting scrape:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

async function pollApifyRun(runId, campaignId, rubro) {
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    attempts++

    try {
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        { params: { token: APIFY_TOKEN } }
      )

      const run = statusResponse.data.data

      if (run.status === 'SUCCEEDED') {
        const datasetId = run.defaultDatasetId
        await processApifyResults(datasetId, campaignId, rubro)
        return
      }

      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        await db.collection('campanias').doc(campaignId).update({
          scraping_status: 'failed',
          scraping_error: run.status,
          scraping_completed_at: new Date(),
        })
        return
      }
    } catch (error) {
      console.error('Error polling Apify:', error.message)
    }
  }

  await db.collection('campanias').doc(campaignId).update({
    scraping_status: 'timeout',
    scraping_completed_at: new Date(),
  })
}

async function processApifyResults(datasetId, campaignId, rubro) {
  try {
    const response = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      { params: { token: APIFY_TOKEN, format: 'json' } }
    )

    const leads = response.data || []
    let saved = 0

    for (const raw of leads) {
      const phone = raw.phone || raw.telefono || ''
      const phoneClean = phone.replace(/\D/g, '')

      if (!phoneClean || phoneClean.length < 8) continue

      const leadData = {
        id_campania: campaignId,
        nombre_negocio: raw.name || raw.title || raw.nombre || 'Sin nombre',
        telefono_whatsapp: phoneClean.startsWith('54') ? `+${phoneClean}` : `+54${phoneClean}`,
        email: raw.email || '',
        rubro: rubro || 'general',
        ciudad: raw.city || raw.location || '',
        direccion: raw.address || raw.direccion || '',
        url_origen: raw.url || raw.placeId || '',
        url_google_maps: raw.url || '',
        calificacion: raw.totalScore || raw.rating || null,
        reviews_count: raw.reviewsCount || raw.reviews || 0,
        total_reviews: raw.reviewsCount || raw.reviews || 0,
        datos_personalizados: {
          logo: raw.image || raw.photos?.[0] || '',
          horarios: raw.openingHours || [],
          website: raw.website || '',
        },
        estado_proceso: 'scraped',
        fecha_creacion: new Date(),
      }

      // Calculate initial lead score
      const score = calculateLeadScore(leadData)
      leadData.lead_score = score
      leadData.temperatura = getTemperature(score)
      leadData.score_label = getScoreLabel(score).label
      leadData.qualifies_for_messaging = score >= 30

      await db.collection('leads').add(leadData)
      saved++
    }

    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'completed',
      scraping_completed_at: new Date(),
      leads_count: admin.firestore.FieldValue.increment(saved),
    })

    console.log(`Scraping completed for campaign ${campaignId}: ${saved} leads saved`)
  } catch (error) {
    console.error('Error processing Apify results:', error)
    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'error',
      scraping_error: error.message,
      scraping_completed_at: new Date(),
    })
  }
}

// ============ LEADS ============

app.get('/leads', async (req, res) => {
  try {
    const { rubro, estado, limit: limitParam = 50 } = req.query
    let query = db.collection('leads')

    if (rubro && rubro !== 'todos') query = query.where('rubro', '==', rubro)
    if (estado && estado !== 'todos') query = query.where('estado_proceso', '==', estado)

    const snapshot = await query
      .orderBy('fecha_creacion', 'desc')
      .limit(parseInt(limitParam))
      .get()

    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/leads/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('leads').get()
    const stats = { total: 0, byRubro: {}, byStatus: {} }

    snapshot.docs.forEach(doc => {
      const lead = doc.data()
      stats.total++
      stats.byRubro[lead.rubro] = (stats.byRubro[lead.rubro] || 0) + 1
      stats.byStatus[lead.estado_proceso] = (stats.byStatus[lead.estado_proceso] || 0) + 1
    })

    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ DEMO GENERATION ============

app.post('/leads/:leadId/generate-demo', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    const demoId = `demo-${lead.rubro}-${req.params.leadId}`

    const demoData = {
      lead_id: req.params.leadId,
      nombre_negocio: lead.nombre_negocio,
      rubro: lead.rubro,
      ciudad: lead.ciudad || 'Argentina',
      direccion: lead.direccion || '',
      telefono_whatsapp: lead.telefono_whatsapp || '',
      calificacion: lead.calificacion || 4.8,
      logo: lead.datos_personalizados?.logo || '',
      website: lead.datos_personalizados?.website || '',
      horarios: lead.datos_personalizados?.horarios || [],
      url_demo: `https://revendr-9add8.web.app/demo/${lead.rubro}/${demoId}`,
      fecha_creacion: new Date(),
    }

    await db.collection('demos').doc(demoId).set(demoData)

    await db.collection('leads').doc(req.params.leadId).update({
      estado_proceso: 'demo_generada',
      url_demo: demoData.url_demo,
      demo_id: demoId,
      fecha_generacion_demo: new Date(),
      fecha_actualizacion: new Date(),
    })

    if (lead.id_campania) {
      await db.collection('campanias').doc(lead.id_campania).update({
        demos_generadas: admin.firestore.FieldValue.increment(1),
      })
    }

    res.json({ success: true, data: { demoUrl: demoData.url_demo, demoId } })
  } catch (error) {
    console.error('Error generating demo:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/process-demos', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { limit: limitParam = 10 } = req.body

    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }
    const campaign = campaignDoc.data()

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .where('estado_proceso', '==', 'scraped')
      .limit(parseInt(limitParam))
      .get()

    let processed = 0
    const results = []

    for (const leadDoc of leadsSnapshot.docs) {
      try {
        const lead = leadDoc.data()
        const demoId = `demo-${lead.rubro}-${leadDoc.id}`

        const demoUrl = campaign.producto_id
          ? `https://revendr-9add8.web.app/demo/producto/${campaign.producto_id}?negocio=${encodeURIComponent(lead.nombre_negocio)}&telefono=${encodeURIComponent(lead.telefono_whatsapp || '')}`
          : campaign.producto_url_demo
            ? `${campaign.producto_url_demo}?negocio=${encodeURIComponent(lead.nombre_negocio)}&ciudad=${encodeURIComponent(lead.ciudad || '')}`
            : `https://revendr-9add8.web.app/demo/${lead.rubro}/${demoId}`

        const demoData = {
          lead_id: leadDoc.id,
          nombre_negocio: lead.nombre_negocio,
          rubro: lead.rubro,
          ciudad: lead.ciudad || 'Argentina',
          direccion: lead.direccion || '',
          telefono_whatsapp: lead.telefono_whatsapp || '',
          calificacion: lead.calificacion || 4.8,
          logo: lead.datos_personalizados?.logo || '',
          website: lead.datos_personalizados?.website || '',
          horarios: lead.datos_personalizados?.horarios || [],
          url_demo: demoUrl,
          producto_url: campaign.producto_url_demo || null,
          fecha_creacion: new Date(),
        }

        await db.collection('demos').doc(demoId).set(demoData)
        await db.collection('leads').doc(leadDoc.id).update({
          estado_proceso: 'demo_generada',
          url_demo: demoData.url_demo,
          demo_id: demoId,
          fecha_generacion_demo: new Date(),
          fecha_actualizacion: new Date(),
        })

        processed++
        results.push({ leadId: leadDoc.id, demoUrl: demoData.url_demo })
      } catch (err) {
        console.error(`Error generating demo for lead ${leadDoc.id}:`, err.message)
      }
    }

    if (processed > 0) {
      await db.collection('campanias').doc(campaignId).update({
        demos_generadas: admin.firestore.FieldValue.increment(processed),
      })
    }

    res.json({ success: true, data: { processed, results } })
  } catch (error) {
    console.error('Error batch generating demos:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ LANDING PAGE VIEW TRACKING ============

app.post('/landing/view', async (req, res) => {
  try {
    const { productId, leadId } = req.body
    if (!productId) {
      return res.status(400).json({ success: false, error: { message: 'productId required' } })
    }

    await db.collection('landing_views').add({
      product_id: productId,
      lead_id: leadId || null,
      timestamp: new Date(),
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
    })

    // Send email notification to product owner
    try {
      const productDoc = await db.collection('productos').doc(productId).get()
      if (productDoc.exists) {
        const product = productDoc.data()
        const ownerDoc = await db.collection('usuarios_admin').doc(product.user_id).get()
        if (ownerDoc.exists && ownerDoc.data().email && RESEND_API_KEY) {
          const lead = leadId ? await db.collection('leads').doc(leadId).get() : null
          const leadName = lead?.exists ? lead.data().nombre_negocio : 'Alguien'

          await axios.post('https://api.resend.com/emails', {
            from: 'Revendr <notifications@revendr.app>',
            to: ownerDoc.data().email,
            subject: `${leadName} vio tu landing de ${product.nombre}`,
            html: `
              <h2>Alguien vio tu producto</h2>
              <p><strong>${leadName}</strong> abrió la landing de <strong>${product.nombre}</strong>.</p>
              <p>Es un buen momento para contactarlos.</p>
              <p><small>Revendr - SaaS Engine</small></p>
            `,
          }, {
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
          })
        }
      }
    } catch (emailErr) {
      console.error('Email notification error (non-critical):', emailErr.message)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error tracking view:', error)
    res.json({ success: true })
  }
})

app.get('/landing/stats/:productId', async (req, res) => {
  try {
    const viewsSnapshot = await db.collection('landing_views')
      .where('product_id', '==', req.params.productId)
      .get()

    res.json({ success: true, data: { views: viewsSnapshot.size } })
  } catch (error) {
    console.error('Error getting landing stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ AUTOMATED SCRAPING ============

app.post('/campaigns/scheduled-scrape', async (req, res) => {
  try {
    const { schedule } = req.body
    if (!schedule || !['daily', 'weekly', 'monthly'].includes(schedule)) {
      return res.status(400).json({ success: false, error: { message: 'schedule must be daily, weekly, or monthly' } })
    }

    const activeCampaigns = await db.collection('campanias')
      .where('estado', '==', 'activa')
      .where('auto_scrape', '==', true)
      .get()

    let queued = 0
    for (const doc of activeCampaigns.docs) {
      const campaign = doc.data()
      const shouldRun = shouldRunSchedule(campaign.last_auto_scrape, schedule)

      if (shouldRun) {
        await db.collection('campanias').doc(doc.id).update({
          scraping_status: 'scheduled',
          last_auto_scrape: new Date(),
        })
        queued++
      }
    }

    res.json({ success: true, data: { queued, total: activeCampaigns.size } })
  } catch (error) {
    console.error('Error scheduling scrape:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/set-schedule', async (req, res) => {
  try {
    const { auto_scrape, scrape_schedule } = req.body
    await db.collection('campanias').doc(req.params.campaignId).update({
      auto_scrape: auto_scrape || false,
      scrape_schedule: scrape_schedule || 'weekly',
      fecha_actualizacion: new Date(),
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

function shouldRunSchedule(lastRun, schedule) {
  if (!lastRun) return true
  const now = new Date()
  const last = lastRun.toDate ? lastRun.toDate() : new Date(lastRun)
  const diffHours = (now - last) / (1000 * 60 * 60)
  if (schedule === 'daily' && diffHours >= 24) return true
  if (schedule === 'weekly' && diffHours >= 168) return true
  if (schedule === 'monthly' && diffHours >= 720) return true
  return false
}

// ============ ROI TRACKING ============

app.post('/campaigns/:campaignId/revenue', async (req, res) => {
  try {
    const { leadId, amount, currency, notes } = req.body
    if (!leadId || !amount) {
      return res.status(400).json({ success: false, error: { message: 'leadId and amount required' } })
    }

    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    await db.collection('revenue').add({
      campaign_id: req.params.campaignId,
      lead_id: leadId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      notes: notes || '',
      fecha_creacion: new Date(),
    })

    await db.collection('campanias').doc(req.params.campaignId).update({
      total_revenue: admin.firestore.FieldValue.increment(parseFloat(amount)),
      total_clients: admin.firestore.FieldValue.increment(1),
    })

    await db.collection('leads').doc(leadId).update({
      estado_proceso: 'cliente_activo',
      revenue_amount: parseFloat(amount),
      fecha_pago: new Date(),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error tracking revenue:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/campaigns/:campaignId/roi', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    const campaign = campaignDoc.data()

    const revenueSnapshot = await db.collection('revenue')
      .where('campaign_id', '==', req.params.campaignId)
      .get()

    let totalRevenue = 0
    let totalClients = 0
    const revenueByLead = []

    revenueSnapshot.docs.forEach(doc => {
      const rev = doc.data()
      totalRevenue += rev.amount
      totalClients++
      revenueByLead.push({ lead_id: rev.lead_id, amount: rev.amount, date: rev.fecha_creacion })
    })

    const estimatedCost = (campaign.mensajes_enviados || 0) * 0.01
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost * 100).toFixed(1) : totalRevenue > 0 ? '∞' : 0

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalClients,
        estimatedCost: estimatedCost.toFixed(2),
        roi,
        revenueByLead,
        leadsCount: campaign.leads_count || 0,
        conversionRate: campaign.leads_count > 0
          ? ((totalClients / campaign.leads_count) * 100).toFixed(1)
          : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/landing/engagement', async (req, res) => {
  try {
    const { productId, leadId, eventType, data } = req.body
    if (!productId || !eventType) {
      return res.status(400).json({ success: false, error: { message: 'productId and eventType required' } })
    }

    await db.collection('landing_engagement').add({
      product_id: productId,
      lead_id: leadId || null,
      event_type: eventType,
      data: data || {},
      timestamp: new Date(),
    })

    if (leadId) {
      const leadRef = db.collection('leads').doc(leadId)
      const leadDoc = await leadRef.get()
      if (leadDoc.exists) {
        const lead = leadDoc.data()
        const updates = { fecha_ultima_actividad: new Date(), fecha_actualizacion: new Date() }

        if (eventType === 'cta_click') {
          updates.cta_clicks = (lead.cta_clicks || 0) + 1
        }
        if (eventType === 'page_view') {
          updates.landing_views = (lead.landing_views || 0) + 1
        }
        if (eventType === 'time_on_page') {
          updates.tiempo_total_landing = (lead.tiempo_total_landing || 0) + (data.seconds || 0)
        }

        await leadRef.update(updates)
        await autoScoreLead(leadId, { ...lead, ...updates })
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error tracking engagement:', error)
    res.json({ success: true })
  }
})

// ============ LEAD SCORING (0-100) ============

function calculateLeadScore(lead) {
  let score = 0

  // Reviews count (0-25 points) - more reviews = more established
  const reviews = lead.reviews_count || lead.total_reviews || 0
  if (reviews >= 100) score += 25
  else if (reviews >= 50) score += 20
  else if (reviews >= 20) score += 15
  else if (reviews >= 5) score += 10
  else if (reviews >= 1) score += 5

  // Rating (0-20 points) - higher = better lead
  const rating = lead.calificacion || lead.rating || 0
  if (rating >= 4.8) score += 20
  else if (rating >= 4.5) score += 16
  else if (rating >= 4.0) score += 12
  else if (rating >= 3.5) score += 8
  else if (rating >= 3.0) score += 4

  // Has website (0-15 points) - digital presence
  const website = lead.datos_personalizados?.website || lead.website || ''
  if (website && website.includes('.')) score += 15

  // Has email (0-10 points)
  if (lead.email && lead.email.includes('@')) score += 10

  // Has phone (0-10 points)
  const phone = lead.telefono_whatsapp || ''
  if (phone && phone.replace(/\D/g, '').length >= 10) score += 10

  // Has opening hours (0-10 points) - active business
  const hours = lead.datos_personalizados?.horarios || []
  if (hours.length > 0) score += 10

  // Has logo/photos (0-5 points) - professional business
  const logo = lead.datos_personalizados?.logo || ''
  if (logo) score += 5

  // Has address (0-5 points)
  if (lead.direccion && lead.direccion.length > 5) score += 5

  return Math.min(score, 100)
}

function getScoreLabel(score) {
  if (score >= 80) return { label: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
  if (score >= 60) return { label: 'Bueno', color: 'text-brand-400', bg: 'bg-brand-500/20' }
  if (score >= 40) return { label: 'Regular', color: 'text-amber-400', bg: 'bg-amber-500/20' }
  if (score >= 20) return { label: 'Bajo', color: 'text-orange-400', bg: 'bg-orange-500/20' }
  return { label: 'Muy Bajo', color: 'text-red-400', bg: 'bg-red-500/20' }
}

function getTemperature(score) {
  if (score >= 60) return 'hot'
  if (score >= 35) return 'warm'
  return 'cold'
}

async function autoScoreLead(leadId, lead) {
  const score = calculateLeadScore(lead)
  const temperatura = getTemperature(score)

  await db.collection('leads').doc(leadId).update({
    lead_score: score,
    temperatura,
    score_label: getScoreLabel(score).label,
  })
}

// ============ BULK LEAD SCORING ============

app.post('/leads/score-all', async (req, res) => {
  try {
    const { campaignId, minScore } = req.body
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)

    const snapshot = await query.get()
    let scored = 0
    let qualified = 0
    let disqualified = 0

    for (const doc of snapshot.docs) {
      const lead = doc.data()
      const score = calculateLeadScore(lead)
      const temperatura = getTemperature(score)
      const qualifies = score >= (minScore || 30)

      await doc.ref.update({
        lead_score: score,
        temperatura,
        score_label: getScoreLabel(score).label,
        qualifies_for_messaging: qualifies,
      })

      scored++
      if (qualifies) qualified++
      else disqualified++
    }

    res.json({
      success: true,
      data: { scored, qualified, disqualified, total: snapshot.size },
    })
  } catch (error) {
    console.error('Error scoring leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ AI MESSAGE GENERATOR ============

const MESSAGE_TEMPLATES = {
  inmobiliaria: [
    'Hola {nombre_negocio}, vi que trabajás en {ciudad} con {rating} estrellas. Creamos una demo exclusiva para que veas cómo{nombre_negocio} puede verse online: {url_demo}\n\n¿Te gustaría que hablemos?',
    '{nombre_negocio}, noté que tu inmobiliaria tiene una presencia online que puede mejorar mucho. Te armé algo especial: {url_demo}\n\nMiralo y contame qué te parece.',
  ],
  estetica: [
    'Hola {nombre_negocio}, vi tu peluquería en {ciudad} y me pareció genial. Te preparé una demo personalizada: {url_demo}\n\n¿Querés que la revisemos juntos?',
    '{nombre_negocio}, ¿y si tu negocio pudiera captar más clientes por WhatsApp? Mirá esta demo que te preparé: {url_demo}',
  ],
  clinica: [
    'Hola {nombre_negocio}, vi que tu clínica en {ciudad} tiene buena reputación. Te hice una demo para que veas cómo mejorar tu presencia digital: {url_demo}\n\n¿Te interesa?',
  ],
  restaurante: [
    'Hola {nombre_negocio}, vi tu restaurante en {ciudad} y me encantó. Te preparé una demo para que veas cómo atraer más comensales: {url_demo}\n\n¿Lo revisamos?',
  ],
  gimnasio: [
    'Hola {nombre_negocio}, vi que tu gimnasio en {ciudad} tiene {rating} estrellas. Te armé algo especial para que veas cómo crecer: {url_demo}\n\n¿Querés que hablemos?',
  ],
  otro: [
    'Hola {nombre_negocio}, vi tu negocio en {ciudad} y me pareció interesante. Te preparé una demo personalizada: {url_demo}\n\n¿Te gustaría que la revisemos?',
  ],
}

function generatePersonalizedMessage(lead, product) {
  const niche = lead.rubro || 'otro'
  const templates = MESSAGE_TEMPLATES[niche] || MESSAGE_TEMPLATES.otro
  const template = templates[Math.floor(Math.random() * templates.length)]

  const rating = lead.calificacion || lead.rating || '4.5'
  const ciudad = lead.ciudad || 'tu zona'

  let message = template
    .replace(/{nombre_negocio}/g, lead.nombre_negocio || 'tu negocio')
    .replace(/{ciudad}/g, ciudad)
    .replace(/{rating}/g, rating)
    .replace(/{rubro}/g, niche)
    .replace(/{url_demo}/g, lead.url_demo || '')

  if (product && product.mensaje_whatsapp) {
    message = product.mensaje_whatsapp
      .replace(/{nombre_negocio}/g, lead.nombre_negocio || 'tu negocio')
      .replace(/{ciudad}/g, ciudad)
      .replace(/{rating}/g, rating)
      .replace(/{rubro}/g, niche)
      .replace(/{url_demo}/g, lead.url_demo || '')
  }

  return message
}

app.post('/leads/:leadId/generate-message', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    let product = null

    if (req.body.productId) {
      const prodDoc = await db.collection('productos').doc(req.body.productId).get()
      if (prodDoc.exists) product = prodDoc.data()
    }

    const message = generatePersonalizedMessage(lead, product)

    await db.collection('leads').doc(req.params.leadId).update({
      mensaje_personalizado: message,
      fecha_generacion_mensaje: new Date(),
    })

    res.json({ success: true, data: { message } })
  } catch (error) {
    console.error('Error generating message:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/generate-messages', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { minScore } = req.body

    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }
    const campaign = campaignDoc.data()

    let product = null
    if (campaign.producto_id) {
      const prodDoc = await db.collection('productos').doc(campaign.producto_id).get()
      if (prodDoc.exists) product = prodDoc.data()
    }

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .where('estado_proceso', '==', 'scraped')
      .get()

    let generated = 0
    let skipped = 0

    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      const score = calculateLeadScore(lead)
      const threshold = minScore || 30

      if (score < threshold) {
        skipped++
        continue
      }

      const message = generatePersonalizedMessage(lead, product)
      await leadDoc.ref.update({
        mensaje_personalizado: message,
        lead_score: score,
        temperatura: getTemperature(score),
        score_label: getScoreLabel(score).label,
        qualifies_for_messaging: true,
        fecha_generacion_mensaje: new Date(),
      })
      generated++
    }

    res.json({
      success: true,
      data: { generated, skipped, total: leadsSnapshot.size },
    })
  } catch (error) {
    console.error('Error generating messages:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ FOLLOW-UPS ============

app.post('/campaigns/:campaignId/followups', async (req, res) => {
  try {
    const { followups } = req.body
    if (!followups || !Array.isArray(followups)) {
      return res.status(400).json({ success: false, error: { message: 'followups array required' } })
    }

    await db.collection('campanias').doc(req.params.campaignId).update({
      followups,
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error saving followups:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/process-followups', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    const campaign = campaignDoc.data()
    if (!campaign.followups || campaign.followups.length === 0) {
      return res.json({ success: true, data: { sent: 0, message: 'No followups configured' } })
    }

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    }

    if (isCampaignExpired(campaign)) {
      return res.status(400).json({ success: false, error: { message: 'Campaign expired' } })
    }

    if (!isBusinessHours()) {
      return res.status(400).json({ success: false, error: { message: 'Outside business hours' } })
    }

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', req.params.campaignId)
      .where('estado_proceso', '==', 'mensaje_enviado')
      .get()

    let sent = 0

    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      if (!lead.telefono_whatsapp) continue

      for (const followup of campaign.followups) {
        const daysSinceSend = lead.fecha_envio_whatsapp
          ? Math.floor((Date.now() - lead.fecha_envio_whatsapp.toDate().getTime()) / (1000 * 60 * 60 * 24))
          : 0

        if (daysSinceSend < followup.delayDays) continue

        const followupKey = `followup_${followup.delayDays}_sent`
        if (lead[followupKey]) continue

        const message = followup.message
          .replace(/{nombre_negocio}/g, lead.nombre_negocio)
          .replace(/{url_demo}/g, lead.url_demo)
          .replace(/{rubro}/g, lead.rubro)

        try {
          await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: lead.telefono_whatsapp.replace(/\D/g, ''),
              type: 'text',
              text: { body: message },
            },
            {
              headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          )

          await db.collection('leads').doc(leadDoc.id).update({
            [followupKey]: true,
            fecha_ultimo_followup: new Date(),
            fecha_actualizacion: new Date(),
          })

          const delay = Math.floor(Math.random() * 60000) + 30000
          await new Promise(resolve => setTimeout(resolve, delay))
          sent++
        } catch (err) {
          console.error(`Followup error for lead ${leadDoc.id}:`, err.message)
        }
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (error) {
    console.error('Error processing followups:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ EMAIL SENDING (RESEND) ============

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log('Resend API key not configured, skipping email')
    return null
  }

  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'Revendr <notifications@revendr.app>',
      to: [to],
      subject,
      html,
    }, {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    console.error('Email send error:', error.response?.data || error.message)
    return null
  }
}

function generateEmailTemplate(lead, product, messageType = 'initial') {
  const negocioName = lead.nombre_negocio || 'tu negocio'
  const demoUrl = lead.url_demo || ''
  const productName = product?.nombre || 'nuestro producto'
  const ciudad = lead.ciudad || 'tu zona'

  const subjects = {
    initial: `Hola ${negocioName}, creamos algo especial para vos`,
    reminder: `${negocioName}, ¿viste la demo que te preparé?`,
    discount: `${negocioName}, 20% OFF exclusivo para vos`,
    lastChance: `Última oportunidad para ${negocioName}`,
  }

  const bodies = {
    initial: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9;">Hola ${negocioName} 👋</h2>
        <p>Vi que trabajás en ${ciudad} y me pareció interesante lo que hacés.</p>
        <p>Creamos una <strong>demo personalizada</strong> para que veas cómo ${productName} puede ayudar a tu negocio:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${demoUrl}" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Ver mi Demo →
          </a>
        </div>
        <p>¿Te gustaría que hablemos? Respondé este email o escribinos por WhatsApp.</p>
        <br>
        <p style="color: #64748b; font-size: 12px;">Equipo Revendr</p>
      </div>
    `,
    reminder: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">${negocioName}, te escribí antes 👋</h2>
        <p>Hace unos días te armé una demo personalizada. ¿La tuviste chance de ver?</p>
        <p>Miralá acá, toma solo 2 minutos:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${demoUrl}" style="background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Revisar mi Demo →
          </a>
        </div>
        <p>Si tenés dudas, respondé este email y te ayudo.</p>
        <br>
        <p style="color: #64748b; font-size: 12px;">Equipo Revendr</p>
      </div>
    `,
    discount: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">🎉 20% OFF para ${negocioName}</h2>
        <p>Tenemos una oferta especial para vos: <strong>20% de descuento</strong> en tu primer mes.</p>
        <p>Acá va la demo que te preparé:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${demoUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Ver Demo + Descuento →
          </a>
        </div>
        <p style="color: #ef4444; font-weight: bold;">Oferta válida por 7 días.</p>
        <br>
        <p style="color: #64748b; font-size: 12px;">Equipo Revendr</p>
      </div>
    `,
    lastChance: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">Última oportunidad, ${negocioName}</h2>
        <p>Quería avisarte que la demo personalizada que te armé va a expirar pronto.</p>
        <p>Si querés aprovecharla, hacelo ahora:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${demoUrl}" style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Última chance →
          </a>
        </div>
        <p>Si no es de tu interés, no te preocupes. ¡Éxitos con tu negocio!</p>
        <br>
        <p style="color: #64748b; font-size: 12px;">Equipo Revendr</p>
      </div>
    `,
  }

  return {
    subject: subjects[messageType] || subjects.initial,
    html: bodies[messageType] || bodies.initial,
  }
}

app.post('/leads/:leadId/send-email', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    if (!lead.email) {
      return res.status(400).json({ success: false, error: { message: 'Lead has no email' } })
    }

    let product = null
    if (req.body.productId) {
      const prodDoc = await db.collection('productos').doc(req.body.productId).get()
      if (prodDoc.exists) product = prodDoc.data()
    }

    const messageType = req.body.messageType || 'initial'
    const { subject, html } = generateEmailTemplate(lead, product, messageType)

    const result = await sendEmail(lead.email, subject, html)

    if (result) {
      await db.collection('leads').doc(req.params.leadId).update({
        ultimo_email_enviado: messageType,
        fecha_ultimo_email: new Date(),
        email_message_id: result.id,
        fecha_actualizacion: new Date(),
      })

      // Track email engagement
      await db.collection('message_events').add({
        lead_id: req.params.leadId,
        campaign_id: lead.id_campania,
        channel: 'email',
        event_type: 'sent',
        message_type: messageType,
        timestamp: new Date(),
      })
    }

    res.json({ success: true, data: { emailId: result?.id } })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ SMART SEQUENCE ENGINE ============

const SEQUENCE_RULES = {
  // After initial WhatsApp: wait 2 days, if no engagement → send email reminder
  initial_whatsapp: {
    nextStep: 'email_reminder',
    delayDays: 2,
    condition: (lead) => !lead.cta_clicks && !lead.landing_views,
  },
  // After email reminder: wait 3 days, if still no engagement → send discount
  email_reminder: {
    nextStep: 'email_discount',
    delayDays: 3,
    condition: (lead) => !lead.cta_clicks && !lead.landing_views,
  },
  // After discount: wait 5 days, if no response → last chance email
  email_discount: {
    nextStep: 'email_last_chance',
    delayDays: 5,
    condition: (lead) => !lead.fecha_pago,
  },
  // If they clicked CTA but didn't buy → send discount after 1 day
  cta_clicked: {
    nextStep: 'email_discount',
    delayDays: 1,
    condition: (lead) => lead.cta_clicks > 0 && !lead.fecha_pago,
  },
}

app.post('/campaigns/:campaignId/process-sequence', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    const campaign = campaignDoc.data()

    let product = null
    if (campaign.producto_id) {
      const prodDoc = await db.collection('productos').doc(campaign.producto_id).get()
      if (prodDoc.exists) product = prodDoc.data()
    }

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .get()

    let actions = 0
    const results = []

    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      const currentStep = lead.sequence_step || 'initial'
      const rule = SEQUENCE_RULES[currentStep]

      if (!rule) continue

      // Check if enough time has passed
      const lastAction = lead.fecha_ultimo_followup?.toDate?.() ||
                         lead.fecha_envio_whatsapp?.toDate?.() ||
                         lead.fecha_creacion?.toDate?.()

      if (!lastAction) continue

      const daysSince = Math.floor((Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < rule.delayDays) continue

      // Check condition
      if (!rule.condition(lead)) continue

      // Execute next step
      const nextStep = rule.nextStep

      if (nextStep.startsWith('email_')) {
        // Send email
        if (lead.email && RESEND_API_KEY) {
          const messageType = nextStep.replace('email_', '')
          const { subject, html } = generateEmailTemplate(lead, product, messageType)
          const emailResult = await sendEmail(lead.email, subject, html)

          if (emailResult) {
            await leadDoc.ref.update({
              sequence_step: nextStep,
              fecha_ultimo_followup: new Date(),
              fecha_actualizacion: new Date(),
            })

            await db.collection('message_events').add({
              lead_id: leadDoc.id,
              campaign_id: campaignId,
              channel: 'email',
              event_type: 'sent',
              message_type: messageType,
              timestamp: new Date(),
            })

            actions++
            results.push({ leadId: leadDoc.id, action: nextStep, channel: 'email' })
          }
        }
      }

      // Rate limit
      const delay = Math.floor(Math.random() * 30000) + 15000
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    res.json({ success: true, data: { actions, results } })
  } catch (error) {
    console.error('Error processing sequence:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ A/B TESTING ============

app.post('/campaigns/:campaignId/ab-test', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { messageA, messageB } = req.body

    if (!messageA || !messageB) {
      return res.status(400).json({ success: false, error: { message: 'Both message variants required' } })
    }

    // Get qualified leads
    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .where('qualifies_for_messaging', '==', true)
      .get()

    if (leadsSnapshot.size < 10) {
      return res.status(400).json({ success: false, error: { message: 'Need at least 10 qualified leads for A/B test' } })
    }

    // Split leads 50/50 randomly
    const leads = leadsSnapshot.docs
    const shuffled = leads.sort(() => Math.random() - 0.5)
    const half = Math.floor(shuffled.length / 2)
    const groupA = shuffled.slice(0, half)
    const groupB = shuffled.slice(half)

    // Create A/B test record
    const abTestRef = await db.collection('ab_tests').add({
      campaign_id: campaignId,
      message_a: messageA,
      message_b: messageB,
      group_a_count: groupA.length,
      group_b_count: groupB.length,
      status: 'running',
      fecha_creacion: new Date(),
    })

    // Assign messages to leads
    for (const leadDoc of groupA) {
      const message = messageA
        .replace(/{nombre_negocio}/g, leadDoc.data().nombre_negocio)
        .replace(/{url_demo}/g, leadDoc.data().url_demo)
        .replace(/{rubro}/g, leadDoc.data().rubro)

      await leadDoc.ref.update({
        ab_test_id: abTestRef.id,
        ab_group: 'A',
        mensaje_personalizado: message,
      })
    }

    for (const leadDoc of groupB) {
      const message = messageB
        .replace(/{nombre_negocio}/g, leadDoc.data().nombre_negocio)
        .replace(/{url_demo}/g, leadDoc.data().url_demo)
        .replace(/{rubro}/g, leadDoc.data().rubro)

      await leadDoc.ref.update({
        ab_test_id: abTestRef.id,
        ab_group: 'B',
        mensaje_personalizado: message,
      })
    }

    res.json({
      success: true,
      data: {
        testId: abTestRef.id,
        groupA: groupA.length,
        groupB: groupB.length,
      },
    })
  } catch (error) {
    console.error('Error creating A/B test:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/campaigns/:campaignId/ab-results', async (req, res) => {
  try {
    const testsSnapshot = await db.collection('ab_tests')
      .where('campaign_id', '==', req.params.campaignId)
      .orderBy('fecha_creacion', 'desc')
      .limit(5)
      .get()

    const tests = []
    for (const testDoc of testsSnapshot.docs) {
      const test = testDoc.data()

      // Count results per group
      const leadsSnapshot = await db.collection('leads')
        .where('ab_test_id', '==', testDoc.id)
        .get()

      let groupAEngaged = 0, groupBEngaged = 0
      let groupAClicks = 0, groupBClicks = 0

      leadsSnapshot.docs.forEach(doc => {
        const lead = doc.data()
        if (lead.ab_group === 'A') {
          if (lead.cta_clicks > 0 || lead.landing_views > 0) groupAEngaged++
          groupAClicks += lead.cta_clicks || 0
        } else {
          if (lead.cta_clicks > 0 || lead.landing_views > 0) groupBEngaged++
          groupBClicks += lead.cta_clicks || 0
        }
      })

      const groupASize = leadsSnapshot.docs.filter(d => d.data().ab_group === 'A').length || 1
      const groupBSize = leadsSnapshot.docs.filter(d => d.data().ab_group === 'B').length || 1

      tests.push({
        id: testDoc.id,
        ...test,
        groupA: {
          ...test.message_a,
          size: groupASize,
          engaged: groupAEngaged,
          engagementRate: ((groupAEngaged / groupASize) * 100).toFixed(1),
          totalClicks: groupAClicks,
        },
        groupB: {
          ...test.message_b,
          size: groupBSize,
          engaged: groupBEngaged,
          engagementRate: ((groupBEngaged / groupBSize) * 100).toFixed(1),
          totalClicks: groupBClicks,
        },
        winner: groupAEngaged > groupBEngaged ? 'A' : groupBEngaged > groupAEngaged ? 'B' : 'Tie',
      })
    }

    res.json({ success: true, data: tests })
  } catch (error) {
    console.error('Error getting A/B results:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ MESSAGE ENGAGEMENT TRACKING ============

app.post('/messages/track', async (req, res) => {
  try {
    const { leadId, campaignId, channel, eventType, data } = req.body

    await db.collection('message_events').add({
      lead_id: leadId,
      campaign_id: campaignId,
      channel,
      event_type: eventType,
      data: data || {},
      timestamp: new Date(),
    })

    // Update lead engagement metrics
    if (leadId) {
      const leadRef = db.collection('leads').doc(leadId)
      const leadDoc = await leadRef.get()
      if (leadDoc.exists) {
        const lead = leadDoc.data()
        const updates = { fecha_actualizacion: new Date() }

        if (eventType === 'delivered') {
          updates.mensajes_entregados = (lead.mensajes_entregados || 0) + 1
        }
        if (eventType === 'read') {
          updates.mensajes_leidos = (lead.mensajes_leidos || 0) + 1
        }
        if (eventType === 'clicked') {
          updates.mensajes_clickeados = (lead.mensajes_clickeados || 0) + 1
        }

        // Calculate engagement score
        const reads = lead.mensajes_leidos || 0
        const clicks = lead.mensajes_clickeados || 0
        const engagementScore = (reads * 2) + (clicks * 3)
        updates.engagement_score = engagementScore

        // Auto-upgrade temperature based on engagement
        if (engagementScore >= 5) updates.temperatura = 'hot'
        else if (engagementScore >= 2) updates.temperatura = 'warm'

        await leadRef.update(updates)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error tracking message:', error)
    res.json({ success: true })
  }
})

// ============ WHATSAPP SENDING ============

app.post('/leads/:leadId/send-whatsapp', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    }

    if (!lead.url_demo) {
      return res.status(400).json({ success: false, error: { message: 'Lead has no demo URL. Generate demo first.' } })
    }

    const customMessage = req.body.customMessage
    const message = customMessage
      ? customMessage
        .replace(/{nombre_negocio}/g, lead.nombre_negocio)
        .replace(/{url_demo}/g, lead.url_demo)
        .replace(/{rubro}/g, lead.rubro)
      : `Hola ${lead.nombre_negocio}, te propuse algo especial para tu ${lead.rubro}.\n\nMirá tu demo personalizada: ${lead.url_demo}\n\n¿Te gustaría que hablemos?`

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: lead.telefono_whatsapp.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    await db.collection('leads').doc(req.params.leadId).update({
      estado_proceso: 'mensaje_enviado',
      whatsapp_message_id: response.data.messages?.[0]?.id,
      fecha_envio_whatsapp: new Date(),
      fecha_actualizacion: new Date(),
    })

    if (lead.id_campania) {
      await db.collection('campanias').doc(lead.id_campania).update({
        mensajes_enviados: admin.firestore.FieldValue.increment(1),
      })
    }

    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) {
    console.error('Error sending WhatsApp:', error.response?.data || error.message)
    res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } })
  }
})

app.post('/campaigns/:campaignId/send-messages', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { limit: limitParam = 10, minScore = 30 } = req.body

    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }

    const campaign = campaignDoc.data()

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    }

    if (isCampaignExpired(campaign)) {
      return res.status(400).json({ success: false, error: { message: 'Campaign has expired' } })
    }

    if (!isBusinessHours()) {
      return res.status(400).json({ success: false, error: { message: 'Outside business hours (Mon-Fri 9-18hs)' } })
    }

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .where('estado_proceso', '==', 'demo_generada')
      .get()

    let sent = 0
    let failed = 0
    let skippedLowScore = 0
    const DELAY_BETWEEN_MESSAGES = 45000
    const MAX_PER_BATCH = 10
    const BATCH_PAUSE = 180000

    // Sort leads by score descending - send to best leads first
    const leadsWithScore = leadsSnapshot.docs.map(doc => ({
      ref: doc,
      data: doc.data(),
      score: calculateLeadScore(doc.data()),
    })).sort((a, b) => b.score - a.score)

    const toSend = leadsWithScore.slice(0, parseInt(limitParam))

    for (let i = 0; i < toSend.length; i++) {
      if (i > 0 && i % MAX_PER_BATCH === 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE))
      }

      try {
        const { ref: leadDoc, data: lead, score } = toSend[i]

        if (!lead.url_demo || !lead.telefono_whatsapp) {
          failed++
          continue
        }

        // Skip leads below minimum score
        if (score < minScore) {
          skippedLowScore++
          continue
        }

        // Use personalized message if available, otherwise fall back to template
        let message = lead.mensaje_personalizado
        if (!message) {
          const messageTemplate = campaign.producto_mensaje || campaign.mensaje_template || `Hola {nombre_negocio}, te propuse algo especial para tu {rubro}.\n\nMirá tu demo: {url_demo}`
          message = messageTemplate
            .replace(/{nombre_negocio}/g, lead.nombre_negocio)
            .replace(/{url_demo}/g, lead.url_demo)
            .replace(/{rubro}/g, lead.rubro)
        }

        const jitter = Math.floor(Math.random() * 20000)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES + jitter))

        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: lead.telefono_whatsapp.replace(/\D/g, ''),
            type: 'text',
            text: { body: message },
          },
          {
            headers: {
              'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        )

        await leadDoc.ref.update({
          estado_proceso: 'mensaje_enviado',
          whatsapp_message_id: response.data.messages?.[0]?.id,
          fecha_envio_whatsapp: new Date(),
          fecha_actualizacion: new Date(),
          lead_score_at_send: score,
        })

        sent++
      } catch (err) {
        console.error(`Error sending to lead:`, err.response?.data || err.message)
        failed++
      }
    }

    if (sent > 0) {
      await db.collection('campanias').doc(campaignId).update({
        mensajes_enviados: admin.firestore.FieldValue.increment(sent),
      })
    }

    res.json({ success: true, data: { sent, failed, skippedLowScore, total: leadsSnapshot.size } })
  } catch (error) {
    console.error('Error batch sending messages:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ WEBHOOKS ============

app.post('/webhooks/apify', async (req, res) => {
  try {
    const { defaultDatasetId, campaignId, rubro } = req.body
    await processApifyResults(defaultDatasetId, campaignId, rubro || 'general')
    res.json({ success: true })
  } catch (error) {
    console.error('Error processing Apify webhook:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/webhook/stripe', async (req, res) => {
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY)
    const webhookSecret = STRIPE_WEBHOOK_SECRET

    const sig = req.headers['stripe-signature']
    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      console.error('Stripe signature verification failed:', err.message)
      return res.status(400).json({ error: err.message })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const customerEmail = session.customer_details?.email
      const customerName = session.customer_details?.name
      const plan = session.metadata?.plan || 'starter'
      const leadId = session.metadata?.leadId

      let userId = null

      if (customerEmail) {
        try {
          const existingUser = await admin.auth().getUserByEmail(customerEmail)
          userId = existingUser.uid
        } catch (err) {
          const newUser = await admin.auth().createUser({
            email: customerEmail,
            displayName: customerName || customerEmail.split('@')[0],
            password: Math.random().toString(36).slice(-12) + 'A1!',
          })
          userId = newUser.uid
          await admin.auth().setCustomUserClaims(userId, { role: 'admin' })
        }

        const planCredits = {
          starter: { apify: 100, whatsapp: 1000, inmoxil: 50 },
          growth: { apify: 1000, whatsapp: 10000, inmoxil: 500 },
          enterprise: { apify: 999999, whatsapp: 999999, inmoxil: 999999 },
        }

        await db.collection('usuarios_admin').doc(userId).set({
          email: customerEmail,
          nombre: customerName || customerEmail.split('@')[0],
          role: 'admin',
          plan: plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          api_credits: planCredits[plan] || planCredits.starter,
          permissions: ['campaigns', 'leads', 'settings', 'billing'],
          fecha_creacion: new Date(),
          activo: true,
        }, { merge: true })

        console.log('Customer provisioned:', { userId, email: customerEmail, plan })
      }

      if (leadId) {
        await db.collection('leads').doc(leadId).update({
          estado_proceso: 'cliente_activo',
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          fecha_pago: new Date(),
          fecha_actualizacion: new Date(),
        })
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const customer = await stripe.customers.retrieve(subscription.customer)

      if (customer.email) {
        try {
          const user = await admin.auth().getUserByEmail(customer.email)
          await db.collection('usuarios_admin').doc(user.uid).update({
            stripe_subscription_status: subscription.status,
            fecha_actualizacion: new Date(),
          })
        } catch (err) {
          console.error('Error updating subscription status:', err.message)
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const customer = await stripe.customers.retrieve(subscription.customer)

      if (customer.email) {
        try {
          const user = await admin.auth().getUserByEmail(customer.email)
          await db.collection('usuarios_admin').doc(user.uid).update({
            plan: 'inactive',
            activo: false,
            stripe_subscription_status: 'canceled',
            fecha_desactivacion: new Date(),
          })
        } catch (err) {
          console.error('Error deactivating user:', err.message)
        }
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

// ============ STRIPE CHECKOUT ============

const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: process.env.STRIPE_PRICE_GROWTH_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
  },
}

const PLAN_LIMITS = {
  starter: { leads: 100, rubros: 1, demos: 50, messages: 1000 },
  growth: { leads: 1000, rubros: 3, demos: 500, messages: 10000 },
  enterprise: { leads: -1, rubros: -1, demos: -1, messages: -1 },
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, leadId, plan, userId, billing } = req.body

    if (!STRIPE_SECRET_KEY) {
      return res.status(503).json({ success: false, error: { message: 'Stripe not configured' } })
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY)

    const priceMap = STRIPE_PRICES[plan || 'growth']
    const billingCycle = billing === 'annual' ? 'annual' : 'monthly'
    const finalPriceId = priceId || priceMap?.[billingCycle]

    if (!finalPriceId) {
      return res.status(400).json({ success: false, error: { message: 'Invalid plan or priceId required' } })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: `https://revendr-9add8.web.app/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://revendr-9add8.web.app/pricing`,
      metadata: { leadId: leadId || '', plan: plan || 'growth', userId: userId || '' },
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error.message)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ SUBSCRIPTION MANAGEMENT ============

app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }
    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter

    const usage = userData.usage || { leads: 0, demos: 0, messages: 0 }

    res.json({
      success: true,
      data: {
        plan,
        status: userData.stripe_subscription_status || 'active',
        billing: userData.billing || 'monthly',
        limits,
        usage,
        stripeCustomerId: userData.stripe_customer_id || null,
        stripeSubscriptionId: userData.stripe_subscription_id || null,
        currentPeriodEnd: userData.current_period_end || null,
        cancelAtPeriodEnd: userData.cancel_at_period_end || false,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/subscription/change', async (req, res) => {
  try {
    const { userId, newPlan, billing } = req.body
    if (!userId || !newPlan) {
      return res.status(400).json({ success: false, error: { message: 'userId and newPlan required' } })
    }

    if (!STRIPE_SECRET_KEY) {
      await db.collection('usuarios').doc(userId).update({
        plan: newPlan,
        billing: billing || 'monthly',
        plan_limits: PLAN_LIMITS[newPlan],
        fecha_actualizacion: new Date(),
      })
      return res.json({ success: true, data: { plan: newPlan, message: 'Plan updated (no Stripe)' } })
    }

    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }
    const userData = userDoc.data()

    if (userData.stripe_subscription_id) {
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const priceMap = STRIPE_PRICES[newPlan]
      const billingCycle = billing || userData.billing || 'monthly'
      const newPriceId = priceMap?.[billingCycle === 'annual' ? 'annual' : 'monthly']

      if (newPriceId) {
        await stripe.subscriptions.update(userData.stripe_subscription_id, {
          items: [{ price: newPriceId }],
          proration_behavior: 'create_prorations',
        })
      }
    }

    await db.collection('usuarios').doc(userId).update({
      plan: newPlan,
      billing: billing || 'monthly',
      plan_limits: PLAN_LIMITS[newPlan],
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { plan: newPlan } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required' } })
    }

    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }
    const userData = userDoc.data()

    if (STRIPE_SECRET_KEY && userData.stripe_subscription_id) {
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      await stripe.subscriptions.update(userData.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    await db.collection('usuarios').doc(userId).update({
      cancel_at_period_end: true,
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { message: 'Subscription will cancel at period end' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ ADMIN PANEL ============

app.get('/admin/clients', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios')
      .orderBy('fecha_creacion', 'desc')
      .get()
    const clients = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        nombre: data.nombre,
        empresa: data.empresa || '',
        plan: data.plan || 'starter',
        activo: data.activo !== false,
        emailVerified: data.emailVerified || false,
        onboarding_completed: data.onboarding_completed || false,
        fecha_creacion: data.fecha_creacion,
        last_login: data.last_login || null,
        usage: data.usage || { leads: 0, demos: 0, messages: 0 },
      }
    })
    res.json({ success: true, data: clients })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/admin/clients/:id', async (req, res) => {
  try {
    const doc = await db.collection('usuarios').doc(req.params.id).get()
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Client not found' } })
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.patch('/admin/clients/:id', async (req, res) => {
  try {
    const { plan, activo, role, empresa } = req.body
    const updates = { fecha_actualizacion: new Date() }
    if (plan !== undefined) {
      updates.plan = plan
      updates.plan_limits = PLAN_LIMITS[plan]
    }
    if (activo !== undefined) updates.activo = activo
    if (role !== undefined) updates.role = role
    if (empresa !== undefined) updates.empresa = empresa

    await db.collection('usuarios').doc(req.params.id).update(updates)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.delete('/admin/clients/:id', async (req, res) => {
  try {
    await db.collection('usuarios').doc(req.params.id).update({
      activo: false,
      fecha_desactivacion: new Date(),
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ USAGE METERING ============

app.get('/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }
    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const usage = userData.usage || { leads: 0, demos: 0, messages: 0 }

    const calcPct = (used, limit) => limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))

    res.json({
      success: true,
      data: {
        plan,
        limits,
        usage,
        percentages: {
          leads: calcPct(usage.leads, limits.leads),
          demos: calcPct(usage.demos, limits.demos),
          messages: calcPct(usage.messages, limits.messages),
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/usage/increment', async (req, res) => {
  try {
    const { userId, type, amount } = req.body
    if (!userId || !type) {
      return res.status(400).json({ success: false, error: { message: 'userId and type required' } })
    }

    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }

    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const currentUsage = userData.usage || { leads: 0, demos: 0, messages: 0 }
    const increment = amount || 1

    if (limits[type] !== -1 && currentUsage[type] + increment > limits[type]) {
      return res.status(403).json({
        success: false,
        error: { message: `Plan limit exceeded for ${type}. Upgrade your plan.` },
      })
    }

    await db.collection('usuarios').doc(userId).update({
      [`usage.${type}`]: currentUsage[type] + increment,
    })

    res.json({ success: true, data: { [type]: currentUsage[type] + increment } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ CLIENT DASHBOARD ============

app.get('/client/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const [userDoc, campaignsSnap, leadsSnap] = await Promise.all([
      db.collection('usuarios').doc(userId).get(),
      db.collection('campanias').where('user_id', '==', userId).get(),
      db.collection('leads').where('user_id', '==', userId).get(),
    ])

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }

    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const usage = userData.usage || { leads: 0, demos: 0, messages: 0 }

    let activeCampaigns = 0
    let totalDemos = 0
    let qualifiedLeads = 0
    let messagesSent = 0
    let totalRevenue = 0

    campaignsSnap.docs.forEach(doc => {
      const c = doc.data()
      if (c.estado === 'activa') activeCampaigns++
    })

    leadsSnap.docs.forEach(doc => {
      const l = doc.data()
      if (l.estado_proceso === 'demo_generada') totalDemos++
      if ((l.lead_score || 0) >= 60) qualifiedLeads++
      if (l.mensaje_enviado) messagesSent++
      totalRevenue += l.revenue || 0
    })

    res.json({
      success: true,
      data: {
        plan,
        limits,
        usage,
        stats: {
          totalCampaigns: campaignsSnap.size,
          activeCampaigns,
          totalLeads: leadsSnap.size,
          totalDemos,
          qualifiedLeads,
          messagesSent,
          totalRevenue,
          conversionRate: leadsSnap.size > 0
            ? ((qualifiedLeads / leadsSnap.size) * 100).toFixed(1)
            : 0,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ TEAM MANAGEMENT ============

app.post('/team/invite', async (req, res) => {
  try {
    const { ownerUserId, email, role } = req.body
    if (!ownerUserId || !email) {
      return res.status(400).json({ success: false, error: { message: 'ownerUserId and email required' } })
    }

    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.collection('team_invites').doc(inviteId).set({
      owner_user_id: ownerUserId,
      email,
      role: role || 'member',
      status: 'pending',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    if (RESEND_API_KEY) {
      try {
        const resend = require('resend')(RESEND_API_KEY)
        await resend.emails.send({
          from: 'Revendr <noreply@revendr.app>',
          to: email,
          subject: 'Invitación a un equipo en Revendr',
          html: `<p>Has sido invitado a un equipo en Revendr.</p><p>Haz click aquí para aceptar: <a href="https://revendr-9add8.web.app/team/accept?invite=${inviteId}">Aceptar invitación</a></p>`,
        })
      } catch (e) {
        console.error('Error sending invite email:', e.message)
      }
    }

    res.json({ success: true, data: { inviteId } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/team/members/:ownerUserId', async (req, res) => {
  try {
    const snapshot = await db.collection('team_members')
      .where('owner_user_id', '==', req.params.ownerUserId)
      .get()
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: members })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.delete('/team/members/:memberId', async (req, res) => {
  try {
    await db.collection('team_members').doc(req.params.memberId).delete()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ CLIENT API KEYS ============

app.post('/api-keys/client/generate', async (req, res) => {
  try {
    const { userId, name } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required' } })
    }

    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection('api_keys').doc(keyId).set({
      user_id: userId,
      name: name || 'Default Key',
      active: true,
      created_at: new Date(),
      uses: 0,
      last_used: null,
    })

    res.json({ success: true, data: { api_key: keyId, name: name || 'Default Key' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/api-keys/client/:userId', async (req, res) => {
  try {
    const snapshot = await db.collection('api_keys')
      .where('user_id', '==', req.params.userId)
      .get()
    const keys = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      api_key_preview: doc.id.slice(0, 12) + '...',
    }))
    res.json({ success: true, data: keys })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.delete('/api-keys/client/:keyId', async (req, res) => {
  try {
    await db.collection('api_keys').doc(req.params.keyId).update({ active: false })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ STATUS PAGE ============

app.get('/status', async (req, res) => {
  try {
    const checks = {
      api: { status: 'operational', latency: 0 },
      database: { status: 'operational', latency: 0 },
      scraping: { status: APIFY_TOKEN ? 'operational' : 'degraded', latency: 0 },
      whatsapp: { status: WHATSAPP_TOKEN ? 'operational' : 'degraded', latency: 0 },
      email: { status: RESEND_API_KEY ? 'operational' : 'degraded', latency: 0 },
      stripe: { status: STRIPE_SECRET_KEY ? 'operational' : 'degraded', latency: 0 },
    }

    const dbStart = Date.now()
    await db.collection('_health').doc('ping').set({ timestamp: new Date() })
    checks.database.latency = Date.now() - dbStart
    checks.api.latency = Date.now() - dbStart

    const allOperational = Object.values(checks).every(c => c.status === 'operational')

    res.json({
      status: allOperational ? 'operational' : 'degraded',
      updated: new Date().toISOString(),
      checks,
    })
  } catch (error) {
    res.json({
      status: 'major_outage',
      updated: new Date().toISOString(),
      checks: { api: { status: 'major_outage' }, database: { status: 'major_outage' } },
    })
  }
})

// ============ EMAIL TEMPLATES ============

async function sendTransactionalEmail(to, type, data = {}) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'no_api_key' }

  const templates = {
    welcome: {
      subject: `Bienvenido a Revendr, ${data.nombre || ''}!`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#6366f1">Bienvenido a Revendr</h1>
        <p>Hola ${data.nombre || ''},</p>
        <p>Tu cuenta ha sido creada exitosamente. Tu plan: <strong>${data.plan || 'Starter'}</strong></p>
        <p>Próximos pasos:</p>
        <ol><li>Creá tu primer producto</li><li>Configurá una campaña de scraping</li><li>Generá demos y enviá WhatsApp</li></ol>
        <a href="https://revendr-9add8.web.app/dashboard" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Ir al Panel</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">© 2026 Revendr</p>
      </div>`,
    },
    email_verification: {
      subject: 'Verificá tu email en Revendr',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#6366f1">Verificá tu email</h1>
        <p>Hacé click en el botón para verificar tu cuenta:</p>
        <a href="${data.verificationUrl || '#'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Verificar Email</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">Si no creaste esta cuenta, ignorá este email.</p>
      </div>`,
    },
    plan_change: {
      subject: `Tu plan cambió a ${data.newPlan || ''}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#6366f1">Cambio de plan</h1>
        <p>Tu plan ha sido cambiado a: <strong>${data.newPlan || ''}</strong></p>
        <p>Los nuevos límites ya están activos en tu cuenta.</p>
        <a href="https://revendr-9add8.web.app/dashboard/settings" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Ver Configuración</a>
      </div>`,
    },
    payment_failed: {
      subject: 'Problema con tu pago en Revendr',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#ef4444">Pago fallido</h1>
        <p>No pudimos procesar tu último pago. Por favor actualizá tu método de pago.</p>
        <a href="https://revendr-9add8.web.app/dashboard/settings" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Actualizar Pago</a>
      </div>`,
    },
    subscription_cancelled: {
      subject: 'Tu suscripción en Revendr',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#f59e0b">Suscripción cancelada</h1>
        <p>Tu suscripción será cancelada al final del período de facturación actual.</p>
        <p>Podés seguir usando Revendr hasta esa fecha.</p>
        <a href="https://revendr-9add8.web.app/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Reactivar</a>
      </div>`,
    },
  }

  const template = templates[type]
  if (!template) return { sent: false, reason: 'unknown_template' }

  try {
    const resend = require('resend')(RESEND_API_KEY)
    await resend.emails.send({
      from: 'Revendr <noreply@revendr.app>',
      to,
      subject: template.subject,
      html: template.html,
    })
    return { sent: true }
  } catch (error) {
    console.error('Email send error:', error.message)
    return { sent: false, reason: error.message }
  }
}

app.post('/email/send', async (req, res) => {
  try {
    const { to, type, data } = req.body
    if (!to || !type) {
      return res.status(400).json({ success: false, error: { message: 'to and type required' } })
    }
    const result = await sendTransactionalEmail(to, type, data)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ EXPORTS ============

exports.api = functions.https.onRequest(app)

app.get('/stats/dashboard', async (req, res) => {
  try {
    const [campaignsSnap, leadsSnap] = await Promise.all([
      db.collection('campanias').get(),
      db.collection('leads').get(),
    ])

    let activeCampaigns = 0
    let demosGeneradas = 0
    let clientesActivos = 0

    campaignsSnap.docs.forEach(doc => {
      if (doc.data().estado === 'activa') activeCampaigns++
    })

    leadsSnap.docs.forEach(doc => {
      const lead = doc.data()
      if (lead.estado_proceso === 'demo_generada') demosGeneradas++
      if (lead.estado_proceso === 'cliente_activo') clientesActivos++
    })

    res.json({
      success: true,
      data: {
        totalCampaigns: campaignsSnap.size,
        activeCampaigns,
        totalLeads: leadsSnap.size,
        demosGeneradas,
        clientesActivos,
        conversionRate: leadsSnap.size > 0
          ? ((clientesActivos / leadsSnap.size) * 100).toFixed(1)
          : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ PRODUCT STATS ============

app.get('/stats/products', async (req, res) => {
  try {
    const productsSnapshot = await db.collection('productos').get()
    const campaignsSnapshot = await db.collection('campanias').get()
    const leadsSnapshot = await db.collection('leads').get()

    const products = []
    productsSnapshot.docs.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() })
    })

    const statsByProduct = {}

    // Initialize stats for each product
    products.forEach(p => {
      statsByProduct[p.id] = {
        nombre: p.nombre,
        nicho: p.nicho,
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        qualifiedLeads: 0,
        demosGenerated: 0,
        messagesSent: 0,
        clients: 0,
        totalRevenue: 0,
      }
    })

    // Count campaigns per product
    campaignsSnapshot.docs.forEach(doc => {
      const c = doc.data()
      if (c.producto_id && statsByProduct[c.producto_id]) {
        statsByProduct[c.producto_id].totalCampaigns++
        if (c.estado === 'activa') statsByProduct[c.producto_id].activeCampaigns++
        statsByProduct[c.producto_id].messagesSent += c.mensajes_enviados || 0
        statsByProduct[c.producto_id].totalRevenue += c.total_revenue || 0
      }
    })

    // Count leads per product (via campaign -> product)
    const campaignProductMap = {}
    campaignsSnapshot.docs.forEach(doc => {
      const c = doc.data()
      if (c.producto_id) campaignProductMap[doc.id] = c.producto_id
    })

    leadsSnapshot.docs.forEach(doc => {
      const lead = doc.data()
      const productId = campaignProductMap[lead.id_campania]
      if (productId && statsByProduct[productId]) {
        statsByProduct[productId].totalLeads++
        if (lead.lead_score >= 50) statsByProduct[productId].qualifiedLeads++
        if (lead.estado_proceso === 'demo_generada') statsByProduct[productId].demosGenerated++
        if (lead.estado_proceso === 'mensaje_enviado') statsByProduct[productId].messagesSent++
        if (lead.estado_proceso === 'cliente_activo') statsByProduct[productId].clients++
      }
    })

    res.json({ success: true, data: statsByProduct })
  } catch (error) {
    console.error('Error fetching product stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ LEAD SCORE STATS ============

app.get('/leads/score-stats', async (req, res) => {
  try {
    const { campaignId } = req.query
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)

    const snapshot = await query.get()
    const stats = {
      total: snapshot.size,
      excellent: 0,
      good: 0,
      regular: 0,
      low: 0,
      veryLow: 0,
      avgScore: 0,
      qualified: 0,
    }

    let totalScore = 0
    snapshot.docs.forEach(doc => {
      const score = doc.data().lead_score || 0
      totalScore += score
      if (score >= 80) stats.excellent++
      else if (score >= 60) stats.good++
      else if (score >= 40) stats.regular++
      else if (score >= 20) stats.low++
      else stats.veryLow++
      if (score >= 50) stats.qualified++
    })

    stats.avgScore = snapshot.size > 0 ? (totalScore / snapshot.size).toFixed(1) : 0

    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching score stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ WHATSAPP BUSINESS API (PREPARADO - NO ACTIVO) ============

app.get('/whatsapp/config', async (req, res) => {
  const configured = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID)
  res.json({
    success: true,
    data: {
      configured,
      provider: configured ? 'Meta Cloud API' : 'none',
      phone_number_id: configured ? PHONE_NUMBER_ID : null,
      status: configured ? 'active' : 'not_configured',
      note: configured
        ? 'WhatsApp Business API activo. Los mensajes se envían directamente.'
        : 'Para activar: configurá WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en las variables de entorno de Firebase.',
    },
  })
})

app.post('/whatsapp/send-template', async (req, res) => {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'WhatsApp Business API no configurada. Configurá WHATSAPP_TOKEN y WHATSAPP_PHONE_ID.',
        code: 'WHATSAPP_NOT_CONFIGURED',
      },
    })
  }

  try {
    const { to, templateName, languageCode, params } = req.body
    if (!to || !templateName) {
      return res.status(400).json({ success: false, error: { message: 'to and templateName required' } })
    }

    const components = []
    if (params && params.length > 0) {
      components.push({
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p })),
      })
    }

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode || 'es' },
          ...(components.length > 0 && { components }),
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) {
    console.error('WhatsApp template error:', error.response?.data || error.message)
    res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } })
  }
})

// ============ MULTI-IDIOMA AUTOMÁTICO ============

const IDIOMA_POR_PAIS = {
  AR: 'es', MX: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es', PY: 'es', UY: 'es',
  US: 'en', GB: 'en', CA: 'en', AU: 'en',
  BR: 'pt', PT: 'pt',
  FR: 'fr', BE: 'fr', CH: 'fr',
  DE: 'de', AT: 'de',
  IT: 'it',
  JP: 'ja', CN: 'zh', KR: 'ko',
}

function detectarIdioma(lead) {
  if (lead.idioma) return lead.idioma
  const city = (lead.ciudad || '').toLowerCase()

  // Argentine cities
  if (city.includes('buenos aires') || city.includes('córdoba') || city.includes('rosario') ||
      city.includes('mendoza') || city.includes('la plata') || city.includes('bariloche')) return 'es'

  // Brazilian cities
  if (city.includes('são paulo') || city.includes('rio de janeiro') || city.includes('brasilia') ||
      city.includes('belo horizonte') || city.includes('curitiba')) return 'pt'

  // US/UK cities
  if (city.includes('new york') || city.includes('los angeles') || city.includes('miami') ||
      city.includes('london') || city.includes('chicago')) return 'en'

  return 'es'
}

const TRADUCCIONES = {
  es: {
    saludo: 'Hola',
    cierre: '¿Te gustaría que hablemos?',
    verDemo: 'Ver mi Demo',
    descuento: '20% OFF exclusivo para vos',
  },
  en: {
    saludo: 'Hello',
    cierre: 'Would you like to chat?',
    verDemo: 'View my Demo',
    descuento: '20% OFF exclusive for you',
  },
  pt: {
    saludo: 'Olá',
    cierre: 'Você gostaria de conversar?',
    verDemo: 'Ver minha Demo',
    descuento: '20% OFF exclusivo para você',
  },
}

function traducirMensaje(mensaje, idioma) {
  const t = TRADUCCIONES[idioma] || TRADUCCIONES.es
  return mensaje
    .replace(/{saludo}/g, t.saludo)
    .replace(/{cierre}/g, t.cierre)
    .replace(/{verDemo}/g, t.verDemo)
}

app.post('/leads/:leadId/detect-language', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }
    const lead = leadDoc.data()
    const idioma = detectarIdioma(lead)

    await db.collection('leads').doc(req.params.leadId).update({
      idioma_detectado: idioma,
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { idioma } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ HORARIOS INTELIGENTES ============

const ZONA_HORARIA_POR_CIUDAD = {
  'Buenos Aires': 'America/Argentina/Buenos_Aires',
  'Córdoba': 'America/Argentina/Cordoba',
  'Rosario': 'America/Argentina/Cordoba',
  'Mendoza': 'America/Argentina/Mendoza',
  'São Paulo': 'America/Sao_Paulo',
  'New York': 'America/New_York',
  'Los Angeles': 'America/Los_Angeles',
  'Madrid': 'Europe/Madrid',
  'Londres': 'Europe/London',
}

function getZonaHoraria(ciudad) {
  return ZONA_HORARIA_POR_CIUDAD[ciudad] || 'America/Argentina/Buenos_Aires'
}

function getHoraLocal(ciudad) {
  const tz = getZonaHoraria(ciudad)
  return new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
}

function getDiaLocal(ciudad) {
  const tz = getZonaHoraria(ciudad)
  return new Date().toLocaleString('en-US', { timeZone: tz, weekday: 'short' })
}

function esHorarioOptimal(ciudad) {
  const hora = parseInt(getHoraLocal(ciudad))
  const dia = getDiaLocal(ciudad)

  if (dia === 'Sat' || dia === 'Sun') return false

  // Best times: 9-11am and 2-5pm
  if (hora >= 9 && hora <= 11) return { optimal: true, reason: 'morning' }
  if (hora >= 14 && hora <= 17) return { optimal: true, reason: 'afternoon' }
  if (hora >= 8 && hora < 9) return { optimal: false, reason: 'early' }
  if (hora > 17 && hora < 20) return { optimal: true, reason: 'evening' }
  return { optimal: false, reason: 'off_hours' }
}

function getOptimalSendTime(ciudad) {
  const now = new Date()
  const tz = getZonaHoraria(ciudad)
  const horaActual = parseInt(getHoraLocal(ciudad))
  const dia = getDiaLocal(ciudad)

  if (dia === 'Sat' || dia === 'Sun') {
    // Schedule for Monday 10am
    const monday = new Date(now)
    monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7 || 7))
    monday.setHours(10, 0, 0, 0)
    return monday
  }

  if (horaActual < 9) {
    now.setHours(9, 30, 0, 0)
    return now
  }
  if (horaActual >= 11 && horaActual < 14) {
    now.setHours(14, 0, 0, 0)
    return now
  }
  if (horaActual >= 17) {
    // Tomorrow 10am
    now.setDate(now.getDate() + 1)
    now.setHours(10, 0, 0, 0)
    return now
  }
  return now
}

app.get('/leads/:leadId/smart-time', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }
    const lead = leadDoc.data()
    const ciudad = lead.ciudad || 'Buenos Aires'
    const horario = esHorarioOptimal(ciudad)
    const optimalTime = getOptimalSendTime(ciudad)

    res.json({
      success: true,
      data: {
        ciudad,
        zona_horaria: getZonaHoraria(ciudad),
        hora_local: getHoraLocal(ciudad),
        es_horario_optimal: horario.optimal,
        razon: horario.reason,
        mejor_momento_para_enviar: optimalTime.toISOString(),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ WHITE-LABEL ============

app.get('/whitelabel/config', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required' } })
    }

    const userDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (!userDoc.exists) {
      return res.json({
        success: true,
        data: {
          whitelabel: false,
          note: 'Configurá white-label en Settings para personalizar Revendr con tu marca.',
        },
      })
    }

    const user = userDoc.data()
    res.json({
      success: true,
      data: {
        whitelabel: user.whitelabel_enabled || false,
        custom_logo: user.custom_logo || null,
        custom_colors: user.custom_colors || null,
        custom_domain: user.custom_domain || null,
        custom_name: user.custom_app_name || 'Revendr',
        features: {
          remove_branding: user.whitelabel_enabled || false,
          custom_domain: user.whitelabel_enabled || false,
          custom_logo: user.whitelabel_enabled || false,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whitelabel/config', async (req, res) => {
  try {
    const { userId, custom_logo, custom_colors, custom_domain, custom_app_name } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required' } })
    }

    await db.collection('usuarios_admin').doc(userId).update({
      whitelabel_enabled: true,
      custom_logo: custom_logo || null,
      custom_colors: custom_colors || null,
      custom_domain: custom_domain || null,
      custom_app_name: custom_app_name || 'Revendr',
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { message: 'White-label config updated' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ MERCADO PAGO (PREPARADO - NO ACTIVO) ============

app.get('/mercadopago/config', async (req, res) => {
  res.json({
    success: true,
    data: {
      configured: !!MP_ACCESS_TOKEN,
      status: MP_ACCESS_TOKEN ? 'active' : 'not_configured',
      note: MP_ACCESS_TOKEN
        ? 'Mercado Pago configurado. Los pagos están activos.'
        : 'Para activar: configurá MP_ACCESS_TOKEN en las variables de entorno de Firebase. Planes: Starter $29 USD, Growth $79 USD.',
      plans: {
        starter: {
          name: 'Starter',
          price_usd: 29,
          price_ars: 32000,
          features: ['100 leads/mes', '50 demos', '1000 mensajes WhatsApp', 'Scraping básico'],
        },
        growth: {
          name: 'Growth',
          price_usd: 79,
          price_ars: 87000,
          features: ['500 leads/mes', '250 demos', '10000 mensajes WhatsApp', 'A/B Testing', 'Secuencia inteligente', 'Multi-canal'],
        },
        enterprise: {
          name: 'Enterprise',
          price_usd: 199,
          price_ars: 220000,
          features: ['Ilimitado', 'White-label', 'API pública', 'Soporte prioritario', 'Personalización completa'],
        },
      },
    },
  })
})

app.post('/mercadopago/create-preference', async (req, res) => {
  if (!MP_ACCESS_TOKEN) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Mercado Pago no configurado. Configurá MP_ACCESS_TOKEN en Firebase.',
        code: 'MP_NOT_CONFIGURED',
      },
    })
  }

  try {
    const { plan, email, userId } = req.body
    const plans = {
      starter: { title: 'Revendr Starter', price: 29 },
      growth: { title: 'Revendr Growth', price: 79 },
      enterprise: { title: 'Revendr Enterprise', price: 199 },
    }

    const selectedPlan = plans[plan]
    if (!selectedPlan) {
      return res.status(400).json({ success: false, error: { message: 'Invalid plan' } })
    }

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [{
          title: selectedPlan.title,
          unit_price: selectedPlan.price,
          quantity: 1,
          currency_id: 'USD',
        }],
        payer: { email },
        metadata: { plan, userId },
        back_urls: {
          success: 'https://revendr-9add8.web.app/dashboard?payment=success',
          failure: 'https://revendr-9add8.web.app/pricing?payment=failure',
          pending: 'https://revendr-9add8.web.app/dashboard?payment=pending',
        },
        auto_return: 'approved',
      },
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    res.json({ success: true, data: { init_point: response.data.init_point, id: response.data.id } })
  } catch (error) {
    console.error('MP preference error:', error.response?.data || error.message)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/mercadopago/webhook', async (req, res) => {
  if (!MP_ACCESS_TOKEN) return res.json({ received: true })

  try {
    const { type, data } = req.body
    if (type === 'payment') {
      const paymentId = data?.id
      if (paymentId) {
        const response = await axios.get(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          { headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` } }
        )

        const payment = response.data
        if (payment.status === 'approved' && payment.metadata?.userId) {
          const plan = payment.metadata.plan || 'starter'
          await db.collection('usuarios_admin').doc(payment.metadata.userId).update({
            plan,
            activo: true,
            mp_payment_id: paymentId,
            fecha_pago: new Date(),
          }, { merge: true })
        }
      }
    }
    res.json({ received: true })
  } catch (error) {
    console.error('MP webhook error:', error.message)
    res.json({ received: true })
  }
})

// ============ API PÚBLICA ============

app.get('/api-docs', (req, res) => {
  res.json({
    name: 'Revendr API',
    version: '1.0.0',
    description: 'API pública para integrar Revendr con tu sistema',
    baseUrl: 'https://us-central1-revendr-9add8.cloudfunctions.net/api',
    authentication: {
      type: 'API Key',
      header: 'x-api-key',
      note: 'Obtené tu API key en Settings > API',
    },
    endpoints: {
      leads: {
        'GET /leads': 'Listar leads (query: rubro, estado, limit)',
        'GET /leads/stats': 'Estadísticas generales de leads',
        'GET /leads/score-stats': 'Distribución de scores',
        'POST /leads/score-all': 'Recalcular scores de todos los leads',
        'POST /leads/:id/generate-message': 'Generar mensaje personalizado',
        'POST /leads/:id/send-email': 'Enviar email al lead',
        'POST /leads/:id/send-whatsapp': 'Enviar WhatsApp al lead',
      },
      campaigns: {
        'GET /campaigns': 'Listar campañas',
        'POST /campaigns': 'Crear campaña',
        'POST /campaigns/:id/scrape': 'Iniciar scraping',
        'POST /campaigns/:id/process-demos': 'Generar demos',
        'POST /campaigns/:id/send-messages': 'Enviar mensajes WhatsApp',
        'POST /campaigns/:id/generate-messages': 'Generar mensajes personalizados',
        'POST /campaigns/:id/process-sequence': 'Procesar secuencia inteligente',
        'POST /campaigns/:id/process-followups': 'Procesar follow-ups',
        'POST /campaigns/:id/ab-test': 'Crear A/B test',
        'GET /campaigns/:id/ab-results': 'Resultados de A/B tests',
        'GET /campaigns/:id/roi': 'Métricas ROI',
        'POST /campaigns/:id/revenue': 'Registrar ingreso',
      },
      products: {
        'GET /productos': 'Listar productos del usuario',
      },
      stats: {
        'GET /stats/dashboard': 'Estadísticas del dashboard',
        'GET /stats/products': 'Estadísticas por producto',
      },
      integrations: {
        'GET /whatsapp/config': 'Estado de WhatsApp',
        'GET /mercadopago/config': 'Estado de Mercado Pago',
        'GET /whitelabel/config': 'Configuración white-label',
      },
    },
    rateLimits: {
      default: '100 requests/min',
      scraping: '5 requests/min',
    },
  })
})

// API Key validation middleware
const API_KEYS_COLLECTION = 'api_keys'

async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ success: false, error: { message: 'API key required' } })
  }

  try {
    const keyDoc = await db.collection(API_KEYS_COLLECTION).doc(apiKey).get()
    if (!keyDoc.exists) {
      return res.status(401).json({ success: false, error: { message: 'Invalid API key' } })
    }

    const keyData = keyDoc.data()
    if (!keyData.active) {
      return res.status(403).json({ success: false, error: { message: 'API key deactivated' } })
    }

    // Update last used
    await keyDoc.ref.update({ last_used: new Date(), uses: (keyData.uses || 0) + 1 })

    req.apiKeyUser = keyData.user_id
    next()
  } catch (error) {
    next()
  }
}

app.post('/api-keys/generate', async (req, res) => {
  try {
    const { userId, name } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required' } })
    }

    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection(API_KEYS_COLLECTION).doc(keyId).set({
      user_id: userId,
      name: name || 'Default Key',
      active: true,
      created_at: new Date(),
      uses: 0,
    })

    res.json({ success: true, data: { api_key: keyId } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/api-keys/revoke', async (req, res) => {
  try {
    const { keyId } = req.body
    await db.collection(API_KEYS_COLLECTION).doc(keyId).update({ active: false })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ CRM INTEGRADO ============

app.get('/crm/pipeline', async (req, res) => {
  try {
    const { campaignId } = req.query
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)

    const snapshot = await query.get()
    const pipeline = {
      nuevo: [],
      contactado: [],
      interesado: [],
      negociacion: [],
      cerrado: [],
      perdido: [],
    }

    snapshot.docs.forEach(doc => {
      const lead = doc.data()
      const stage = lead.crm_stage || 'nuevo'
      if (pipeline[stage]) {
        pipeline[stage].push({ id: doc.id, ...lead })
      }
    })

    const stageOrder = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    const pipelineStats = stageOrder.map(stage => ({
      stage,
      label: { nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', negociacion: 'Negociación', cerrado: 'Cerrado', perdido: 'Perdido' }[stage],
      count: pipeline[stage].length,
      leads: pipeline[stage].slice(0, 10),
    }))

    res.json({ success: true, data: { pipeline: pipelineStats, total: snapshot.size } })
  } catch (error) {
    console.error('Error fetching CRM pipeline:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/crm/leads/:leadId/stage', async (req, res) => {
  try {
    const { stage } = req.body
    const validStages = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid stage' } })
    }

    await db.collection('leads').doc(req.params.leadId).update({
      crm_stage: stage,
      fecha_actualizacion: new Date(),
    })

    await db.collection('crm_events').add({
      lead_id: req.params.leadId,
      event_type: 'stage_change',
      new_stage: stage,
      timestamp: new Date(),
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/crm/leads/:leadId/activity', async (req, res) => {
  try {
    const { type, description, value } = req.body
    await db.collection('crm_events').add({
      lead_id: req.params.leadId,
      event_type: type || 'note',
      description: description || '',
      value: value || null,
      timestamp: new Date(),
    })

    if (type === 'call') {
      await db.collection('leads').doc(req.params.leadId).update({
        llamadas_count: admin.firestore.FieldValue.increment(1),
        fecha_ultima_llamada: new Date(),
      })
    }
    if (type === 'meeting') {
      await db.collection('leads').doc(req.params.leadId).update({
        reuniones_count: admin.firestore.FieldValue.increment(1),
        fecha_ultima_reunion: new Date(),
      })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/crm/leads/:leadId/timeline', async (req, res) => {
  try {
    const snapshot = await db.collection('crm_events')
      .where('lead_id', '==', req.params.leadId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()

    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: events })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ PORTAL DE PROPIETARIOS ============

app.get('/owner/dashboard/:productId', async (req, res) => {
  try {
    const productDoc = await db.collection('productos').doc(req.params.productId).get()
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } })
    }
    const product = productDoc.data()

    const campaignsSnapshot = await db.collection('campanias')
      .where('producto_id', '==', req.params.productId)
      .get()

    let totalLeads = 0, qualifiedLeads = 0, messagesSent = 0, totalRevenue = 0, activeCampaigns = 0
    const campaignIds = []

    campaignsSnapshot.docs.forEach(doc => {
      const c = doc.data()
      campaignIds.push(doc.id)
      totalLeads += c.leads_count || 0
      messagesSent += c.mensajes_enviados || 0
      totalRevenue += c.total_revenue || 0
      if (c.estado === 'activa') activeCampaigns++
    })

    if (campaignIds.length > 0) {
      const leadsSnapshot = await db.collection('leads')
        .where('id_campania', 'in', campaignIds.slice(0, 10))
        .get()
      leadsSnapshot.docs.forEach(doc => {
        if ((doc.data().lead_score || 0) >= 50) qualifiedLeads++
      })
    }

    const viewsSnapshot = await db.collection('landing_views')
      .where('product_id', '==', req.params.productId)
      .get()

    const engagementSnapshot = await db.collection('landing_engagement')
      .where('product_id', '==', req.params.productId)
      .get()

    let totalClicks = 0, totalTime = 0
    engagementSnapshot.docs.forEach(doc => {
      const e = doc.data()
      if (e.event_type === 'cta_click') totalClicks++
      if (e.event_type === 'time_on_page') totalTime += e.data?.seconds || 0
    })

    res.json({
      success: true,
      data: {
        product: { id: req.params.productId, ...product },
        stats: {
          totalCampaigns: campaignsSnapshot.size,
          activeCampaigns,
          totalLeads,
          qualifiedLeads,
          messagesSent,
          totalRevenue,
          landingViews: viewsSnapshot.size,
          ctaClicks: totalClicks,
          avgTimeOnPage: viewsSnapshot.size > 0 ? (totalTime / viewsSnapshot.size).toFixed(1) : 0,
          conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching owner dashboard:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ CHAT EN VIVO ============

app.post('/chat/message', async (req, res) => {
  try {
    const { visitorId, message, visitorName, visitorEmail, productId } = req.body
    if (!message) {
      return res.status(400).json({ success: false, error: { message: 'message required' } })
    }

    const chatMsg = {
      visitor_id: visitorId || `visitor_${Date.now()}`,
      visitor_name: visitorName || 'Visitante',
      visitor_email: visitorEmail || '',
      message,
      product_id: productId || null,
      status: 'unread',
      timestamp: new Date(),
    }

    await db.collection('chat_messages').add(chatMsg)

    if (productId) {
      const productDoc = await db.collection('productos').doc(productId).get()
      if (productDoc.exists) {
        const product = productDoc.data()
        const ownerDoc = await db.collection('usuarios_admin').doc(product.user_id).get()
        if (ownerDoc.exists && ownerDoc.data().email && RESEND_API_KEY) {
          await sendEmail(
            ownerDoc.data().email,
            `Nuevo mensaje de chat - ${visitorName}`,
            `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0ea5e9;">💬 Nuevo mensaje de chat</h2>
              <p><strong>${visitorName}</strong> (${visitorEmail || 'sin email'}) te escribió:</p>
              <div style="background:#1e293b;padding:15px;border-radius:8px;margin:15px 0;">
                <p style="color:#e2e8f0;">${message}</p>
              </div>
              <p><a href="https://revendr-9add8.web.app/dashboard" style="color:#0ea5e9;">Responder en el dashboard</a></p>
            </div>`
          )
        }
      }
    }

    res.json({ success: true, data: { id: chatMsg.visitor_id } })
  } catch (error) {
    console.error('Error sending chat message:', error)
    res.json({ success: true })
  }
})

app.get('/chat/messages', async (req, res) => {
  try {
    const { productId, status } = req.query
    let query = db.collection('chat_messages').orderBy('timestamp', 'desc')
    if (productId) query = query.where('product_id', '==', productId)
    if (status) query = query.where('status', '==', status)

    const snapshot = await query.limit(100).get()
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/chat/reply', async (req, res) => {
  try {
    const { messageId, reply } = req.body
    await db.collection('chat_messages').doc(messageId).update({
      reply,
      status: 'replied',
      replied_at: new Date(),
    })

    const msgDoc = await db.collection('chat_messages').doc(messageId).get()
    if (msgDoc.exists && msgDoc.data().visitor_email && RESEND_API_KEY) {
      const msg = msgDoc.data()
      await sendEmail(
        msg.visitor_email,
        'Respuesta de Revendr',
        `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#0ea5e9;">Tu mensaje fue respondido</h2>
          <p>Hola ${msg.visitor_name},</p>
          <div style="background:#1e293b;padding:15px;border-radius:8px;margin:15px 0;">
            <p style="color:#e2e8f0;">${reply}</p>
          </div>
        </div>`
      )
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ GENERADOR DE CONTENIDO ============

const CONTENT_TEMPLATES = {
  launch: [
    '🚀 ¡{producto} ya está disponible! {descripcion}. Probalo gratis: {url}',
    '🎉 Lanzamiento: {producto}. {descripcion}. link: {url}',
    '✨ Nuevo: {producto}. {descripcion}. ¡Miralo ahora! {url}',
  ],
  feature: [
    '💡 Sabías que {producto} puede {beneficio}? Descubrilo: {url}',
    '🔥 {producto} te ayuda a {beneficio}. Probalo: {url}',
    '⭐ {beneficio} con {producto}. Más info: {url}',
  ],
  testimonial: [
    '💬 "Me encanta {producto}" - {cliente}. Probalo vos también: {url}',
    '🌟 Los usuarios aman {producto}. {testimonial}. link: {url}',
  ],
  promo: [
    '⚡ OFERTA: {producto} con {descuento} OFF por tiempo limitado. {url}',
    '🎯 {descuento} de descuento en {producto}. ¡No lo dejes pasar! {url}',
  ],
}

const SOCIAL_PLATFORMS = {
  twitter: { maxChars: 280, name: 'Twitter/X' },
  instagram: { maxChars: 2200, name: 'Instagram' },
  linkedin: { maxChars: 3000, name: 'LinkedIn' },
  facebook: { maxChars: 63206, name: 'Facebook' },
}

app.post('/content/generate', async (req, res) => {
  try {
    const { productId, type, platform, customParams } = req.body

    let product = null
    if (productId) {
      const prodDoc = await db.collection('productos').doc(productId).get()
      if (prodDoc.exists) product = prodDoc.data()
    }

    const templates = CONTENT_TEMPLATES[type] || CONTENT_TEMPLATES.launch
    const template = templates[Math.floor(Math.random() * templates.length)]

    const params = {
      producto: product?.nombre || customParams?.producto || 'nuestro producto',
      descripcion: product?.descripcion || customParams?.descripcion || 'una solución innovadora',
      url: product?.url_demo || customParams?.url || 'https://revendr-9add8.web.app',
      beneficio: customParams?.beneficio || 'multiplicar tus ventas',
      cliente: customParams?.cliente || 'un cliente satisfecho',
      testimonial: customParams?.testimonial || 'Es increíble',
      descuento: customParams?.descuento || '20%',
    }

    let content = template
    Object.entries(params).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })

    const platformInfo = SOCIAL_PLATFORMS[platform] || SOCIAL_PLATFORMS.twitter
    if (content.length > platformInfo.maxChars) {
      content = content.substring(0, platformInfo.maxChars - 3) + '...'
    }

    const variations = templates.map(t => {
      let v = t
      Object.entries(params).forEach(([key, value]) => {
        v = v.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
      })
      return v.length > platformInfo.maxChars ? v.substring(0, platformInfo.maxChars - 3) + '...' : v
    })

    await db.collection('generated_content').add({
      product_id: productId,
      type,
      platform,
      content,
      variations,
      params,
      timestamp: new Date(),
    })

    res.json({
      success: true,
      data: { content, variations, platform: platformInfo.name, charCount: content.length },
    })
  } catch (error) {
    console.error('Error generating content:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/content/history', async (req, res) => {
  try {
    const { productId } = req.query
    let query = db.collection('generated_content').orderBy('timestamp', 'desc')
    if (productId) query = query.where('product_id', '==', productId)

    const snapshot = await query.limit(50).get()
    const content = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: content })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ INTEGRACIÓN INSTAGRAM/FACEBOOK ============

app.get('/social/config', async (req, res) => {
  res.json({
    success: true,
    data: {
      instagram: { configured: false, note: 'Necesita Facebook Business Manager token' },
      facebook: { configured: false, note: 'Necesita Facebook App ID y token' },
    },
  })
})

app.post('/social/publish', async (req, res) => {
  const { platform, content, imageUrl, link } = req.body

  res.json({
    success: false,
    error: {
      message: `Publicación en ${platform} no disponible aún. Configurá el token de ${platform} en Settings > Integraciones.`,
      code: 'SOCIAL_NOT_CONFIGURED',
    },
  })
})

app.post('/social/ad-campaign', async (req, res) => {
  const { platform, productId, budget, targeting, duration } = req.body

  res.json({
    success: false,
    error: {
      message: `Campaña publicitaria en ${platform} no disponible aún. Configurá ${platform} Ads en Settings.`,
      code: 'ADS_NOT_CONFIGURED',
    },
  })
})

// ============ ANALYTICS CON IA ============

app.get('/analytics/predictions/:campaignId', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    }
    const campaign = campaignDoc.data()

    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', req.params.campaignId)
      .get()

    let totalLeads = leadsSnapshot.size
    let hotLeads = 0, warmLeads = 0, coldLeads = 0
    let avgScore = 0, totalScore = 0
    let engaged = 0, converted = 0

    leadsSnapshot.docs.forEach(doc => {
      const lead = doc.data()
      const score = lead.lead_score || 0
      totalScore += score
      if (lead.temperatura === 'hot') hotLeads++
      else if (lead.temperatura === 'warm') warmLeads++
      else coldLeads++
      if (lead.cta_clicks > 0 || lead.landing_views > 0) engaged++
      if (lead.estado_proceso === 'cliente_activo') converted++
    })

    avgScore = totalLeads > 0 ? (totalScore / totalLeads).toFixed(1) : 0
    const engagementRate = totalLeads > 0 ? ((engaged / totalLeads) * 100).toFixed(1) : 0
    const currentConversion = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0

    // AI Predictions based on historical data
    const predictedConversion = Math.min(
      parseFloat(currentConversion) + (hotLeads * 2.5) + (engagementRate * 0.3),
      100
    ).toFixed(1)

    const predictedRevenue = campaign.leads_count > 0
      ? ((predictedConversion / 100) * campaign.leads_count * 50).toFixed(0)
      : 0

    const recommendedActions = []
    if (hotLeads > 0 && campaign.mensajes_enviados < campaign.leads_count * 0.5) {
      recommendedActions.push({
        action: 'send_more_messages',
        priority: 'high',
        message: `Hay ${hotLeads} leads hot sin mensaje. Enviá ahora.`,
      })
    }
    if (parseFloat(engagementRate) < 10) {
      recommendedActions.push({
        action: 'improve_message',
        priority: 'medium',
        message: 'La tasa de engagement es baja. Probá A/B testing con mensajes diferentes.',
      })
    }
    if (coldLeads > hotLeads * 3) {
      recommendedActions.push({
        action: 'requalify',
        priority: 'low',
        message: 'Muchos leads fríos. Considerá recalificar o descartar leads con score < 20.',
      })
    }

    res.json({
      success: true,
      data: {
        current: {
          totalLeads,
          hotLeads,
          warmLeads,
          coldLeads,
          avgScore,
          engagementRate: parseFloat(engagementRate),
          conversionRate: parseFloat(currentConversion),
        },
        predictions: {
          predictedConversion: parseFloat(predictedConversion),
          predictedRevenue: parseInt(predictedRevenue),
          confidence: Math.min(60 + (totalLeads * 0.5), 95).toFixed(0),
          timeframe: '30 días',
        },
        recommendedActions,
      },
    })
  } catch (error) {
    console.error('Error generating predictions:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/analytics/trends', async (req, res) => {
  try {
    const leadsSnapshot = await db.collection('leads')
      .orderBy('fecha_creacion', 'desc')
      .limit(500)
      .get()

    const dailyData = {}
    leadsSnapshot.docs.forEach(doc => {
      const lead = doc.data()
      const date = lead.fecha_creacion?.toDate?.()
      if (date) {
        const key = date.toISOString().split('T')[0]
        if (!dailyData[key]) dailyData[key] = { leads: 0, qualified: 0, converted: 0, totalScore: 0 }
        dailyData[key].leads++
        if ((lead.lead_score || 0) >= 50) dailyData[key].qualified++
        if (lead.estado_proceso === 'cliente_activo') dailyData[key].converted++
        dailyData[key].totalScore += lead.lead_score || 0
      }
    })

    const trends = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({
        date,
        leads: data.leads,
        qualified: data.qualified,
        converted: data.converted,
        avgScore: data.leads > 0 ? (data.totalScore / data.leads).toFixed(1) : 0,
      }))

    res.json({ success: true, data: trends })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ EXPORTS ============

exports.api = functions.https.onRequest(app)
