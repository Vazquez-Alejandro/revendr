const { admin, db, axios, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MP_ACCESS_TOKEN, emailTransporter, STRIPE_PRICES, PLAN_LIMITS } = require('../config')
const { sendTransactionalEmail, processApifyResults } = require('../helpers')

module.exports = function(app) {

app.post('/webhooks/apify', async (req, res) => {
  try {
    const { defaultDatasetId, campaignId, rubro } = req.body
    await processApifyResults(defaultDatasetId, campaignId, rubro || 'general')
    res.json({ success: true })
  } catch (error) {
    console.error('Error processing Apify webhook:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/webhook/stripe', async (req, res) => {
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY)
    const sig = req.headers['stripe-signature']
    let event
    try { event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, STRIPE_WEBHOOK_SECRET) }
    catch (err) { return res.status(400).json({ error: err.message }) }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const customerEmail = session.customer_details?.email
      const customerName = session.customer_details?.name
      const plan = session.metadata?.plan || 'starter'
      const leadId = session.metadata?.leadId
      let userId = null
      if (customerEmail) {
        try { const u = await admin.auth().getUserByEmail(customerEmail); userId = u.uid }
        catch (e) {
          const newUser = await admin.auth().createUser({ email: customerEmail, displayName: customerName || customerEmail.split('@')[0], password: Math.random().toString(36).slice(-12) + 'A1!' })
          userId = newUser.uid; await admin.auth().setCustomUserClaims(userId, { role: 'admin' })
        }
        const planCredits = { starter: { apify: 100, whatsapp: 1000, inmoxil: 50 }, growth: { apify: 1000, whatsapp: 10000, inmoxil: 500 }, enterprise: { apify: 999999, whatsapp: 999999, inmoxil: 999999 } }
        await db.collection('usuarios_admin').doc(userId).set({ email: customerEmail, nombre: customerName || customerEmail.split('@')[0], role: 'admin', plan, stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, api_credits: planCredits[plan] || planCredits.starter, permissions: ['campaigns', 'leads', 'settings', 'billing'], fecha_creacion: new Date(), activo: true }, { merge: true })
      }
      if (leadId) await db.collection('leads').doc(leadId).update({ estado_proceso: 'cliente_activo', user_id: userId, stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, fecha_pago: new Date(), fecha_actualizacion: new Date() })
    }
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const customer = await stripe.customers.retrieve(subscription.customer)
      if (customer.email) {
        try { const user = await admin.auth().getUserByEmail(customer.email); await db.collection('usuarios_admin').doc(user.uid).update({ stripe_subscription_status: subscription.status, fecha_actualizacion: new Date() }) }
        catch (err) { console.error('Error updating subscription:', err.message) }
      }
    }
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const email = invoice.customer_email || invoice.customer_details?.email
      if (email && emailTransporter) await sendTransactionalEmail(email, 'payment_failed').catch(() => {})
    }
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const customer = await stripe.customers.retrieve(subscription.customer)
      if (customer.email) {
        try { const user = await admin.auth().getUserByEmail(customer.email); await db.collection('usuarios_admin').doc(user.uid).update({ plan: 'inactive', activo: false, stripe_subscription_status: 'canceled', fecha_desactivacion: new Date() }); if (emailTransporter) await sendTransactionalEmail(customer.email, 'subscription_cancelled').catch(() => {}) }
        catch (err) { console.error('Error deactivating user:', err.message) }
      }
    }
    res.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, leadId, plan, userId, billing } = req.body
    if (!STRIPE_SECRET_KEY) return res.status(503).json({ success: false, error: { message: 'Stripe not configured' } })
    const stripe = require('stripe')(STRIPE_SECRET_KEY)
    const priceMap = STRIPE_PRICES[plan || 'growth']
    const billingCycle = billing === 'annual' ? 'annual' : 'monthly'
    const finalPriceId = priceId || priceMap?.[billingCycle]
    if (!finalPriceId) return res.status(400).json({ success: false, error: { message: 'Invalid plan or priceId required' } })
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', payment_method_types: ['card'], line_items: [{ price: finalPriceId, quantity: 1 }], success_url: `https://revendr-9add8.web.app/dashboard?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `https://revendr-9add8.web.app/pricing`, metadata: { leadId: leadId || '', plan: plan || 'growth', userId: userId || '' } })
    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error.message)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const usage = userData.usage || { leads: 0, demos: 0, messages: 0 }
    let trialEnd = null, trialDaysRemaining = 0
    const fechaCreacion = userData.fecha_creacion?.toDate?.() || null
    if (fechaCreacion) { trialEnd = new Date(fechaCreacion.getTime() + 14 * 24 * 60 * 60 * 1000); trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))) }
    res.json({ success: true, data: { plan, status: userData.stripe_subscription_status || 'active', billing: userData.billing || 'monthly', limits, usage, stripeCustomerId: userData.stripe_customer_id || null, stripeSubscriptionId: userData.stripe_subscription_id || null, currentPeriodEnd: userData.current_period_end || null, cancelAtPeriodEnd: userData.cancel_at_period_end || false, trialEnd: trialEnd?.toISOString() || null, trialDaysRemaining, hasSubscription: !!userData.stripe_subscription_id } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/subscription/change', async (req, res) => {
  try {
    const { userId, newPlan, billing } = req.body
    if (!userId || !newPlan) return res.status(400).json({ success: false, error: { message: 'userId and newPlan required' } })
    if (!STRIPE_SECRET_KEY) { await db.collection('usuarios').doc(userId).update({ plan: newPlan, billing: billing || 'monthly', plan_limits: PLAN_LIMITS[newPlan], fecha_actualizacion: new Date() }); return res.json({ success: true, data: { plan: newPlan, message: 'Plan updated (no Stripe)' } }) }
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    if (userData.stripe_subscription_id) {
      const stripe = require('stripe')(STRIPE_SECRET_KEY)
      const priceMap = STRIPE_PRICES[newPlan]
      const newPriceId = priceMap?.[(billing || userData.billing || 'monthly') === 'annual' ? 'annual' : 'monthly']
      if (newPriceId) await stripe.subscriptions.update(userData.stripe_subscription_id, { items: [{ price: newPriceId }], proration_behavior: 'create_prorations' })
    }
    await db.collection('usuarios').doc(userId).update({ plan: newPlan, billing: billing || 'monthly', plan_limits: PLAN_LIMITS[newPlan], fecha_actualizacion: new Date() })
    if (emailTransporter && userData.email) { const names = { starter: 'Starter', growth: 'Growth', enterprise: 'Enterprise' }; await sendTransactionalEmail(userData.email, 'plan_change', { newPlan: names[newPlan] || newPlan }).catch(() => {}) }
    res.json({ success: true, data: { plan: newPlan } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    if (STRIPE_SECRET_KEY && userData.stripe_subscription_id) { const stripe = require('stripe')(STRIPE_SECRET_KEY); await stripe.subscriptions.update(userData.stripe_subscription_id, { cancel_at_period_end: true }) }
    await db.collection('usuarios').doc(userId).update({ cancel_at_period_end: true, fecha_actualizacion: new Date() })
    res.json({ success: true, data: { message: 'Subscription will cancel at period end' } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/subscription/reactivate', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    const userData = userDoc.data()
    if (STRIPE_SECRET_KEY && userData.stripe_subscription_id) { const stripe = require('stripe')(STRIPE_SECRET_KEY); await stripe.subscriptions.update(userData.stripe_subscription_id, { cancel_at_period_end: false }) }
    await db.collection('usuarios').doc(userId).update({ cancel_at_period_end: false, fecha_actualizacion: new Date() })
    res.json({ success: true, data: { message: 'Subscription reactivated' } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

// Mercado Pago (preparado - no activo)
app.get('/mercadopago/config', async (req, res) => {
  res.json({ success: true, data: { configured: !!MP_ACCESS_TOKEN, status: MP_ACCESS_TOKEN ? 'active' : 'not_configured', plans: { starter: { name: 'Starter', price_usd: 29, features: ['100 leads/mes', '50 props.', '1000 mensajes WhatsApp'] }, growth: { name: 'Growth', price_usd: 79, features: ['500 leads/mes', '250 props.', '10000 mensajes WhatsApp', 'A/B Testing', 'Secuencia inteligente'] }, enterprise: { name: 'Enterprise', price_usd: 199, features: ['Ilimitado', 'White-label', 'API pública', 'Soporte prioritario'] } } } })
})

app.post('/mercadopago/create-preference', async (req, res) => {
  if (!MP_ACCESS_TOKEN) return res.status(503).json({ success: false, error: { message: 'Mercado Pago no configurado', code: 'MP_NOT_CONFIGURED' } })
  try {
    const { plan, email, userId } = req.body
    const plans = { starter: { title: 'Revendr Starter', price: 29 }, growth: { title: 'Revendr Growth', price: 79 }, enterprise: { title: 'Revendr Enterprise', price: 199 } }
    const selectedPlan = plans[plan]
    if (!selectedPlan) return res.status(400).json({ success: false, error: { message: 'Invalid plan' } })
    const response = await axios.post('https://api.mercadopago.com/checkout/preferences',
      { items: [{ title: selectedPlan.title, unit_price: selectedPlan.price, quantity: 1, currency_id: 'USD' }], payer: { email }, metadata: { plan, userId }, back_urls: { success: 'https://revendr-9add8.web.app/dashboard?payment=success', failure: 'https://revendr-9add8.web.app/pricing?payment=failure', pending: 'https://revendr-9add8.web.app/dashboard?payment=pending' }, auto_return: 'approved' },
      { headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } })
    res.json({ success: true, data: { init_point: response.data.init_point, id: response.data.id } })
  } catch (error) { console.error('MP error:', error.response?.data || error.message); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/mercadopago/webhook', async (req, res) => {
  if (!MP_ACCESS_TOKEN) return res.json({ received: true })
  try {
    const { type, data } = req.body
    if (type === 'payment' && data?.id) {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, { headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` } })
      const payment = response.data
      if (payment.status === 'approved' && payment.metadata?.userId) {
        await db.collection('usuarios_admin').doc(payment.metadata.userId).update({ plan: payment.metadata.plan || 'starter', activo: true, mp_payment_id: data.id, fecha_pago: new Date() }, { merge: true })
      }
    }
    res.json({ received: true })
  } catch (error) { console.error('MP webhook error:', error.message); res.json({ received: true }) }
})

}
