const { admin, db, FIREBASE_APP_URL } = require('../config')
const { createPreference, getPayment, handleWebhook, PLAN_PRICES } = require('../services/mercadopago')

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
