const { admin, db, axios, APIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID, GOOGLE_PLACES_API_KEY, APIFY_ACTORS, RUBRO_SEARCH_TERMS, FIREBASE_APP_URL } = require('../../config')
const { createNotification, calculateLeadScore, getTemperature, getScoreLabel, pollApifyRun } = require('../../helpers')

module.exports = function(app) {

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
          ? `${FIREBASE_APP_URL}/demo/producto/${campaign.producto_id}?negocio=${encodeURIComponent(lead.nombre_negocio)}&telefono=${encodeURIComponent(lead.telefono_whatsapp || '')}`
          : campaign.producto_url_demo
            ? `${campaign.producto_url_demo}?negocio=${encodeURIComponent(lead.nombre_negocio)}&ciudad=${encodeURIComponent(lead.ciudad || '')}`
            : `${FIREBASE_APP_URL}/demo/${lead.rubro}/${propuestaId}`
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

}
