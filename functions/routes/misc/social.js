const { db, RESEND_API_KEY, FIREBASE_APP_URL } = require('../../config')
const { sendEmail } = require('../../helpers')

module.exports = function(app) {

app.get('/social/config', async (req, res) => {
  res.json({ success: true, data: { instagram: { configured: false, note: 'Necesita Facebook Business Manager token' }, facebook: { configured: false, note: 'Necesita Facebook App ID y token' } } })
})

app.post('/social/publish', async (req, res) => {
  const { platform } = req.body
  res.json({ success: false, error: { message: `Publicación en ${platform} no disponible aún.`, code: 'SOCIAL_NOT_CONFIGURED' } })
})

app.post('/social/ad-campaign', async (req, res) => {
  const { platform } = req.body
  res.json({ success: false, error: { message: `Campaña publicitaria en ${platform} no disponible aún.`, code: 'ADS_NOT_CONFIGURED' } })
})

app.get('/owner/dashboard/:productId', async (req, res) => {
  try {
    const productDoc = await db.collection('productos').doc(req.params.productId).get()
    if (!productDoc.exists) return res.status(404).json({ success: false, error: { message: 'Product not found' } })
    const product = productDoc.data()
    const campaignsSnapshot = await db.collection('campanias').where('producto_id', '==', req.params.productId).get()
    let totalLeads = 0, qualifiedLeads = 0, messagesSent = 0, totalRevenue = 0, activeCampaigns = 0
    const campaignIds = []
    campaignsSnapshot.docs.forEach(doc => { const c = doc.data(); campaignIds.push(doc.id); totalLeads += c.leads_count || 0; messagesSent += c.mensajes_enviados || 0; totalRevenue += c.total_revenue || 0; if (c.estado === 'activa') activeCampaigns++ })
    if (campaignIds.length > 0) {
      const leadsSnapshot = await db.collection('leads').where('id_campania', 'in', campaignIds.slice(0, 10)).get()
      leadsSnapshot.docs.forEach(doc => { if ((doc.data().lead_score || 0) >= 50) qualifiedLeads++ })
    }
    const viewsSnapshot = await db.collection('landing_views').where('product_id', '==', req.params.productId).get()
    const engagementSnapshot = await db.collection('landing_engagement').where('product_id', '==', req.params.productId).get()
    let totalClicks = 0, totalTime = 0
    engagementSnapshot.docs.forEach(doc => { const e = doc.data(); if (e.event_type === 'cta_click') totalClicks++; if (e.event_type === 'time_on_page') totalTime += e.data?.seconds || 0 })
    res.json({ success: true, data: { product: { id: req.params.productId, ...product }, stats: { totalCampaigns: campaignsSnapshot.size, activeCampaigns, totalLeads, qualifiedLeads, messagesSent, totalRevenue, landingViews: viewsSnapshot.size, ctaClicks: totalClicks, avgTimeOnPage: viewsSnapshot.size > 0 ? (totalTime / viewsSnapshot.size).toFixed(1) : 0, conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0 } } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/chat/message', async (req, res) => {
  try {
    const { visitorId, message, visitorName, visitorEmail, productId } = req.body
    if (!message) return res.status(400).json({ success: false, error: { message: 'message required' } })
    const chatMsg = { visitor_id: visitorId || `visitor_${Date.now()}`, visitor_name: visitorName || 'Visitante', visitor_email: visitorEmail || '', message, product_id: productId || null, status: 'unread', timestamp: new Date() }
    await db.collection('chat_messages').add(chatMsg)
    if (productId) {
      const productDoc = await db.collection('productos').doc(productId).get()
      if (productDoc.exists) {
        const product = productDoc.data()
        const ownerDoc = await db.collection('usuarios_admin').doc(product.user_id).get()
        if (ownerDoc.exists && ownerDoc.data().email && RESEND_API_KEY) await sendEmail(ownerDoc.data().email, `Nuevo mensaje de chat - ${visitorName}`, `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#0ea5e9;">💬 Nuevo mensaje de chat</h2><p><strong>${visitorName}</strong> (${visitorEmail || 'sin email'}) te escribió:</p><div style="background:#1e293b;padding:15px;border-radius:8px;margin:15px 0;"><p style="color:#e2e8f0;">${message}</p></div><p><a href="${FIREBASE_APP_URL}/dashboard" style="color:#0ea5e9;">Responder en el dashboard</a></p></div>`)
      }
    }
    res.json({ success: true, data: { id: chatMsg.visitor_id } })
  } catch (error) { console.error('Error sending chat message:', error); res.json({ success: true }) }
})

app.get('/chat/messages', async (req, res) => {
  try {
    const { productId, status } = req.query
    let query = db.collection('chat_messages').orderBy('timestamp', 'desc')
    if (productId) query = query.where('product_id', '==', productId)
    if (status) query = query.where('status', '==', status)
    const snapshot = await query.limit(100).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/chat/reply', async (req, res) => {
  try {
    const { messageId, reply } = req.body
    await db.collection('chat_messages').doc(messageId).update({ reply, status: 'replied', replied_at: new Date() })
    const msgDoc = await db.collection('chat_messages').doc(messageId).get()
    if (msgDoc.exists && msgDoc.data().visitor_email && RESEND_API_KEY) {
      const msg = msgDoc.data()
      await sendEmail(msg.visitor_email, 'Respuesta de Revendr', `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#0ea5e9;">Tu mensaje fue respondido</h2><p>Hola ${msg.visitor_name},</p><div style="background:#1e293b;padding:15px;border-radius:8px;margin:15px 0;"><p style="color:#e2e8f0;">${reply}</p></div></div>`)
    }
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
