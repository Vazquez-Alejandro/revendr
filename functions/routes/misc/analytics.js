const { db, PLAN_LIMITS } = require('../../config')

module.exports = function(app) {

app.get('/stats/dashboard', async (req, res) => {
  try {
    const [campaignsSnap, leadsSnap] = await Promise.all([db.collection('campanias').get(), db.collection('leads').get()])
    let activeCampaigns = 0, propuestasGeneradas = 0, clientesActivos = 0
    campaignsSnap.docs.forEach(doc => { if (doc.data().estado === 'activa') activeCampaigns++ })
    leadsSnap.docs.forEach(doc => { const l = doc.data(); if (l.estado_proceso === 'propuesta_generada') propuestasGeneradas++; if (l.estado_proceso === 'cliente_activo') clientesActivos++ })
    res.json({ success: true, data: { totalCampaigns: campaignsSnap.size, activeCampaigns, totalLeads: leadsSnap.size, propuestasGeneradas, clientesActivos, conversionRate: leadsSnap.size > 0 ? ((clientesActivos / leadsSnap.size) * 100).toFixed(1) : 0 } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/stats/products', async (req, res) => {
  try {
    const [productsSnapshot, campaignsSnapshot, leadsSnapshot] = await Promise.all([db.collection('productos').get(), db.collection('campanias').get(), db.collection('leads').get()])
    const statsByProduct = {}
    productsSnapshot.docs.forEach(doc => { statsByProduct[doc.id] = { nombre: doc.data().nombre, nicho: doc.data().nicho, totalCampaigns: 0, activeCampaigns: 0, totalLeads: 0, qualifiedLeads: 0, propuestasGenerated: 0, messagesSent: 0, clients: 0, totalRevenue: 0 } })
    campaignsSnapshot.docs.forEach(doc => { const c = doc.data(); if (c.producto_id && statsByProduct[c.producto_id]) { statsByProduct[c.producto_id].totalCampaigns++; if (c.estado === 'activa') statsByProduct[c.producto_id].activeCampaigns++; statsByProduct[c.producto_id].messagesSent += c.mensajes_enviados || 0; statsByProduct[c.producto_id].totalRevenue += c.total_revenue || 0 } })
    const campaignProductMap = {}
    campaignsSnapshot.docs.forEach(doc => { if (doc.data().producto_id) campaignProductMap[doc.id] = doc.data().producto_id })
    leadsSnapshot.docs.forEach(doc => { const lead = doc.data(); const pid = campaignProductMap[lead.id_campania]; if (pid && statsByProduct[pid]) { statsByProduct[pid].totalLeads++; if ((lead.lead_score || 0) >= 50) statsByProduct[pid].qualifiedLeads++; if (lead.estado_proceso === 'propuesta_generada') statsByProduct[pid].propuestasGenerated++; if (lead.estado_proceso === 'mensaje_enviado') statsByProduct[pid].messagesSent++; if (lead.estado_proceso === 'cliente_activo') statsByProduct[pid].clients++ } })
    res.json({ success: true, data: statsByProduct })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/analytics/predictions/:campaignId', async (req, res) => {
  try {
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const campaign = campaignDoc.data()
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', req.params.campaignId).get()
    let totalLeads = leadsSnapshot.size, hotLeads = 0, warmLeads = 0, coldLeads = 0, avgScore = 0, totalScore = 0, engaged = 0, converted = 0
    leadsSnapshot.docs.forEach(doc => { const lead = doc.data(); const score = lead.lead_score || 0; totalScore += score; if (lead.temperatura === 'hot') hotLeads++; else if (lead.temperatura === 'warm') warmLeads++; else coldLeads++; if (lead.cta_clicks > 0 || lead.landing_views > 0) engaged++; if (lead.estado_proceso === 'cliente_activo') converted++ })
    avgScore = totalLeads > 0 ? (totalScore / totalLeads).toFixed(1) : 0
    const engagementRate = totalLeads > 0 ? ((engaged / totalLeads) * 100).toFixed(1) : 0
    const currentConversion = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0
    const predictedConversion = Math.min(parseFloat(currentConversion) + (hotLeads * 2.5) + (engagementRate * 0.3), 100).toFixed(1)
    const predictedRevenue = campaign.leads_count > 0 ? ((predictedConversion / 100) * campaign.leads_count * 50).toFixed(0) : 0
    const recommendedActions = []
    if (hotLeads > 0 && campaign.mensajes_enviados < campaign.leads_count * 0.5) recommendedActions.push({ action: 'send_more_messages', priority: 'high', message: `Hay ${hotLeads} leads hot sin mensaje. Enviá ahora.` })
    if (parseFloat(engagementRate) < 10) recommendedActions.push({ action: 'improve_message', priority: 'medium', message: 'Tasa de engagement baja. Probá A/B testing.' })
    if (coldLeads > hotLeads * 3) recommendedActions.push({ action: 'requalify', priority: 'low', message: 'Muchos leads fríos. Considerá recalificar.' })
    res.json({ success: true, data: { current: { totalLeads, hotLeads, warmLeads, coldLeads, avgScore, engagementRate: parseFloat(engagementRate), conversionRate: parseFloat(currentConversion) }, predictions: { predictedConversion: parseFloat(predictedConversion), predictedRevenue: parseInt(predictedRevenue), confidence: Math.min(60 + (totalLeads * 0.5), 95).toFixed(0), timeframe: '30 días' }, recommendedActions } })
  } catch (error) { console.error('Error generating predictions:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/analytics/trends', async (req, res) => {
  try {
    const leadsSnapshot = await db.collection('leads').orderBy('fecha_creacion', 'desc').limit(500).get()
    const dailyData = {}
    leadsSnapshot.docs.forEach(doc => { const lead = doc.data(); const date = lead.fecha_creacion?.toDate?.(); if (date) { const key = date.toISOString().split('T')[0]; if (!dailyData[key]) dailyData[key] = { leads: 0, qualified: 0, converted: 0, totalScore: 0 }; dailyData[key].leads++; if ((lead.lead_score || 0) >= 50) dailyData[key].qualified++; if (lead.estado_proceso === 'cliente_activo') dailyData[key].converted++; dailyData[key].totalScore += lead.lead_score || 0 } })
    const trends = Object.entries(dailyData).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, data]) => ({ date, leads: data.leads, qualified: data.qualified, converted: data.converted, avgScore: data.leads > 0 ? (data.totalScore / data.leads).toFixed(1) : 0 }))
    res.json({ success: true, data: trends })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/client/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const [userDoc, campaignsSnap, leadsSnap] = await Promise.all([db.collection('usuarios').doc(userId).get(), db.collection('campanias').where('user_id', '==', userId).get(), db.collection('leads').where('user_id', '==', userId).get()])
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data(); const plan = userData.plan || 'starter'; const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter; const usage = userData.usage || { leads: 0, propuestas: 0, messages: 0 }
    let activeCampaigns = 0, totalPropuestas = 0, qualifiedLeads = 0, messagesSent = 0, totalRevenue = 0
    campaignsSnap.docs.forEach(doc => { if (doc.data().estado === 'activa') activeCampaigns++ })
    leadsSnap.docs.forEach(doc => { const l = doc.data(); if (l.estado_proceso === 'propuesta_generada') totalPropuestas++; if ((l.lead_score || 0) >= 60) qualifiedLeads++; if (l.mensaje_enviado) messagesSent++; totalRevenue += l.revenue || 0 })
    res.json({ success: true, data: { plan, limits, usage, stats: { totalCampaigns: campaignsSnap.size, activeCampaigns, totalLeads: leadsSnap.size, totalPropuestas, qualifiedLeads, messagesSent, totalRevenue, conversionRate: leadsSnap.size > 0 ? ((qualifiedLeads / leadsSnap.size) * 100).toFixed(1) : 0 } } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
