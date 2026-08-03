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
    const { nombre, rubro_objetivo, mensaje_template, ciudad, provincia, producto_id } = req.body
    if (!nombre || !rubro_objetivo) {
      return res.status(400).json({ success: false, error: { message: 'Nombre y rubro requeridos' } })
    }
    let producto_nombre = null, producto_url_demo = null, producto_mensaje = null
    if (producto_id) {
      const prodDoc = await db.collection('productos').doc(producto_id).get()
      if (prodDoc.exists) {
        const p = prodDoc.data()
        producto_nombre = p.nombre
        producto_url_demo = p.url_demo
        producto_mensaje = p.mensaje_whatsapp
      }
    }
    const docRef = await db.collection('campanias').add({
      nombre, rubro_objetivo, ciudad: ciudad || '', provincia: provincia || '',
      mensaje_template: mensaje_template || '',
      producto_id: producto_id || null,
      producto_nombre, producto_url_demo, producto_mensaje,
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
    const doc = await db.collection('campanias').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (doc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })
    await db.collection('campanias').doc(req.params.id).update({ estado, fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.put('/campaigns/:id', async (req, res) => {
  try {
    const doc = await db.collection('campanias').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (doc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })
    const { nombre, rubro_objetivo, mensaje_template, ciudad, provincia, producto_id } = req.body
    const updates = { fecha_actualizacion: new Date() }
    if (nombre !== undefined) updates.nombre = nombre
    if (rubro_objetivo !== undefined) updates.rubro_objetivo = rubro_objetivo
    if (mensaje_template !== undefined) updates.mensaje_template = mensaje_template
    if (ciudad !== undefined) updates.ciudad = ciudad
    if (provincia !== undefined) updates.provincia = provincia
    if (producto_id !== undefined) updates.producto_id = producto_id
    await db.collection('campanias').doc(req.params.id).update(updates)
    res.json({ success: true, data: { id: req.params.id } })
  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.delete('/campaigns/:id', async (req, res) => {
  try {
    const doc = await db.collection('campanias').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (doc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })
    await db.collection('campanias').doc(req.params.id).delete()
    res.json({ success: true, data: { message: 'Campaign deleted' } })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:id/duplicate', async (req, res) => {
  try {
    const doc = await db.collection('campanias').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (doc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })
    const orig = doc.data()
    const newDoc = {
      ...orig,
      nombre: orig.nombre + ' (copia)',
      user_id: req.user.uid,
      estado: 'activa',
      fecha_inicio: new Date(),
      fecha_creacion: new Date(),
      leads_count: 0,
      propuestas_generadas: 0,
      mensajes_enviados: 0,
      total_revenue: 0,
      total_clients: 0,
    }
    delete newDoc.id
    const ref = await db.collection('campanias').add(newDoc)
    res.status(201).json({ success: true, data: { id: ref.id } })
  } catch (error) {
    console.error('Error duplicating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/campaigns/:campaignId/revenue', async (req, res) => {
  try {
    const { leadId, amount, currency, notes } = req.body
    if (!leadId || !amount) return res.status(400).json({ success: false, error: { message: 'leadId and amount required' } })
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (campaignDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
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
    if (campaignDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
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
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (campaignDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ followups, fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/campaigns/:campaignId/set-schedule', async (req, res) => {
  try {
    const { auto_scrape, scrape_schedule } = req.body
    const campaignDoc = await db.collection('campanias').doc(req.params.campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (campaignDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('campanias').doc(req.params.campaignId).update({ auto_scrape: auto_scrape || false, scrape_schedule: scrape_schedule || 'weekly', fecha_actualizacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
