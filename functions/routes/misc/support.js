const { admin, db, WHATSAPP_TOKEN, RESEND_API_KEY, STRIPE_SECRET_KEY, GMAIL_USER, emailTransporter } = require('../../config')
const { sendTransactionalEmail, autoScoreLead } = require('../../helpers')

module.exports = function(app) {

app.post('/support', async (req, res) => {
  try {
    const { category, subject, message, email } = req.body
    if (!category || !subject || !message || !email) return res.status(400).json({ success: false, error: { message: 'All fields required' } })
    await db.collection('support_tickets').add({ category, subject, message, email, status: 'open', created_at: new Date() })
    if (emailTransporter) {
      try { await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to: 'vazquezale82@gmail.com', subject: `[Revendr Soporte] ${subject}`, html: `<h2>Nuevo ticket de soporte</h2><p><strong>Categoría:</strong> ${category}</p><p><strong>Email:</strong> ${email}</p><p><strong>Asunto:</strong> ${subject}</p><p><strong>Mensaje:</strong></p><p>${message}</p>` }) }
      catch (e) { console.error('Error sending support email:', e) }
    }
    res.json({ success: true })
  } catch (error) { console.error('Error creating support ticket:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/landing/view', async (req, res) => {
  try {
    const { productId, leadId } = req.body
    if (!productId) return res.status(400).json({ success: false, error: { message: 'productId required' } })
    await db.collection('landing_views').add({ product_id: productId, lead_id: leadId || null, timestamp: new Date(), ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null })
    try {
      const productDoc = await db.collection('productos').doc(productId).get()
      if (productDoc.exists) {
        const product = productDoc.data()
        const ownerDoc = await db.collection('usuarios_admin').doc(product.user_id).get()
        if (ownerDoc.exists && ownerDoc.data().email && emailTransporter) {
          const lead = leadId ? await db.collection('leads').doc(leadId).get() : null
          const leadName = lead?.exists ? lead.data().nombre_negocio : 'Alguien'
          await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to: ownerDoc.data().email, subject: `${leadName} vio tu landing de ${product.nombre}`, html: `<h2>Alguien vio tu producto</h2><p><strong>${leadName}</strong> abrió la landing de <strong>${product.nombre}</strong>.</p><p>Es un buen momento para contactarlos.</p>` })
        }
      }
    } catch (e) { console.error('Email notification error:', e.message) }
    res.json({ success: true })
  } catch (error) { console.error('Error tracking view:', error); res.json({ success: true }) }
})

app.get('/landing/stats/:productId', async (req, res) => {
  try {
    const viewsSnapshot = await db.collection('landing_views').where('product_id', '==', req.params.productId).get()
    res.json({ success: true, data: { views: viewsSnapshot.size } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/landing/engagement', async (req, res) => {
  try {
    const { productId, leadId, eventType, data } = req.body
    if (!productId || !eventType) return res.status(400).json({ success: false, error: { message: 'productId and eventType required' } })
    await db.collection('landing_engagement').add({ product_id: productId, lead_id: leadId || null, event_type: eventType, data: data || {}, timestamp: new Date() })
    if (leadId) {
      const leadRef = db.collection('leads').doc(leadId)
      const leadDoc = await leadRef.get()
      if (leadDoc.exists) {
        const lead = leadDoc.data()
        const updates = { fecha_ultima_actividad: new Date(), fecha_actualizacion: new Date() }
        if (eventType === 'cta_click') updates.cta_clicks = (lead.cta_clicks || 0) + 1
        if (eventType === 'page_view') updates.landing_views = (lead.landing_views || 0) + 1
        if (eventType === 'time_on_page') updates.tiempo_total_landing = (lead.tiempo_total_landing || 0) + (data.seconds || 0)
        await leadRef.update(updates)
        if (typeof autoScoreLead === 'function') await autoScoreLead(leadId, { ...lead, ...updates })
      }
    }
    res.json({ success: true })
  } catch (error) { console.error('Error tracking engagement:', error); res.json({ success: true }) }
})

app.get('/status', async (req, res) => {
  try {
    const checks = { api: { status: 'operational', latency: 0 }, database: { status: 'operational', latency: 0 }, scraping: { status: 'operational', latency: 0 }, whatsapp: { status: WHATSAPP_TOKEN ? 'operational' : 'degraded', latency: 0 }, email: { status: RESEND_API_KEY ? 'operational' : 'degraded', latency: 0 }, stripe: { status: STRIPE_SECRET_KEY ? 'operational' : 'degraded', latency: 0 } }
    const dbStart = Date.now(); await db.collection('_health').doc('ping').set({ timestamp: new Date() }); checks.database.latency = Date.now() - dbStart
    res.json({ status: Object.values(checks).every(c => c.status === 'operational') ? 'operational' : 'degraded', updated: new Date().toISOString(), checks })
  } catch (error) { res.json({ status: 'major_outage', updated: new Date().toISOString(), checks: { api: { status: 'major_outage' }, database: { status: 'major_outage' } } }) }
})

app.post('/email/send', async (req, res) => {
  try {
    const { to, type, data } = req.body
    if (!to || !type) return res.status(400).json({ success: false, error: { message: 'to and type required' } })
    const result = await sendTransactionalEmail(to, type, data)
    res.json({ success: true, data: result })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/email/resend-verification', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, error: { message: 'Email required' } })
    if (!emailTransporter) return res.status(500).json({ success: false, error: { message: 'Email not configured' } })
    const verificationLink = await admin.auth().generateEmailVerificationLink(email)
    await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to: email, subject: 'Verificá tu email en Revendr', html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#6366f1">Verificá tu email</h1><p>Recibimos una solicitud para verificar tu email en Revendr.</p><div style="text-align:center;margin:24px 0"><a href="${verificationLink}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Verificar mi email</a></div><p style="color:#94a3b8;font-size:13px">Si el botón no funciona, copiá este link en tu navegador:<br>${verificationLink}</p><p style="color:#94a3b8;font-size:12px;margin-top:32px">© 2026 Revendr</p></div>` })
    res.json({ success: true })
  } catch (error) { console.error('Error resending verification:', error.message); res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
