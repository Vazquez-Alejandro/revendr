const { admin, db, axios, APIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID, GOOGLE_PLACES_API_KEY, APIFY_ACTORS, RUBRO_SEARCH_TERMS, isBusinessHours, isCampaignExpired, STRIPE_SECRET_KEY, emailTransporter, GMAIL_USER, RESEND_API_KEY } = require('../config')
const { createNotification, calculateLeadScore, getTemperature, getScoreLabel, autoScoreLead, pollApifyRun, generatePersonalizedMessage, sendEmail, generateEmailTemplate, SEQUENCE_RULES, sendSimpleEmail, sendTelegramMessage } = require('../helpers')

module.exports = function(app) {

app.get('/campaigns', async (req, res) => {
  try {
    const snapshot = await db.collection('campanias')
      .where('user_id', '==', req.user.uid)
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
      nombre, rubro_objetivo, ciudad: ciudad || '', mensaje_template: mensaje_template || '',
      user_id: req.user.uid, estado: 'activa', fecha_inicio: new Date(), fecha_creacion: new Date(),
      leads_count: 0, propuestas_generadas: 0, mensajes_enviados: 0,
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
    await db.collection('campanias').doc(req.params.id).update({ estado, fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/scrape-google', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    const { ciudad, rubro_objetivo } = campaign
    const searchTerm = `${RUBRO_SEARCH_TERMS[rubro_objetivo] || rubro_objetivo} ${ciudad || ''}`.trim()
    if (!GOOGLE_PLACES_API_KEY) return res.status(500).json({ success: false, error: { message: 'Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in .env' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ scraping_status: 'running', scraping_started_at: new Date() })
    const searchRes = await axios.post('https://places.googleapis.com/v1/places:searchText',
      { textQuery: searchTerm, pageSize: 20, languageCode: 'es' },
      { headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.googleMapsUri,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.priceLevel', 'Content-Type': 'application/json' } }
    )
    const places = searchRes.data.places || []
    let saved = 0
    for (const place of places) {
      const phone = place.internationalPhoneNumber || ''
      const phoneClean = phone.replace(/\D/g, '')
      if (!phoneClean || phoneClean.length < 8) continue
      const leadData = {
        id_campania: req.params.campaignId, user_id: req.user?.uid || '',
        nombre_negocio: place.displayName?.text || 'Sin nombre',
        telefono_whatsapp: phoneClean.startsWith('54') ? `+${phoneClean}` : `+54${phoneClean}`,
        email: '', rubro: rubro_objetivo || 'general', ciudad: ciudad || '',
        direccion: place.formattedAddress || '', url_origen: place.googleMapsUri || '',
        url_google_maps: place.googleMapsUri || '', calificacion: place.rating || null,
        reviews_count: place.userRatingCount || 0, total_reviews: place.userRatingCount || 0,
        datos_personalizados: { logo: '', horarios: place.regularOpeningHours?.weekdayDescriptions || [], website: place.websiteUri || '' },
        estado_proceso: 'scraped', fecha_creacion: new Date(),
      }
      const score = calculateLeadScore(leadData)
      leadData.lead_score = score
      leadData.temperatura = getTemperature(score)
      leadData.score_label = getScoreLabel(score).label
      leadData.qualifies_for_messaging = score >= 30
      await db.collection('leads').add(leadData)
      saved++
    }
    await db.collection('campanias').doc(req.params.campaignId).update({ scraping_status: 'completed', scraping_completed_at: new Date(), leads_count: admin.firestore.FieldValue.increment(saved) })
    if (req.user?.uid && saved > 0) createNotification({ userId: req.user.uid, type: 'new_lead', title: `${saved} ${saved === 1 ? 'nuevo lead' : 'nuevos leads'} encontrados`, body: `Google Places completado para ${campaign.nombre || 'la campaña'}`, link: `/dashboard/leads` })
    res.json({ success: true, data: { saved, status: 'completed' } })
  } catch (error) {
    console.error('Error in Google Places scrape:', error.message)
    if (error.response) console.error('Google API response:', error.response.status, JSON.stringify(error.response.data))
    await db.collection('campanias').doc(req.params.campaignId).update({ scraping_status: 'error', scraping_error: error.message, scraping_completed_at: new Date() })
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/scrape', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    const { ciudad, rubro_objetivo } = campaign
    const searchTerm = `${RUBRO_SEARCH_TERMS[rubro_objetivo] || rubro_objetivo} ${ciudad || ''}`.trim()
    if (!APIFY_TOKEN) return res.status(500).json({ success: false, error: { message: 'Apify token not configured' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ scraping_status: 'running', scraping_started_at: new Date() })
    const runResponse = await axios.post(`https://api.apify.com/v2/acts/${APIFY_ACTORS.google_maps}/runs`, { searchStringsArray: [searchTerm], maxCrawledPlacesPerSearch: 50, language: 'es' }, { params: { token: APIFY_TOKEN } })
    const runId = runResponse.data.data.id
    res.json({ success: true, data: { runId, status: 'running' } })
    pollApifyRun(runId, req.params.campaignId, rubro_objetivo, req.user?.uid).catch(err => console.error('Background scraping error:', err))
  } catch (error) {
    console.error('Error starting scrape:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/process-demos', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { limit: limitParam = 10 } = req.body
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    let productPrice = null
    let productGa4Id = null
    let productFbPixelId = null
    if (campaign.producto_id) {
      const prodDoc = await db.collection('productos').doc(campaign.producto_id).get()
      if (prodDoc.exists) {
        const prodData = prodDoc.data()
        productPrice = prodData.precio || null
        productGa4Id = prodData.ga4_id || null
        productFbPixelId = prodData.fb_pixel_id || null
      }
    }
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).where('estado_proceso', '==', 'scraped').limit(parseInt(limitParam)).get()
    let processed = 0
    const results = []
    for (const leadDoc of leadsSnapshot.docs) {
      try {
        const lead = leadDoc.data()
        const propuestaId = `propuesta-${lead.rubro}-${leadDoc.id}`
        const propuestaUrl = campaign.producto_id
          ? `https://revendr-9add8.web.app/demo/producto/${campaign.producto_id}?negocio=${encodeURIComponent(lead.nombre_negocio)}&telefono=${encodeURIComponent(lead.telefono_whatsapp || '')}`
          : campaign.producto_url_demo
            ? `${campaign.producto_url_demo}?negocio=${encodeURIComponent(lead.nombre_negocio)}&ciudad=${encodeURIComponent(lead.ciudad || '')}`
            : `https://revendr-9add8.web.app/demo/${lead.rubro}/${propuestaId}`
        const propuestaData = { lead_id: leadDoc.id, nombre_negocio: lead.nombre_negocio, rubro: lead.rubro, ciudad: lead.ciudad || 'Argentina', direccion: lead.direccion || '', telefono_whatsapp: lead.telefono_whatsapp || '', calificacion: lead.calificacion || 4.8, logo: lead.datos_personalizados?.logo || '', website: lead.datos_personalizados?.website || '', horarios: lead.datos_personalizados?.horarios || [], url_propuesta: propuestaUrl, producto_url: campaign.producto_url_demo || null, precio: productPrice, ga4_id: productGa4Id, fb_pixel_id: productFbPixelId, fecha_creacion: new Date() }
        await db.collection('propuestas').doc(propuestaId).set(propuestaData)
        await db.collection('leads').doc(leadDoc.id).update({ estado_proceso: 'propuesta_generada', url_propuesta: propuestaData.url_propuesta, propuesta_id: propuestaId, fecha_generacion_propuesta: new Date(), fecha_actualizacion: new Date() })
        processed++
        results.push({ leadId: leadDoc.id, propuestaUrl: propuestaData.url_propuesta })
      } catch (err) { console.error(`Error generating propuesta for lead ${leadDoc.id}:`, err.message) }
    }
    if (processed > 0) {
      await db.collection('campanias').doc(campaignId).update({ propuestas_generadas: admin.firestore.FieldValue.increment(processed) })
      createNotification({ userId: req.user?.uid, type: 'propuesta_generated', title: `${processed} ${processed === 1 ? 'propuesta generada' : 'propuestas generadas'}`, body: 'Procesamiento masivo completado para la campaña', link: `/dashboard/leads` })
    }
    res.json({ success: true, data: { processed, results } })
  } catch (error) {
    console.error('Error batch generating propuestas:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/scheduled-scrape', async (req, res) => {
  try {
    const { schedule } = req.body
    if (!schedule || !['daily', 'weekly', 'monthly'].includes(schedule)) return res.status(400).json({ success: false, error: { message: 'schedule must be daily, weekly, or monthly' } })
    const activeCampaigns = await db.collection('campanias').where('estado', '==', 'activa').where('auto_scrape', '==', true).get()
    let queued = 0
    for (const doc of activeCampaigns.docs) {
      const campaign = doc.data()
      const shouldRun = shouldRunSchedule(campaign.last_auto_scrape, schedule)
      if (shouldRun) {
        await db.collection('campanias').doc(doc.id).update({ scraping_status: 'scheduled', last_auto_scrape: new Date() })
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
    await db.collection('campanias').doc(req.params.campaignId).update({ auto_scrape: auto_scrape || false, scrape_schedule: scrape_schedule || 'weekly', fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
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

app.post('/campaigns/:campaignId/revenue', async (req, res) => {
  try {
    const { leadId, amount, currency, notes } = req.body
    if (!leadId || !amount) return res.status(400).json({ success: false, error: { message: 'leadId and amount required' } })
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    await db.collection('revenue').add({ campaign_id: req.params.campaignId, lead_id: leadId, amount: parseFloat(amount), currency: currency || 'USD', notes: notes || '', fecha_creacion: new Date() })
    await db.collection('campanias').doc(req.params.campaignId).update({ total_revenue: admin.firestore.FieldValue.increment(parseFloat(amount)), total_clients: admin.firestore.FieldValue.increment(1) })
    await db.collection('leads').doc(leadId).update({ estado_proceso: 'cliente_activo', revenue_amount: parseFloat(amount), fecha_pago: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/campaigns/:campaignId/roi', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    const revenueSnapshot = await db.collection('revenue').where('campaign_id', '==', req.params.campaignId).get()
    let totalRevenue = 0, totalClients = 0
    const revenueByLead = []
    revenueSnapshot.docs.forEach(doc => { const rev = doc.data(); totalRevenue += rev.amount; totalClients++; revenueByLead.push({ lead_id: rev.lead_id, amount: rev.amount, date: rev.fecha_creacion }) })
    const estimatedCost = (campaign.mensajes_enviados || 0) * 0.01
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost * 100).toFixed(1) : totalRevenue > 0 ? '∞' : 0
    res.json({ success: true, data: { totalRevenue, totalClients, estimatedCost: estimatedCost.toFixed(2), roi, revenueByLead, leadsCount: campaign.leads_count || 0, conversionRate: campaign.leads_count > 0 ? ((totalClients / campaign.leads_count) * 100).toFixed(1) : 0 } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/generate-messages', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { minScore } = req.body
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    let product = null
    if (campaign.producto_id) { const prodDoc = await db.collection('productos').doc(campaign.producto_id).get(); if (prodDoc.exists) product = prodDoc.data() }
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).where('estado_proceso', '==', 'scraped').get()
    let generated = 0, skipped = 0
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      const score = calculateLeadScore(lead)
      const threshold = minScore || 30
      if (score < threshold) { skipped++; continue }
      const message = generatePersonalizedMessage(lead, product)
      await leadDoc.ref.update({ mensaje_personalizado: message, lead_score: score, temperatura: getTemperature(score), score_label: getScoreLabel(score).label, qualifies_for_messaging: true, fecha_generacion_mensaje: new Date() })
      generated++
    }
    res.json({ success: true, data: { generated, skipped, total: leadsSnapshot.size } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/followups', async (req, res) => {
  try {
    const { followups } = req.body
    if (!followups || !Array.isArray(followups)) return res.status(400).json({ success: false, error: { message: 'followups array required' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ followups, fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/process-followups', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    if (!campaign.followups || campaign.followups.length === 0) return res.json({ success: true, data: { sent: 0, message: 'No followups configured' } })
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    if (isCampaignExpired(campaign)) return res.status(400).json({ success: false, error: { message: 'Campaign expired' } })
    if (!isBusinessHours()) return res.status(400).json({ success: false, error: { message: 'Outside business hours' } })
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', req.params.campaignId).where('estado_proceso', '==', 'mensaje_enviado').get()
    let sent = 0
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      if (!lead.telefono_whatsapp) continue
      for (const followup of campaign.followups) {
        const daysSinceSend = lead.fecha_envio_whatsapp ? Math.floor((Date.now() - lead.fecha_envio_whatsapp.toDate().getTime()) / (1000 * 60 * 60 * 24)) : 0
        if (daysSinceSend < followup.delayDays) continue
        const followupKey = `followup_${followup.delayDays}_sent`
        if (lead[followupKey]) continue
        const message = followup.message.replace(/{nombre_negocio}/g, lead.nombre_negocio).replace(/{url_propuesta}/g, lead.url_propuesta).replace(/{rubro}/g, lead.rubro)
        try {
          await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to: lead.telefono_whatsapp.replace(/\D/g, ''), type: 'text', text: { body: message } }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } })
          await db.collection('leads').doc(leadDoc.id).update({ [followupKey]: true, fecha_ultimo_followup: new Date(), fecha_actualizacion: new Date() })
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 60000) + 30000))
          sent++
        } catch (err) { console.error(`Followup error for lead ${leadDoc.id}:`, err.message) }
      }
    }
    res.json({ success: true, data: { sent } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/process-sequence', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    let product = null
    if (campaign.producto_id) { const prodDoc = await db.collection('productos').doc(campaign.producto_id).get(); if (prodDoc.exists) product = prodDoc.data() }
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).get()
    let actions = 0
    const results = []
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      const currentStep = lead.sequence_step || 'initial'
      const rule = SEQUENCE_RULES[currentStep]
      if (!rule) continue
      const lastAction = lead.fecha_ultimo_followup?.toDate?.() || lead.fecha_envio_whatsapp?.toDate?.() || lead.fecha_creacion?.toDate?.()
      if (!lastAction) continue
      const daysSince = Math.floor((Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < rule.delayDays) continue
      if (!rule.condition(lead)) continue
      const nextStep = rule.nextStep
      if (nextStep && nextStep.startsWith('email_') && lead.email && RESEND_API_KEY) {
        const messageType = nextStep.replace('email_', '')
        const { subject, html } = generateEmailTemplate(lead, product, messageType)
        const emailResult = await sendEmail(lead.email, subject, html)
        if (emailResult) {
          await leadDoc.ref.update({ sequence_step: nextStep, fecha_ultimo_followup: new Date(), fecha_actualizacion: new Date() })
          await db.collection('message_events').add({ lead_id: leadDoc.id, campaign_id: campaignId, channel: 'email', event_type: 'sent', message_type: messageType, timestamp: new Date() })
          actions++
          results.push({ leadId: leadDoc.id, action: nextStep, channel: 'email' })
        }
      }
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 30000) + 15000))
    }
    res.json({ success: true, data: { actions, results } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/ab-test', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { messageA, messageB } = req.body
    if (!messageA || !messageB) return res.status(400).json({ success: false, error: { message: 'Both message variants required' } })
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).where('qualifies_for_messaging', '==', true).get()
    if (leadsSnapshot.size < 10) return res.status(400).json({ success: false, error: { message: 'Need at least 10 qualified leads for A/B test' } })
    const leads = leadsSnapshot.docs
    const shuffled = leads.sort(() => Math.random() - 0.5)
    const half = Math.floor(shuffled.length / 2)
    const groupA = shuffled.slice(0, half)
    const groupB = shuffled.slice(half)
    const abTestRef = await db.collection('ab_tests').add({ campaign_id: campaignId, message_a: messageA, message_b: messageB, group_a_count: groupA.length, group_b_count: groupB.length, status: 'running', fecha_creacion: new Date() })
    for (const leadDoc of groupA) {
      const message = messageA.replace(/{nombre_negocio}/g, leadDoc.data().nombre_negocio).replace(/{url_propuesta}/g, leadDoc.data().url_propuesta).replace(/{rubro}/g, leadDoc.data().rubro)
      await leadDoc.ref.update({ ab_test_id: abTestRef.id, ab_group: 'A', mensaje_personalizado: message })
    }
    for (const leadDoc of groupB) {
      const message = messageB.replace(/{nombre_negocio}/g, leadDoc.data().nombre_negocio).replace(/{url_propuesta}/g, leadDoc.data().url_propuesta).replace(/{rubro}/g, leadDoc.data().rubro)
      await leadDoc.ref.update({ ab_test_id: abTestRef.id, ab_group: 'B', mensaje_personalizado: message })
    }
    res.json({ success: true, data: { testId: abTestRef.id, groupA: groupA.length, groupB: groupB.length } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/campaigns/:campaignId/ab-results', async (req, res) => {
  try {
    const testsSnapshot = await db.collection('ab_tests').where('campaign_id', '==', req.params.campaignId).orderBy('fecha_creacion', 'desc').limit(5).get()
    const tests = []
    for (const testDoc of testsSnapshot.docs) {
      const test = testDoc.data()
      const leadsSnapshot = await db.collection('leads').where('ab_test_id', '==', testDoc.id).get()
      let groupAEngaged = 0, groupBEngaged = 0, groupAClicks = 0, groupBClicks = 0
      leadsSnapshot.docs.forEach(doc => {
        const lead = doc.data()
        if (lead.ab_group === 'A') { if (lead.cta_clicks > 0 || lead.landing_views > 0) groupAEngaged++; groupAClicks += lead.cta_clicks || 0 }
        else { if (lead.cta_clicks > 0 || lead.landing_views > 0) groupBEngaged++; groupBClicks += lead.cta_clicks || 0 }
      })
      const groupASize = leadsSnapshot.docs.filter(d => d.data().ab_group === 'A').length || 1
      const groupBSize = leadsSnapshot.docs.filter(d => d.data().ab_group === 'B').length || 1
      tests.push({ id: testDoc.id, ...test, groupA: { size: groupASize, engaged: groupAEngaged, engagementRate: ((groupAEngaged / groupASize) * 100).toFixed(1), totalClicks: groupAClicks }, groupB: { size: groupBSize, engaged: groupBEngaged, engagementRate: ((groupBEngaged / groupBSize) * 100).toFixed(1), totalClicks: groupBClicks }, winner: groupAEngaged > groupBEngaged ? 'A' : groupBEngaged > groupAEngaged ? 'B' : 'Tie' })
    }
    res.json({ success: true, data: tests })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/messages/track', async (req, res) => {
  try {
    const { leadId, campaignId, channel, eventType, data } = req.body
    await db.collection('message_events').add({ lead_id: leadId, campaign_id: campaignId, channel, event_type: eventType, data: data || {}, timestamp: new Date() })
    if (leadId) {
      const leadRef = db.collection('leads').doc(leadId)
      const leadDoc = await leadRef.get()
      if (leadDoc.exists) {
        const lead = leadDoc.data()
        const updates = { fecha_actualizacion: new Date() }
        if (eventType === 'delivered') updates.mensajes_entregados = (lead.mensajes_entregados || 0) + 1
        if (eventType === 'read') updates.mensajes_leidos = (lead.mensajes_leidos || 0) + 1
        if (eventType === 'clicked') updates.mensajes_clickeados = (lead.mensajes_clickeados || 0) + 1
        const reads = lead.mensajes_leidos || 0
        const clicks = lead.mensajes_clickeados || 0
        const engagementScore = (reads * 2) + (clicks * 3)
        updates.engagement_score = engagementScore
        if (engagementScore >= 5) updates.temperatura = 'hot'
        else if (engagementScore >= 2) updates.temperatura = 'warm'
        await leadRef.update(updates)
      }
    }
    res.json({ success: true })
  } catch (error) { res.json({ success: true }) }
})

app.post('/campaigns/:campaignId/send-demo-emails', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const leadsSnapshot = await db.collection('leads')
      .where('id_campania', '==', campaignId)
      .where('estado_proceso', '==', 'propuesta_generada')
      .get()
    let sent = 0, whatsappFallback = 0, skipped = 0
    const whatsappLinks = []
    for (const leadDoc of leadsSnapshot.docs) {
      const lead = leadDoc.data()
      if (!lead.url_propuesta) { skipped++; continue }
      if (lead.email) {
        const utmParamsEmail = new URLSearchParams({
          utm_source: 'email',
          utm_medium: 'email',
          utm_campaign: campaignId,
          utm_content: lead.nombre_negocio
        }).toString()
        const proposalUrlWithUtm = `${lead.url_propuesta}${lead.url_propuesta.includes('?') ? '&' : '?'}${utmParamsEmail}`
        const subject = `Nueva propuesta digital para ${lead.nombre_negocio}`
        const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
<div style="text-align:center;margin-bottom:24px;">
<img src="https://revendr-9add8.web.app/logo.png" alt="Revendr" style="height:32px;" onerror="this.style.display='none'"/>
</div>
<h2 style="color:#1e293b;margin:0 0 8px 0;">Hola,</h2>
<p style="color:#475569;line-height:1.6;margin:0 0 16px 0;">Generamos una propuesta digital personalizada para <strong>${lead.nombre_negocio}</strong>. Incluye rese&ntilde;as de Google, datos de tu negocio y un diseño moderno que pod&eacute;s enviar al instante por WhatsApp o email a tus clientes.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #6366f1;">
<p style="margin:0 0 4px 0;color:#64748b;font-size:14px;"><strong>¿Qué incluye?</strong></p>
<p style="margin:0;color:#475569;font-size:14px;">✅ Landing page con rese&ntilde;as reales de Google<br/>✅ Envio automatizado por WhatsApp y email<br/>✅ Dise&ntilde;o adaptado a tu rubro</p>
</div>
<div style="text-align:center;margin:24px 0;">
<a href="${proposalUrlWithUtm}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Ver mi propuesta</a>
</div>
<p style="color:#94a3b8;font-size:13px;line-height:1.5;text-align:center;margin:16px 0 0 0;">Si ten&eacute;s dudas o quer&eacute;s personalizar algo, respond&eacute; a este correo.</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px 0;"/>
<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
<p style="margin:0 0 6px 0;color:#475569;font-size:13px;font-weight:bold;">¿Qu&eacute; es Revendr?</p>
<p style="margin:0 0 10px 0;color:#64748b;font-size:13px;line-height:1.5;">Revendr automatiza la generaci&oacute;n de propuestas digitales y el env&iacute;o de mensajes por WhatsApp y email para potenciar tu negocio. Sin esfuerzo manual.</p>
<a href="https://revendr-9add8.web.app/" style="color:#6366f1;font-size:13px;font-weight:600;text-decoration:none;">Conoc&eacute; m&aacute;s sobre Revendr →</a>
</div>
<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">© 2026 Revendr &middot; Plataforma de crecimiento para tu negocio</p>
</div>`
        try {
          await sendSimpleEmail(lead.email, subject, html)
          sent++
        } catch (err) { console.error(`Email error for ${leadDoc.id}:`, err.message); whatsappFallback++ }
      } else {
        whatsappFallback++
        if (lead.telefono_whatsapp) {
          const utmParamsWa = new URLSearchParams({
            utm_source: 'telegram_fallback',
            utm_medium: 'whatsapp',
            utm_campaign: campaignId,
            utm_content: lead.nombre_negocio
          }).toString()
          const waUrlWithUtm = `${lead.url_propuesta}${lead.url_propuesta.includes('?') ? '&' : '?'}${utmParamsWa}`
          whatsappLinks.push({ nombre: lead.nombre_negocio, link: `https://wa.me/${lead.telefono_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, te comparto tu propuesta: ' + waUrlWithUtm)}` })
        }
      }
    }
    if (whatsappLinks.length > 0) {
      await sendTelegramMessage(`📬 Leads sin email (${whatsappLinks.length}):\n\n${whatsappLinks.slice(0, 10).map(w => `${w.nombre}: ${w.link}`).join('\n')}${whatsappLinks.length > 10 ? `\n...y ${whatsappLinks.length - 10} más` : ''}`)
    }
    res.json({ success: true, data: { sent, whatsapp_fallback: whatsappFallback, skipped, hasWhatsappLinks: whatsappLinks.length > 0 } })
  } catch (error) {
    console.error('Error sending demo emails:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/send-messages', async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const { limit: limitParam = 10, minScore = 30 } = req.body
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    if (isCampaignExpired(campaign)) return res.status(400).json({ success: false, error: { message: 'Campaign has expired' } })
    if (!isBusinessHours()) return res.status(400).json({ success: false, error: { message: 'Outside business hours (Mon-Fri 9-18hs)' } })
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).where('estado_proceso', '==', 'propuesta_generada').get()
    let sent = 0, failed = 0, skippedLowScore = 0
    const DELAY_BETWEEN_MESSAGES = 45000, MAX_PER_BATCH = 10, BATCH_PAUSE = 180000
    const leadsWithScore = leadsSnapshot.docs.map(doc => ({ ref: doc, data: doc.data(), score: calculateLeadScore(doc.data()) })).sort((a, b) => b.score - a.score)
    const toSend = leadsWithScore.slice(0, parseInt(limitParam))
    for (let i = 0; i < toSend.length; i++) {
      if (i > 0 && i % MAX_PER_BATCH === 0) await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE))
      try {
        const { ref: leadDoc, data: lead, score } = toSend[i]
        if (!lead.url_propuesta || !lead.telefono_whatsapp) { failed++; continue }
        if (score < minScore) { skippedLowScore++; continue }
        let message = lead.mensaje_personalizado
        if (!message) {
          const messageTemplate = campaign.producto_mensaje || campaign.mensaje_template || 'Hola {nombre_negocio}, te propuse algo especial para tu {rubro}.\n\nMirá tu propuesta: {url_propuesta}'
          message = messageTemplate.replace(/{nombre_negocio}/g, lead.nombre_negocio).replace(/{url_propuesta}/g, lead.url_propuesta).replace(/{rubro}/g, lead.rubro)
        }
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES + Math.floor(Math.random() * 20000)))
        const response = await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to: lead.telefono_whatsapp.replace(/\D/g, ''), type: 'text', text: { body: message } }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } })
        await leadDoc.ref.update({ estado_proceso: 'mensaje_enviado', whatsapp_message_id: response.data.messages?.[0]?.id, fecha_envio_whatsapp: new Date(), fecha_actualizacion: new Date(), lead_score_at_send: score })
        sent++
      } catch (err) { console.error('Error sending to lead:', err.response?.data || err.message); failed++ }
    }
    if (sent > 0) await db.collection('campanias').doc(campaignId).update({ mensajes_enviados: admin.firestore.FieldValue.increment(sent) })
    res.json({ success: true, data: { sent, failed, skippedLowScore, total: leadsSnapshot.size } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
