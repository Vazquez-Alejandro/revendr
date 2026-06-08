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
        datos_personalizados: {
          logo: raw.image || raw.photos?.[0] || '',
          horarios: raw.openingHours || [],
          website: raw.website || '',
        },
        estado_proceso: 'scraped',
        fecha_creacion: new Date(),
      }

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
    const { limit: limitParam = 10 } = req.body

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
      .limit(parseInt(limitParam))
      .get()

    let sent = 0
    let failed = 0

    for (const leadDoc of leadsSnapshot.docs) {
      try {
        const lead = leadDoc.data()

        if (!lead.url_demo || !lead.telefono_whatsapp) {
          failed++
          continue
        }

        const messageTemplate = campaign.producto_mensaje || campaign.mensaje_template || `Hola {nombre_negocio}, te propuse algo especial para tu {rubro}.\n\nMirá tu demo: {url_demo}`
        const message = messageTemplate
          .replace(/{nombre_negocio}/g, lead.nombre_negocio)
          .replace(/{url_demo}/g, lead.url_demo)
          .replace(/{rubro}/g, lead.rubro)

        const delay = Math.floor(Math.random() * 60000) + 30000
        await new Promise(resolve => setTimeout(resolve, delay))

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

        await db.collection('leads').doc(leadDoc.id).update({
          estado_proceso: 'mensaje_enviado',
          whatsapp_message_id: response.data.messages?.[0]?.id,
          fecha_envio_whatsapp: new Date(),
          fecha_actualizacion: new Date(),
        })

        sent++
      } catch (err) {
        console.error(`Error sending to lead ${leadDoc.id}:`, err.response?.data || err.message)
        failed++
      }
    }

    if (sent > 0) {
      await db.collection('campanias').doc(campaignId).update({
        mensajes_enviados: admin.firestore.FieldValue.increment(sent),
      })
    }

    res.json({ success: true, data: { sent, failed, total: leadsSnapshot.size } })
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

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, leadId, plan } = req.body

    if (!priceId) {
      return res.status(400).json({ success: false, error: { message: 'priceId is required' } })
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `https://revendr-9add8.web.app/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://revendr-9add8.web.app/pricing`,
      metadata: { leadId: leadId || '', plan: plan || 'growth' },
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error.message)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ STATS ============

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

exports.api = functions.https.onRequest(app)
