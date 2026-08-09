const { admin, db, PLAN_LIMITS, FIREBASE_APP_URL, TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID, ADMIN_EMAIL, emailTransporter } = require('../config')
const { sendSimpleEmail, sendTelegramMessage } = require('../helpers')
const lemonsqueezy = require('../services/lemonsqueezy')

module.exports = function(app) {

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, email, userId, billing } = req.body
    if (!plan || !email) return res.status(400).json({ success: false, error: { message: 'plan and email required' } })

    const checkout = await lemonsqueezy.createCheckout(plan, email, userId, { plan, billing: billing || 'monthly' })

    await db.collection('checkout_sessions').add({
      checkout_id: checkout.checkoutId,
      plan,
      billing: billing || 'monthly',
      email,
      user_id: userId,
      status: 'pending',
      created_at: new Date(),
    })

    res.json({ url: checkout.checkoutUrl, checkoutId: checkout.checkoutId })
  } catch (error) {
    console.error('Error creating checkout:', error.message)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/webhook/lemonsqueezy', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] || ''
    const body = req.body

    if (!lemonsqueezy.verifyWebhook(body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    await lemonsqueezy.handleWebhook(body)

    if (body.type === 'order_created' && body.attributes?.total) {
      const email = body.attributes.user_email
      const total = body.attributes.total
      if (email && ADMIN_EMAIL) {
        await sendSimpleEmail(ADMIN_EMAIL, `💰 Nuevo pago LemonSqueezy: $${total}`, `<p>Nuevo pago recibido via LemonSqueezy.<br>Email: ${email}<br>Monto: $${total}</p>`)
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error('LemonSqueezy webhook error:', error.message)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    if (userId !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })

    const userData = userDoc.data()
    const plan = userData.plan || 'starter'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    const usage = userData.usage || { leads: 0, propuestas: 0, messages: 0 }

    let trialEnd = null, trialDaysRemaining = 0
    const fechaCreacion = userData.fecha_creacion?.toDate?.() || null
    if (fechaCreacion) {
      trialEnd = new Date(fechaCreacion.getTime() + 14 * 24 * 60 * 60 * 1000)
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)))
    }

    res.json({
      success: true,
      data: {
        plan,
        status: userData.subscription_status || 'active',
        billing: userData.billing || 'monthly',
        limits,
        usage,
        subscriptionId: userData.lemonsqueezy_subscription_id || null,
        cancelAtPeriodEnd: userData.cancel_at_period_end || false,
        trialEnd: trialEnd?.toISOString() || null,
        trialDaysRemaining,
        hasSubscription: !!userData.lemonsqueezy_subscription_id,
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/subscription/change', async (req, res) => {
  try {
    const { userId, newPlan, billing } = req.body
    if (!userId || !newPlan) return res.status(400).json({ success: false, error: { message: 'userId and newPlan required' } })
    if (req.user?.uid !== userId && req.user?.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: { message: 'No autorizado' } })
    }

    await db.collection('usuarios').doc(userId).set({
      plan: newPlan,
      billing: billing || 'monthly',
      plan_limits: PLAN_LIMITS[newPlan],
      fecha_actualizacion: new Date(),
    }, { merge: true })

    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (userDoc.exists && userDoc.data().email && emailTransporter) {
      const names = { starter: 'Starter ($15)', growth: 'Growth ($39)', enterprise: 'Enterprise ($99)' }
      await sendSimpleEmail(userDoc.data().email, `Plan cambiado a ${names[newPlan] || newPlan}`, `<p>Tu plan ha sido cambiado a <strong>${names[newPlan] || newPlan}</strong>.</p>`)
    }

    res.json({ success: true, data: { plan: newPlan } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    if (req.user?.uid !== userId && req.user?.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: { message: 'No autorizado' } })
    }

    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ success: false, error: { message: 'User not found' } })

    const userData = userDoc.data()
    if (userData.lemonsqueezy_subscription_id) {
      await lemonsqueezy.cancelSubscription(userData.lemonsqueezy_subscription_id)
    }

    await db.collection('usuarios').doc(userId).set({
      cancel_at_period_end: true,
      fecha_actualizacion: new Date(),
    }, { merge: true })

    res.json({ success: true, data: { message: 'Subscription will cancel at period end' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/subscription/reactivate', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: { message: 'userId required' } })
    if (req.user?.uid !== userId && req.user?.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: { message: 'No autorizado' } })
    }

    await db.collection('usuarios').doc(userId).set({
      cancel_at_period_end: false,
      fecha_actualizacion: new Date(),
    }, { merge: true })

    res.json({ success: true, data: { message: 'Subscription reactivated' } })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        plans: [
          {
            id: 'starter',
            name: 'Starter',
            price: 29,
            features: ['100 leads/mes', '50 propuestas', '900 mensajes WhatsApp', '1 rubro'],
            variantId: lemonsqueezy.VARIANT_IDS.starter,
          },
          {
            id: 'growth',
            name: 'Growth',
            price: 79,
            popular: true,
            features: ['1,000 leads/mes', '500 propuestas', '3,000 mensajes WhatsApp', '3 rubros', 'A/B Testing'],
            variantId: lemonsqueezy.VARIANT_IDS.growth,
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            price: 199,
            features: ['Leads ilimitados', 'Propuestas ilimitadas', 'Mensajes ilimitados', 'Todos los rubros', 'White-label'],
            variantId: lemonsqueezy.VARIANT_IDS.enterprise,
          },
        ],
        storeUrl: `https://store${process.env.LEMONSQUEEZY_STORE_ID}.lemonsqueezy.com`,
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

}
