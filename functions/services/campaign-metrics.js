const { db } = require('../config')

async function getCampaignMetrics(userId, campaignId) {
  try {
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return null
    const campaign = campaignDoc.data()
    if (campaign.user_id !== userId) return null

    const leadsSnapshot = await db.collection('leads')
      .where('user_id', '==', userId)
      .where('id_campania', '==', campaignId)
      .get()

    const messagesSnapshot = await db.collection('message_log')
      .where('user_id', '==', userId)
      .where('campaign_id', '==', campaignId)
      .get()

    let totalLeads = 0
    let messaged = 0
    let landingViews = 0
    let ctaClicks = 0
    let engaged = 0
    let converted = 0
    let ignored = 0
    let responses = 0

    leadsSnapshot.docs.forEach(doc => {
      const lead = doc.data()
      totalLeads++
      if (lead.fecha_envio_whatsapp) messaged++
      if ((lead.landing_views || 0) > 0) landingViews++
      if ((lead.cta_clicks || 0) > 0) ctaClicks++
      if (lead.estado_proceso === 'cliente_activo') converted++
      if ((lead.mensajes_leidos || 0) > 0 || (lead.respuestas_whatsapp || 0) > 0) responses++

      const engagement = categorizeEngagementSimple(lead)
      if (engagement === 'engaged') engaged++
      if (engagement === 'ignored') ignored++
    })

    let sent = 0
    let failed = 0
    let delivered = 0
    messagesSnapshot.docs.forEach(doc => {
      const msg = doc.data()
      if (msg.status === 'sent') sent++
      if (msg.status === 'failed') failed++
      if (msg.status === 'delivered') delivered++
    })

    return {
      campaign: { id: campaignId, ...campaign },
      metrics: {
        totalLeads,
        messaged,
        landingViews,
        ctaClicks,
        engaged,
        converted,
        ignored,
        responses,
        sent,
        failed,
        delivered,
      },
      rates: {
        viewRate: totalLeads > 0 ? ((landingViews / totalLeads) * 100).toFixed(1) : 0,
        clickRate: totalLeads > 0 ? ((ctaClicks / totalLeads) * 100).toFixed(1) : 0,
        engagementRate: totalLeads > 0 ? ((engaged / totalLeads) * 100).toFixed(1) : 0,
        conversionRate: totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0,
        responseRate: messaged > 0 ? ((responses / messaged) * 100).toFixed(1) : 0,
        deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
      },
    }
  } catch (error) {
    console.error('Error getting campaign metrics:', error.message)
    return null
  }
}

function categorizeEngagementSimple(lead) {
  if (lead.estado_proceso === 'cliente_activo') return 'converted'
  if ((lead.cta_clicks || 0) > 0) return 'engaged'
  if ((lead.landing_views || 0) > 0) return 'viewed'
  if (lead.fecha_envio_whatsapp) {
    const daysSince = Math.floor((Date.now() - lead.fecha_envio_whatsapp.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 3 && (lead.mensajes_leidos || 0) === 0) return 'ignored'
  }
  return 'pending'
}

async function getAllCampaignsMetrics(userId) {
  try {
    const campaignsSnapshot = await db.collection('campanias')
      .where('user_id', '==', userId)
      .get()

    const metrics = []
    for (const doc of campaignsSnapshot.docs) {
      const campaignMetrics = await getCampaignMetrics(userId, doc.id)
      if (campaignMetrics) metrics.push(campaignMetrics)
    }

    return metrics
  } catch (error) {
    console.error('Error getting all campaigns metrics:', error.message)
    return []
  }
}

module.exports = { getCampaignMetrics, getAllCampaignsMetrics }
