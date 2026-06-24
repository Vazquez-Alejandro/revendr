const { admin, db, axios, APIFY_TOKEN } = require('../config')
const { calculateLeadScore, getTemperature, getScoreLabel } = require('./scoring')
const { createNotification } = require('./notifications')

async function pollApifyRun(runId, campaignId, rubro, userId) {
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
        await processApifyResults(run.defaultDatasetId, campaignId, rubro, userId)
        return
      }
      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        await db.collection('campanias').doc(campaignId).update({
          scraping_status: 'failed', scraping_error: run.status, scraping_completed_at: new Date(),
        })
        if (userId) {
          createNotification({ userId, type: 'scraping_error', title: 'Error en scraping', body: `El scraping falló: ${run.status}`, link: `/dashboard/campanias` })
        }
        return
      }
    } catch (error) {
      console.error('Error polling Apify:', error.message)
    }
  }
  await db.collection('campanias').doc(campaignId).update({
    scraping_status: 'timeout', scraping_completed_at: new Date(),
  })
}

async function processApifyResults(datasetId, campaignId, rubro, userId) {
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
        id_campania: campaignId, user_id: userId || '',
        nombre_negocio: raw.name || raw.title || raw.nombre || 'Sin nombre',
        telefono_whatsapp: phoneClean.startsWith('54') ? `+${phoneClean}` : `+54${phoneClean}`,
        email: raw.email || '', rubro: rubro || 'general',
        ciudad: raw.city || raw.location || '', direccion: raw.address || raw.direccion || '',
        url_origen: raw.url || raw.placeId || '', url_google_maps: raw.url || '',
        calificacion: raw.totalScore || raw.rating || null,
        reviews_count: raw.reviewsCount || raw.reviews || 0,
        total_reviews: raw.reviewsCount || raw.reviews || 0,
        datos_personalizados: { logo: raw.image || raw.photos?.[0] || '', horarios: raw.openingHours || [], website: raw.website || '' },
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
    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'completed', scraping_completed_at: new Date(),
      leads_count: admin.firestore.FieldValue.increment(saved),
    })
    if (userId && saved > 0) {
      createNotification({ userId, type: 'new_lead', title: `${saved} ${saved === 1 ? 'nuevo lead' : 'nuevos leads'} encontrados`, body: `Scraping completado para la campaña`, link: `/dashboard/leads` })
    }
  } catch (error) {
    console.error('Error processing Apify results:', error.message)
    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'error', scraping_error: error.message, scraping_completed_at: new Date(),
    })
  }
}

module.exports = {
  pollApifyRun, processApifyResults,
}
