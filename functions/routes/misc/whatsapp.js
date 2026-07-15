const { db, axios, getWhatsAppConfig, checkPlanLimit } = require('../../config')
const whatsappService = require('../../services/whatsapp')
const warmup = require('../../services/warmup')

module.exports = function(app) {

app.get('/whatsapp/config', async (req, res) => {
  try {
    const { provider, config: waConfig } = await whatsappService.getActiveProvider(req.user.uid)
    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')

    let baileysStatus = null
    if (provider === 'baileys' || req.body?.forceBaileys) {
      baileysStatus = await whatsappService.getBaileysStatus(req.user.uid)
    }

    const warmupStatus = await warmup.canSendToday(req.user.uid, limitCheck.plan)
    const quality = await warmup.getQualityScore(req.user.uid)

    res.json({
      success: true,
      data: {
        configured: provider !== null,
        provider: provider || 'none',
        status: provider === 'baileys' ? (baileysStatus?.status || 'disconnected') : (waConfig.status || 'not_configured'),
        phone_number_id: provider === 'meta' ? waConfig.phone_number_id : (baileysStatus?.phone || null),
        baileys_status: baileysStatus?.status || null,
        messages: {
          used: limitCheck.usage,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          plan: limitCheck.plan,
        },
        rateLimits: limitCheck.rateLimits || null,
        hourRemaining: limitCheck.hourRemaining,
        warmup: {
          day: warmupStatus.warmupDay,
          maxToday: warmupStatus.maxToday,
          dailyCount: warmupStatus.dailyCount,
          totalDays: warmupStatus.totalWarmupDays,
          isWarmingUp: warmupStatus.warmupDay <= warmupStatus.totalWarmupDays,
        },
        quality: {
          score: quality.score,
          level: quality.level,
        },
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/connect', async (req, res) => {
  try {
    const { phone_number_id, access_token } = req.body
    if (!phone_number_id || !access_token) return res.status(400).json({ success: false, error: { message: 'phone_number_id and access_token required' } })
    try {
      await axios.get(`https://graph.facebook.com/v18.0/${phone_number_id}`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      })
    } catch (err) {
      return res.status(400).json({ success: false, error: { message: 'Invalid credentials. Could not verify phone number with Meta API.' } })
    }
    await db.collection('usuarios').doc(req.user.uid).set({
      whatsapp_config: {
        phone_number_id,
        access_token,
        status: 'active',
        provider: 'meta',
        connected_at: new Date(),
      },
      fecha_actualizacion: new Date(),
    }, { merge: true })
    res.json({ success: true, data: { message: 'WhatsApp connected successfully', phone_number_id, provider: 'meta' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/connect-baileys', async (req, res) => {
  try {
    const result = await whatsappService.connectBaileys(req.user.uid)
    res.json({
      success: true,
      data: {
        status: result.status,
        message: result.status === 'connected' ? 'WhatsApp connected via Baileys' : 'Waiting for QR scan',
      }
    })
  } catch (error) {
    console.error('Baileys connect error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/qr', async (req, res) => {
  try {
    const qr = await whatsappService.getQR(req.user.uid)
    if (!qr) {
      const status = await whatsappService.getBaileysStatus(req.user.uid)
      return res.json({
        success: true,
        data: {
          qr: null,
          status: status.status,
          message: status.status === 'connected' ? 'Already connected' : 'No QR code available. Call connect-baileys first.',
        }
      })
    }
    res.json({ success: true, data: { qr, status: 'waiting_qr' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/baileys-status', async (req, res) => {
  try {
    const status = await whatsappService.getBaileysStatus(req.user.uid)
    res.json({ success: true, data: status })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { provider } = await whatsappService.getActiveProvider(req.user.uid)

    if (provider === 'baileys') {
      await whatsappService.disconnectBaileys(req.user.uid)
      return res.json({ success: true, data: { message: 'Baileys disconnected' } })
    }

    await db.collection('usuarios').doc(req.user.uid).update({
      'whatsapp_config.status': 'disconnected',
      'whatsapp_config.disconnected_at': new Date(),
      fecha_actualizacion: new Date(),
    })
    res.json({ success: true, data: { message: 'WhatsApp disconnected' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/send-text', async (req, res) => {
  try {
    const { to, message } = req.body
    if (!to || !message) return res.status(400).json({ success: false, error: { message: 'to and message required' } })

    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: `Message limit reached (${limitCheck.limit}/month). Upgrade your plan.`, code: 'PLAN_LIMIT_REACHED' } })

    const result = await whatsappService.sendMessage(req.user.uid, to, message)
    await require('../../config').incrementUsage(req.user.uid, 'messages', 1)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('WhatsApp send error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/send-template', async (req, res) => {
  try {
    const whatsappConfig = await getWhatsAppConfig(req.user.uid)
    if (!whatsappConfig.configured) return res.status(503).json({ success: false, error: { message: 'WhatsApp not configured. Go to Settings to connect.', code: 'WHATSAPP_NOT_CONFIGURED' } })
    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: `Message limit reached (${limitCheck.limit}/month). Upgrade your plan.`, code: 'PLAN_LIMIT_REACHED' } })
    const { to, templateName, languageCode, params } = req.body
    if (!to || !templateName) return res.status(400).json({ success: false, error: { message: 'to and templateName required' } })
    const components = params?.length > 0 ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : []
    const response = await axios.post(`https://graph.facebook.com/v18.0/${whatsappConfig.phoneId}/messages`, { messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: { name: templateName, language: { code: languageCode || 'es' }, ...(components.length > 0 && { components }) } }, { headers: { 'Authorization': `Bearer ${whatsappConfig.token}`, 'Content-Type': 'application/json' } })
    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) { console.error('WhatsApp template error:', error.response?.data || error.message); res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } }) }
})

app.get('/whatsapp/engagement', async (req, res) => {
  try {
    const { getLeadEngagementStatus } = require('../../services/engagement')
    const status = await getLeadEngagementStatus(req.user.uid)
    res.json({ success: true, data: status })
  } catch (error) {
    console.error('Error getting engagement status:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/eligible-leads', async (req, res) => {
  try {
    const { getEligibleLeadsForSending } = require('../../services/engagement')
    const leads = await getEligibleLeadsForSending(req.user.uid)
    res.json({ success: true, data: leads })
  } catch (error) {
    console.error('Error getting eligible leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/send-bulk', async (req, res) => {
  try {
    const { message } = req.body
    if (!message) return res.status(400).json({ success: false, error: { message: 'message required' } })

    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: `Monthly limit reached (${limitCheck.limit}). Upgrade your plan.`, code: 'PLAN_LIMIT_REACHED' } })

    const { getEligibleLeadsForSending } = require('../../services/engagement')
    const eligible = await getEligibleLeadsForSending(req.user.uid)

    const warmup = require('../../services/warmup')
    const warmupStatus = await warmup.canSendToday(req.user.uid, limitCheck.plan)
    const remaining = warmupStatus.maxToday - warmupStatus.dailyCount

    const toSend = eligible.slice(0, Math.min(remaining, limitCheck.remaining))

    if (toSend.length === 0) {
      return res.json({ success: true, data: { sent: 0, skipped: 0, reason: 'No eligible leads or daily limit reached' } })
    }

    let sent = 0
    let failed = 0
    const results = []

    for (const lead of toSend) {
      try {
        await whatsappService.sendMessage(req.user.uid, lead.telefono_whatsapp, message)
        await db.collection('leads').doc(lead.id).update({ fecha_envio_whatsapp: new Date(), estado_proceso: 'mensaje_enviado' })
        await incrementUsage(req.user.uid, 'messages', 1)
        await warmup.incrementDailyUsage(req.user.uid)
        sent++
        results.push({ leadId: lead.id, status: 'sent' })
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      } catch (err) {
        failed++
        results.push({ leadId: lead.id, status: 'failed', error: err.message })
      }
    }

    res.json({ success: true, data: { sent, failed, total: toSend.length, results } })
  } catch (error) {
    console.error('Bulk send error:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/check-reengagement', async (req, res) => {
  try {
    const { leads } = req.body
    if (!leads || !Array.isArray(leads)) return res.status(400).json({ success: false, error: { message: 'leads array required' } })
    const { checkReengagement } = require('../../services/engagement')
    const reengagements = await checkReengagement(req.user.uid, leads)
    res.json({ success: true, data: reengagements })
  } catch (error) {
    console.error('Error checking re-engagement:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

}
