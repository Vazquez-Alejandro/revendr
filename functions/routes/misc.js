const { admin, db, axios, RESEND_API_KEY, GMAIL_USER, emailTransporter, WHATSAPP_TOKEN, PHONE_NUMBER_ID, TELEGRAM_BOT_TOKEN, MP_ACCESS_TOKEN, STRIPE_SECRET_KEY, PLAN_LIMITS } = require('../config')
const { createNotification, sendEmail, sendSimpleEmail, sendTransactionalEmail, sendTelegramMessage, calculateLeadScore, getTemperature, getScoreLabel } = require('../helpers')

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

app.get('/whatsapp/config', async (req, res) => {
  const configured = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID)
  res.json({ success: true, data: { configured, provider: configured ? 'Meta Cloud API' : 'none', phone_number_id: configured ? PHONE_NUMBER_ID : null, status: configured ? 'active' : 'not_configured' } })
})

app.post('/whatsapp/send-template', async (req, res) => {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return res.status(503).json({ success: false, error: { message: 'WhatsApp Business API no configurada', code: 'WHATSAPP_NOT_CONFIGURED' } })
  try {
    const { to, templateName, languageCode, params } = req.body
    if (!to || !templateName) return res.status(400).json({ success: false, error: { message: 'to and templateName required' } })
    const components = params?.length > 0 ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : []
    const response = await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: { name: templateName, language: { code: languageCode || 'es' }, ...(components.length > 0 && { components }) } }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } })
    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) { console.error('WhatsApp template error:', error.response?.data || error.message); res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } }) }
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

// ============ ADMIN PANEL ============

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

// ============ TEAM MANAGEMENT ============

app.post('/team/invite', async (req, res) => {
  try {
    const { ownerUserId, email, role } = req.body
    if (!ownerUserId || !email) return res.status(400).json({ success: false, error: { message: 'ownerUserId and email required' } })
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.collection('team_invites').doc(inviteId).set({ owner_user_id: ownerUserId, email, role: role || 'member', status: 'pending', created_at: new Date(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
    let emailSent = false
    if (emailTransporter) {
      try { await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to: email, subject: 'Invitación a un equipo en Revendr', html: `<p>Has sido invitado a un equipo en Revendr.</p><p>Haz click aquí para aceptar: <a href="https://revendr-9add8.web.app/team/accept?invite=${inviteId}">Aceptar invitación</a></p>` }); emailSent = true }
      catch (e) { console.error('Error sending invite email:', e.message) }
    }
    res.json({ success: true, data: { inviteId }, emailSent })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/team/members/:ownerUserId', async (req, res) => {
  try {
    const [membersSnap, invitesSnap] = await Promise.all([
      db.collection('team_members').where('owner_user_id', '==', req.params.ownerUserId).get(),
      db.collection('team_invites').where('owner_user_id', '==', req.params.ownerUserId).where('status', '==', 'pending').get(),
    ])
    res.json({ success: true, data: { members: membersSnap.docs.map(d => ({ id: d.id, ...d.data() })), pendingInvites: invitesSnap.docs.map(d => ({ id: d.id, ...d.data() })) } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/team/invite/accept', async (req, res) => {
  try {
    const { inviteId, ownerUserId, email, role } = req.body
    if (!inviteId || !ownerUserId || !email) return res.status(400).json({ success: false, error: { message: 'inviteId, ownerUserId, and email required' } })
    await db.collection('team_members').add({ owner_user_id: ownerUserId, email, role: role || 'member', status: 'active', created_at: new Date() })
    await db.collection('team_invites').doc(inviteId).update({ status: 'accepted' })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/team/invite/accept-link', async (req, res) => {
  try {
    const { inviteId } = req.body
    if (!inviteId) return res.status(400).json({ success: false, error: { message: 'inviteId required' } })
    const inviteDoc = await db.collection('team_invites').doc(inviteId).get()
    if (!inviteDoc.exists) return res.status(404).json({ success: false, error: { message: 'Invitación no encontrada' } })
    const invite = inviteDoc.data()
    if (invite.status !== 'pending') return res.status(400).json({ success: false, error: { message: 'Esta invitación ya fue procesada' } })
    if (invite.expires_at?.toDate?.() < new Date()) return res.status(400).json({ success: false, error: { message: 'Esta invitación expiró' } })
    await db.collection('team_members').add({ owner_user_id: invite.owner_user_id, email: invite.email, role: invite.role || 'member', status: 'active', created_at: new Date() })
    await db.collection('team_invites').doc(inviteId).update({ status: 'accepted' })
    res.json({ success: true, data: { email: invite.email } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/team/members/:memberId', async (req, res) => {
  try { await db.collection('team_members').doc(req.params.memberId).delete(); res.json({ success: true }) }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/team/invites/:inviteId', async (req, res) => {
  try { await db.collection('team_invites').doc(req.params.inviteId).delete(); res.json({ success: true }) }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

// ============ CLIENT DASHBOARD ============

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

// ============ API KEYS ============

app.post('/api-keys/generate', async (req, res) => {
  try {
    const { userId, name } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection('api_keys').doc(keyId).set({ user_id: userId, name: name || 'Default Key', active: true, created_at: new Date(), uses: 0 })
    res.json({ success: true, data: { api_key: keyId } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/api-keys/revoke', async (req, res) => {
  try {
    const { keyId } = req.body
    await db.collection('api_keys').doc(keyId).update({ active: false })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/api-keys/client/generate', async (req, res) => {
  try {
    const { userId, name } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection('api_keys').doc(keyId).set({ user_id: userId, name: name || 'Default Key', active: true, created_at: new Date(), uses: 0, last_used: null })
    res.json({ success: true, data: { api_key: keyId, name: name || 'Default Key' } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/api-keys/client/:userId', async (req, res) => {
  try {
    const snapshot = await db.collection('api_keys').where('user_id', '==', req.params.userId).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), api_key_preview: doc.id.slice(0, 12) + '...' })) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/api-keys/client/:keyId', async (req, res) => {
  try { await db.collection('api_keys').doc(req.params.keyId).update({ active: false }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

// ============ CRM ============

app.get('/crm/pipeline', async (req, res) => {
  try {
    const { campaignId } = req.query
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)
    const snapshot = await query.get()
    const pipeline = { nuevo: [], contactado: [], interesado: [], negociacion: [], cerrado: [], perdido: [] }
    snapshot.docs.forEach(doc => { const lead = doc.data(); const stage = lead.crm_stage || 'nuevo'; if (pipeline[stage]) pipeline[stage].push({ id: doc.id, ...lead }) })
    const stageOrder = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    const labels = { nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', negociacion: 'Negociación', cerrado: 'Cerrado', perdido: 'Perdido' }
    res.json({ success: true, data: { pipeline: stageOrder.map(s => ({ stage: s, label: labels[s], count: pipeline[s].length, leads: pipeline[s].slice(0, 10) })), total: snapshot.size } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/crm/leads/:leadId/stage', async (req, res) => {
  try {
    const { stage } = req.body
    const validStages = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    if (!validStages.includes(stage)) return res.status(400).json({ success: false, error: { message: 'Invalid stage' } })
    await db.collection('leads').doc(req.params.leadId).update({ crm_stage: stage, fecha_actualizacion: new Date() })
    await db.collection('crm_events').add({ lead_id: req.params.leadId, event_type: 'stage_change', new_stage: stage, description: `Cambio a ${({ nueo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', negociacion: 'Negociación', cerrado: 'Cerrado', perdido: 'Perdido' }[stage]) || stage}`, timestamp: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/crm/leads/:leadId/activity', async (req, res) => {
  try {
    const { type, description, value } = req.body
    await db.collection('crm_events').add({ lead_id: req.params.leadId, event_type: type || 'note', description: description || '', value: value || null, timestamp: new Date() })
    if (type === 'call') await db.collection('leads').doc(req.params.leadId).update({ llamadas_count: admin.firestore.FieldValue.increment(1), fecha_ultima_llamada: new Date() })
    if (type === 'meeting') await db.collection('leads').doc(req.params.leadId).update({ reuniones_count: admin.firestore.FieldValue.increment(1), fecha_ultima_reunion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/crm/leads/:leadId/timeline', async (req, res) => {
  try {
    const snapshot = await db.collection('crm_events').where('lead_id', '==', req.params.leadId).orderBy('timestamp', 'desc').limit(50).get()
    res.json({ success: true, data: snapshot.docs.map(doc => { const d = doc.data(); return { id: doc.id, ...d, timestamp: d.timestamp?.toDate?.()?.toISOString() || d.timestamp, edited_at: d.edited_at?.toDate?.()?.toISOString() || null } }) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.put('/crm/events/:eventId', async (req, res) => {
  try {
    const { description } = req.body
    if (!description) return res.status(400).json({ success: false, error: { message: 'Description is required' } })
    await db.collection('crm_events').doc(req.params.eventId).update({ description, edited_at: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/crm/events/:eventId', async (req, res) => {
  try { await db.collection('crm_events').doc(req.params.eventId).delete(); res.json({ success: true }) }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

// ============ CHAT ============

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
        if (ownerDoc.exists && ownerDoc.data().email && RESEND_API_KEY) await sendEmail(ownerDoc.data().email, `Nuevo mensaje de chat - ${visitorName}`, `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#0ea5e9;">💬 Nuevo mensaje de chat</h2><p><strong>${visitorName}</strong> (${visitorEmail || 'sin email'}) te escribió:</p><div style="background:#1e293b;padding:15px;border-radius:8px;margin:15px 0;"><p style="color:#e2e8f0;">${message}</p></div><p><a href="https://revendr-9add8.web.app/dashboard" style="color:#0ea5e9;">Responder en el dashboard</a></p></div>`)
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

// ============ OWNER PORTAL ============

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

// ============ CONTENT GENERATOR ============

app.post('/content/generate', async (req, res) => {
  try {
    const { productId, type, platform, customParams } = req.body
    let product = null
    if (productId) { const prodDoc = await db.collection('productos').doc(productId).get(); if (prodDoc.exists) product = prodDoc.data() }
    const templates = CONTENT_TEMPLATES[type] || CONTENT_TEMPLATES.launch
    const template = templates[Math.floor(Math.random() * templates.length)]
    const params = { producto: product?.nombre || customParams?.producto || 'nuestro producto', descripcion: product?.descripcion || customParams?.descripcion || 'una solución innovadora', url: product?.url_propuesta || customParams?.url || 'https://revendr-9add8.web.app', beneficio: customParams?.beneficio || 'multiplicar tus ventas', cliente: customParams?.cliente || 'un cliente satisfecho', testimonial: customParams?.testimonial || 'Es increíble', descuento: customParams?.descuento || '20%' }
    let content = template
    Object.entries(params).forEach(([k, v]) => { content = content.replace(new RegExp(`\\{${k}\\}`, 'g'), v) })
    const platformInfo = SOCIAL_PLATFORMS[platform] || SOCIAL_PLATFORMS.twitter
    if (content.length > platformInfo.maxChars) content = content.substring(0, platformInfo.maxChars - 3) + '...'
    const variations = templates.map(t => { let v = t; Object.entries(params).forEach(([k, val]) => { v = v.replace(new RegExp(`\\{${k}\\}`, 'g'), val) }); if (v.length > platformInfo.maxChars) v = v.substring(0, platformInfo.maxChars - 3) + '...'; return { text: v, charCount: v.length } })
    await db.collection('generated_content').add({ product_id: productId || null, type, platform, content, variations, params, timestamp: new Date() })
    res.json({ success: true, data: { content, variations, platform: platformInfo.name, charCount: content.length } })
  } catch (error) { console.error('Error generating content:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/content/history', async (req, res) => {
  try {
    const { productId } = req.query
    let query = db.collection('generated_content').orderBy('timestamp', 'desc')
    if (productId) query = query.where('product_id', '==', productId)
    const snapshot = await query.limit(50).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

// ============ SOCIAL / ANALYTICS ============

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

// ============ PUBLIC API ============

app.get('/api-docs', (req, res) => {
  res.json({ name: 'Revendr API', version: '1.0.0', description: 'API pública para integrar Revendr con tu sistema', baseUrl: 'https://us-central1-revendr-9add8.cloudfunctions.net/api', authentication: { type: 'API Key', header: 'x-api-key' }, endpoints: { leads: { 'GET /leads': 'Listar leads', 'GET /leads/stats': 'Estadísticas', 'POST /leads/score-all': 'Recalcular scores', 'POST /leads/:id/generate-message': 'Generar mensaje', 'POST /leads/:id/send-email': 'Enviar email', 'POST /leads/:id/send-whatsapp': 'Enviar WhatsApp' }, campaigns: { 'GET /campaigns': 'Listar campañas', 'POST /campaigns': 'Crear campaña', 'POST /campaigns/:id/scrape': 'Scraping', 'POST /campaigns/:id/process-demos': 'Generar propuestas', 'POST /campaigns/:id/send-messages': 'Enviar WhatsApp' } }, rateLimits: { default: '100 requests/min', scraping: '5 requests/min' } })
})

}

// Content templates
const CONTENT_TEMPLATES = {
  launch: ['Vengo curioseando {producto} hace unos días y la verdad me está gustando mucho. {descripcion}. Si te sirve, probalo acá → {url}', 'Hace un par de semanas arranqué con {producto} y ya no puedo vivir sin eso. {descripcion}. Te dejo el link → {url}', 'Nadie me pidió opinión igual voy a dejar esto acá: {producto} está buenísimo. {descripcion}. Link: {url}', 'Mirá lo que encontré. {producto}. {descripcion}. Link acá → {url}'],
  feature: ['Sabías que con {producto} podés {beneficio}? No es magia, es tecnología. {url}', 'Si hay algo que me cambió la forma de trabajar fue {producto}. Principalmente porque me permite {beneficio}. {url}', '{producto} te saca un montón de laburo de encima. {beneficio}. {url}'],
  testimonial: ['Hablando con {cliente} me contó que usa {producto} y no cambia más. {testimonial}. {url}', '{cliente} arrancó con {producto} hace unos meses. {testimonial}. {url}'],
  promo: ['Por tiempo limitado, {producto} tiene {descuento} de descuento. {url}', '{producto} está de oferta con un {descuento} off. {url}'],
}
const SOCIAL_PLATFORMS = { twitter: { maxChars: 280, name: 'Twitter/X' }, instagram: { maxChars: 2200, name: 'Instagram' }, linkedin: { maxChars: 3000, name: 'LinkedIn' }, facebook: { maxChars: 63206, name: 'Facebook' } }
