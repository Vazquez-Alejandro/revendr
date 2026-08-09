const { admin, db, FIREBASE_APP_URL } = require('../config')
const { createPreference, getPayment, handleWebhook, PLAN_PRICES } = require('../services/mercadopago')
const crypto = require('crypto')

module.exports = function(app) {

  app.post('/mercadopago/create-preference', async (req, res) => {
    try {
      const { amount, title, description, plan, billing, userId, email, leadId, propuestaId } = req.body

      let items
      let externalReference

      if (plan) {
        const price = PLAN_PRICES[plan]?.[billing || 'monthly']
        if (!price) return res.status(400).json({ success: false, error: { message: 'Invalid plan or billing' } })
        items = [{ title: `Revendr ${plan} - ${billing === 'annual' ? 'Anual' : 'Mensual'}`, unit_price: price }]
        externalReference = `plan:${userId || req.user?.uid}:${plan}:${billing || 'monthly'}`
        if (!userId && !req.user) return res.status(401).json({ success: false, error: { message: 'Auth required' } })
      } else {
        if (!amount || !title) return res.status(400).json({ success: false, error: { message: 'amount and title required' } })
        items = [{ title, unit_price: parseFloat(amount) }]
        externalReference = `payment:${userId || req.user?.uid || 'anonymous'}`
      }

      const preference = await createPreference({
        items,
        externalReference,
        payerEmail: email || req.user?.email,
        description: description || title,
      })

      res.json({ success: true, data: { init_point: preference.init_point, preference_id: preference.id } })
    } catch (error) {
      console.error('Error creating MP preference:', error)
      res.status(500).json({ success: false, error: { message: error.message } })
    }
  })

  app.post('/mercadopago/webhook', async (req, res) => {
    try {
      // Verify webhook signature if secret is configured
      const webhookSecret = process.env.MP_WEBHOOK_SECRET
      if (webhookSecret) {
        const xSignature = req.headers['x-signature'] || ''
        if (!xSignature) {
          console.warn('MP webhook: missing X-Signature header')
          return res.status(401).json({ success: false, error: 'Missing signature' })
        }
        const parts = {}
        for (const pair of xSignature.split(',')) {
          const [k, v] = pair.split('=')
          if (k && v) parts[k.trim()] = v.trim()
        }
        const ts = parts.ts || ''
        const v1 = parts.v1 || ''
        if (!ts || !v1) {
          return res.status(401).json({ success: false, error: 'Invalid signature format' })
        }
        const dataId = req.query['data.id'] || req.body?.data?.id || ''
        const requestId = req.query['data.request_id'] || req.body?.data?.request_id || ''
        const verificationStr = `id:${dataId};request-id:${requestId};ts:${ts};`
        const expected = crypto.createHmac('sha256', webhookSecret).update(verificationStr).digest('hex')
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) {
          console.warn('MP webhook: invalid signature')
          return res.status(401).json({ success: false, error: 'Invalid signature' })
        }
      }

      await handleWebhook(req.body)
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error processing MP webhook:', error)
      res.status(200).json({ success: true })
    }
  })

  app.get('/mercadopago/success', async (req, res) => {
    const { payment_id, status, external_reference } = req.query
    if (payment_id && status === 'approved') {
      try { await handleWebhook({ type: 'payment', data: { id: payment_id } }) } catch (e) {}
    }
    res.redirect(`${FIREBASE_APP_URL}/dashboard/subscription?mp_status=${status || 'success'}`)
  })

  app.get('/mercadopago/failure', (req, res) => {
    res.redirect(`${FIREBASE_APP_URL}/dashboard/subscription?mp_status=failure`)
  })

  app.get('/mercadopago/pending', (req, res) => {
    res.redirect(`${FIREBASE_APP_URL}/dashboard/subscription?mp_status=pending`)
  })

  app.get('/mercadopago/public-key', async (req, res) => {
    try {
      const mp = require('../services/mercadopago')
      const client = mp.getClient()
      res.json({ success: true, data: { public_key: client?.options?.publicKey || '' } })
    } catch (error) {
      res.json({ success: true, data: { public_key: '' } })
    }
  })
}
