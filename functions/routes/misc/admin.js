const { admin, db, PLAN_LIMITS, GMAIL_USER, emailTransporter, FIREBASE_API_URL } = require('../../config')
const { sendTelegramMessage, sendSimpleEmail } = require('../../helpers')

module.exports = function(app) {

app.get('/admin/clients', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').orderBy('fecha_creacion', 'desc').get()
    const clients = snapshot.docs.map(doc => { const d = doc.data(); return { id: doc.id, email: d.email, nombre: d.nombre, empresa: d.empresa || '', plan: d.plan || 'starter', activo: d.activo !== false, emailVerified: d.emailVerified || false, onboarding_completed: d.onboarding_completed || false, fecha_creacion: d.fecha_creacion, last_login: d.last_login || null, usage: d.usage || { leads: 0, propuestas: 0, messages: 0 } } })
    res.json({ success: true, data: clients })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/admin/clients/:id', async (req, res) => {
  try {
    const doc = await db.collection('usuarios').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: { message: 'Client not found' } })
    res.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.patch('/admin/clients/:id', async (req, res) => {
  try {
    const { plan, activo, role, empresa } = req.body
    const updates = { fecha_actualizacion: new Date() }
    if (plan !== undefined) { updates.plan = plan; updates.plan_limits = PLAN_LIMITS[plan] }
    if (activo !== undefined) updates.activo = activo
    if (role !== undefined) updates.role = role
    if (empresa !== undefined) updates.empresa = empresa
    await db.collection('usuarios').doc(req.params.id).update(updates)
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/admin/clients/:id', async (req, res) => {
  try {
    await db.collection('usuarios').doc(req.params.id).update({ activo: false, fecha_desactivacion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/admin/migrate-ownership', async (req, res) => {
  try {
    const uid = req.user?.uid || req.body?.userId
    let migrated = { campaigns: 0, leads: 0, products: 0, crm_events: 0, revenue: 0 }
    for (const [col, countKey] of [['campanias', 'campaigns'], ['leads', 'leads'], ['productos', 'products'], ['crm_events', 'crm_events'], ['revenue', 'revenue']]) {
      const snap = await db.collection(col).where('user_id', '==', '').get()
      const batches = snap.docs.map(d => db.collection(col).doc(d.id).update({ user_id: uid }))
      await Promise.all(batches); migrated[countKey] += snap.size
    }
    res.json({ success: true, data: { message: 'Migration complete', migrated } })
  } catch (error) { console.error('Migration error:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const usage = userData.usage || { leads: 0, propuestas: 0, messages: 0 }
    const calcPct = (used, limit) => limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))
    res.json({ success: true, data: { plan, limits, usage, percentages: { leads: calcPct(usage.leads, limits.leads), propuestas: calcPct(usage.propuestas, limits.propuestas), messages: calcPct(usage.messages, limits.messages) } } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/usage/increment', async (req, res) => {
  try {
    const { userId, type, amount } = req.body
    if (!userId || !type) return res.status(400).json({ success: false, error: { message: 'userId and type required' } })
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    const limits = PLAN_LIMITS[userData.plan || 'starter'] || PLAN_LIMITS.starter
    const currentUsage = userData.usage || { leads: 0, propuestas: 0, messages: 0 }
    const increment = amount || 1
    if (limits[type] !== -1 && (currentUsage[type] || 0) + increment > limits[type]) return res.status(403).json({ success: false, error: { message: `Plan limit exceeded for ${type}` } })
    await db.collection('usuarios').doc(userId).update({ [`usage.${type}`]: (currentUsage[type] || 0) + increment })
    res.json({ success: true, data: { [type]: (currentUsage[type] || 0) + increment } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/whitelabel/config', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    const userDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (!userDoc.exists) return res.json({ success: true, data: { whitelabel: false } })
    const user = userDoc.data()
    res.json({ success: true, data: { whitelabel: user.whitelabel_enabled || false, custom_logo: user.custom_logo || null, custom_colors: user.custom_colors || null, custom_domain: user.custom_domain || null, custom_name: user.custom_app_name || 'Revendr', features: { remove_branding: user.whitelabel_enabled || false, custom_domain: user.whitelabel_enabled || false, custom_logo: user.whitelabel_enabled || false } } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/whitelabel/config', async (req, res) => {
  try {
    const { userId, custom_logo, custom_colors, custom_domain, custom_app_name } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    await db.collection('usuarios_admin').doc(userId).update({ whitelabel_enabled: true, custom_logo: custom_logo || null, custom_colors: custom_colors || null, custom_domain: custom_domain || null, custom_app_name: custom_app_name || 'Revendr', fecha_actualizacion: new Date() })
    res.json({ success: true, data: { message: 'White-label config updated' } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/test/send-demo-email', async (req, res) => {
  try {
    const { campaignId, email, chatId } = req.query
    if (!campaignId || (!email && !chatId)) return res.status(400).json({ success: false, error: { message: 'campaignId and email or chatId required' } })
    const campaignDoc = await db.collection('campanias').doc(campaignId).get()
    if (!campaignDoc.exists) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    const leadsSnapshot = await db.collection('leads').where('id_campania', '==', campaignId).where('estado_proceso', '==', 'propuesta_generada').get()
    const propuestaLinks = []
    for (const leadDoc of leadsSnapshot.docs) { const lead = leadDoc.data(); if (lead.url_propuesta) propuestaLinks.push({ nombre: lead.nombre_negocio, url: lead.url_propuesta }) }
    if (propuestaLinks.length === 0) return res.json({ success: true, data: { sent: false, reason: 'no_propuesta_links_found' } })
    if (chatId) {
      let text = `<b>🎯 Propuestas generadas - ${campaignDoc.data().nombre}</b>\n\n`
      for (const pl of propuestaLinks) text += `• <b>${pl.nombre}</b>\n${pl.url}\n\n`
      text += `——————\nCreado con Revendr`
      const result = await sendTelegramMessage(chatId, text)
      return res.json({ success: true, data: { sent: result.sent, provider: 'telegram', propuestas: propuestaLinks.length, chatId } })
    }
    let html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#6366f1">Test - Tus propuestas generadas</h1><p>Estas son las propuestas generadas para tu campaña <strong>${campaignDoc.data().nombre}</strong>:</p><ul>`
    for (const pl of propuestaLinks) html += `<li style="margin:12px 0"><strong>${pl.nombre}</strong><br><a href="${pl.url}" style="color:#6366f1">${pl.url}</a></li>`
    html += `</ul><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#94a3b8;font-size:12px">© 2026 Revendr</p></div>`
    const result = await sendSimpleEmail(email, `Test: ${propuestaLinks.length} ${propuestaLinks.length === 1 ? 'propuesta generada' : 'propuestas generadas'}`, html)
    res.json({ success: true, data: { sent: result.sent, provider: result.provider, propuestas: propuestaLinks.length, email } })
  } catch (error) { console.error('Test email error:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
