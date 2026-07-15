const { db, axios, getWhatsAppConfig, checkPlanLimit } = require('../../config')
const whatsappService = require('../../services/whatsapp')
const warmup = require('../../services/warmup')
const { logMessage, getMessageHistory, getMessageStats } = require('../../services/message-log')

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
    const { to, message, leadId, campaignId } = req.body
    if (!to || !message) return res.status(400).json({ success: false, error: { message: 'to and message required' } })

    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: `Message limit reached (${limitCheck.limit}/month). Upgrade your plan.`, code: 'PLAN_LIMIT_REACHED' } })

    const { shouldPauseSending, isBusinessHours, canSendToday } = require('../../services/warmup')
    const pauseCheck = await shouldPauseSending(req.user.uid)
    if (pauseCheck.pause) {
      return res.status(403).json({ success: false, error: { message: pauseCheck.reason || pauseCheck.warning, code: 'QUALITY_PAUSED' } })
    }

    if (!isBusinessHours()) {
      return res.status(403).json({ success: false, error: { message: 'Fuera de horario laboral (9:00 - 20:00). Intentá en horario hábil.', code: 'OUTSIDE_BUSINESS_HOURS' } })
    }

    const result = await whatsappService.sendMessage(req.user.uid, to, message)
    await require('../../config').incrementUsage(req.user.uid, 'messages', 1)

    await logMessage({
      userId: req.user.uid,
      leadId: leadId || null,
      channel: 'whatsapp',
      message,
      status: 'sent',
      recipient: to,
      campaignId: campaignId || null,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('WhatsApp send error:', error)

    await logMessage({
      userId: req.user.uid,
      leadId: req.body?.leadId || null,
      channel: 'whatsapp',
      message: req.body?.message || '',
      status: 'failed',
      recipient: req.body?.to || '',
    }).catch(() => {})

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

    const warmup = require('../../services/warmup')

    const pauseCheck = await warmup.shouldPauseSending(req.user.uid)
    if (pauseCheck.pause) {
      return res.status(403).json({ success: false, error: { message: pauseCheck.reason || pauseCheck.warning, code: 'QUALITY_PAUSED' } })
    }

    if (!warmup.isBusinessHours()) {
      return res.status(403).json({ success: false, error: { message: 'Fuera de horario laboral (9:00 - 20:00). Intentá en horario hábil.', code: 'OUTSIDE_BUSINESS_HOURS' } })
    }

    const { getEligibleLeadsForSending } = require('../../services/engagement')
    const eligible = await getEligibleLeadsForSending(req.user.uid)

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
        const delay = warmup.getRandomDelay()
        await new Promise(r => setTimeout(r, delay * 1000))
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

app.post('/whatsapp/generate-message', async (req, res) => {
  try {
    const { leadId, leadIds, productContext, tone, useAI } = req.body

    const { generatePersonalizedMessage, generateBulkMessages } = require('../../services/ai-message')

    if (leadId) {
      const leadDoc = await db.collection('leads').doc(leadId).get()
      if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
      const lead = { id: leadDoc.id, ...leadDoc.data() }
      const message = await generatePersonalizedMessage(lead, { productContext, tone, useAI })
      return res.json({ success: true, data: { leadId, message } })
    }

    if (leadIds && Array.isArray(leadIds)) {
      const leads = []
      for (const id of leadIds) {
        const doc = await db.collection('leads').doc(id).get()
        if (doc.exists) leads.push({ id: doc.id, ...doc.data() })
      }
      const results = await generateBulkMessages(leads, { productContext, tone, useAI })
      return res.json({ success: true, data: results })
    }

    res.status(400).json({ success: false, error: { message: 'leadId or leadIds required' } })
  } catch (error) {
    console.error('Error generating message:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/messages', async (req, res) => {
  try {
    const { leadId, channel, limit } = req.query
    const messages = await getMessageHistory(req.user.uid, {
      leadId,
      channel,
      limit: parseInt(limit) || 50,
    })
    res.json({ success: true, data: messages })
  } catch (error) {
    console.error('Error getting messages:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/messages/stats', async (req, res) => {
  try {
    const stats = await getMessageStats(req.user.uid)
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error getting message stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/reengaged', async (req, res) => {
  try {
    const { getReengagedLeads, markEngagementChecked } = require('../../services/engagement')
    const reengaged = await getReengagedLeads(req.user.uid)
    await markEngagementChecked(req.user.uid)
    res.json({ success: true, data: reengaged })
  } catch (error) {
    console.error('Error checking re-engaged leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/followup/leads', async (req, res) => {
  try {
    const { getLeadsNeedingFollowup } = require('../../services/followup')
    const leads = await getLeadsNeedingFollowup(req.user.uid)
    res.json({ success: true, data: leads })
  } catch (error) {
    console.error('Error getting followup leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/followup/:leadId', async (req, res) => {
  try {
    const { getFollowupStatus } = require('../../services/followup')
    const status = await getFollowupStatus(req.user.uid, req.params.leadId)
    if (!status) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    res.json({ success: true, data: status })
  } catch (error) {
    console.error('Error getting followup status:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/followup/send', async (req, res) => {
  try {
    const { leadId, message } = req.body
    if (!leadId || !message) return res.status(400).json({ success: false, error: { message: 'leadId and message required' } })

    const { recordFollowupAttempt } = require('../../services/followup')
    const { logMessage } = require('../../services/message-log')

    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: 'Message limit reached', code: 'PLAN_LIMIT_REACHED' } })

    const leadDoc = await db.collection('leads').doc(leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    if (lead.user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })

    await whatsappService.sendMessage(req.user.uid, lead.telefono_whatsapp, message)
    await require('../../config').incrementUsage(req.user.uid, 'messages', 1)
    await recordFollowupAttempt(req.user.uid, leadId)

    await logMessage({
      userId: req.user.uid,
      leadId,
      channel: 'whatsapp',
      message,
      status: 'sent',
      recipient: lead.telefono_whatsapp,
    })

    res.json({ success: true, data: { sent: true } })
  } catch (error) {
    console.error('Error sending followup:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/reengagement/triggers', async (req, res) => {
  try {
    const { checkAndTriggerReengagement } = require('../../services/reengagement')
    const triggers = await checkAndTriggerReengagement(req.user.uid)
    res.json({ success: true, data: triggers })
  } catch (error) {
    console.error('Error checking re-engagement triggers:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/reengagement/send', async (req, res) => {
  try {
    const { leadId, message } = req.body
    if (!leadId || !message) return res.status(400).json({ success: false, error: { message: 'leadId and message required' } })

    const { markReengagementSent } = require('../../services/reengagement')
    const { logMessage } = require('../../services/message-log')

    const limitCheck = await checkPlanLimit(req.user.uid, 'messages')
    if (!limitCheck.allowed) return res.status(403).json({ success: false, error: { message: 'Message limit reached', code: 'PLAN_LIMIT_REACHED' } })

    const leadDoc = await db.collection('leads').doc(leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    if (lead.user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Access denied' } })

    await whatsappService.sendMessage(req.user.uid, lead.telefono_whatsapp, message)
    await require('../../config').incrementUsage(req.user.uid, 'messages', 1)
    await markReengagementSent(req.user.uid, leadId)

    await logMessage({
      userId: req.user.uid,
      leadId,
      channel: 'whatsapp',
      message,
      status: 'sent',
      recipient: lead.telefono_whatsapp,
    })

    res.json({ success: true, data: { sent: true } })
  } catch (error) {
    console.error('Error sending re-engagement:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

}
