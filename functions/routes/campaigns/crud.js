const { admin, db } = require('../../config')

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

app.post('/campaigns/:campaignId/followups', async (req, res) => {
  try {
    const { followups } = req.body
    if (!followups || !Array.isArray(followups)) return res.status(400).json({ success: false, error: { message: 'followups array required' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ followups, fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/set-schedule', async (req, res) => {
  try {
    const { auto_scrape, scrape_schedule } = req.body
    await db.collection('campanias').doc(req.params.campaignId).update({ auto_scrape: auto_scrape || false, scrape_schedule: scrape_schedule || 'weekly', fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
