const { db, admin, axios } = require('../config')

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1'

const VARIANT_IDS = {
  starter: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY || '1909651',
    annual: process.env.LEMONSQUEEZY_VARIANT_STARTER_ANNUAL || '1908831',
  },
  growth: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_GROWTH_MONTHLY || '1909680',
    annual: process.env.LEMONSQUEEZY_VARIANT_GROWTH_ANNUAL || '1908832',
  },
  enterprise: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY || '1909684',
    annual: process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE_ANNUAL || '1908834',
  },
}

const PLAN_NAMES = {
  starter: 'Revendr Starter',
  growth: 'Revendr Growth',
  enterprise: 'Revendr Enterprise',
}

const PLAN_PRICES = {
  starter: 29,
  growth: 79,
  enterprise: 199,
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.lemonsqueezy.v1+json',
  }
}

async function createCheckout(plan, email, userId, metadata = {}) {
  const billing = metadata.billing || 'monthly'
  const variantId = VARIANT_IDS[plan]?.[billing]
  if (!variantId) throw new Error('Invalid plan or billing period')

  const response = await axios.post(
    `${LEMONSQUEEZY_API_URL}/checkouts`,
    {
      data: {
        type: 'checkouts',
        attributes: {
          product_id: parseInt(variantId),
          custom_price: null,
          checkout_data: {
            email: email || '',
            custom: {
              user_id: userId || '',
              plan: plan,
              ...metadata,
            },
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: LEMONSQUEEZY_STORE_ID,
            },
          },
        },
      },
    },
    { headers: getHeaders() }
  )

  return {
    checkoutId: response.data.data.id,
    checkoutUrl: response.data.data.attributes.url,
    expiresAt: response.data.data.attributes.expires_at,
  }
}

async function getSubscription(subscriptionId) {
  const response = await axios.get(
    `${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`,
    { headers: getHeaders() }
  )
  return response.data.data
}

async function cancelSubscription(subscriptionId) {
  const response = await axios.delete(
    `${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`,
    { headers: getHeaders() }
  )
  return response.data
}

async function getOrders(email) {
  const response = await axios.get(
    `${LEMONSQUEEZY_API_URL}/orders?filter[email]=${encodeURIComponent(email)}`,
    { headers: getHeaders() }
  )
  return response.data.data
}

function verifyWebhook(body, signature) {
  const crypto = require('crypto')
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''
  if (!secret) return true

  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(JSON.stringify(body)).digest('hex')
  return digest === signature
}

async function handleWebhook(event) {
  const { type, attributes } = event

  switch (type) {
    case 'subscription_created':
    case 'subscription_updated': {
      const email = attributes.user_email
      const plan = attributes.metadata?.plan
      const userId = attributes.metadata?.user_id
      const billing = attributes.metadata?.billing || 'monthly'

      if (email && plan) {
        try {
          const userRecord = await admin.auth().getUserByEmail(email).catch(() => null)
          const uid = userId || userRecord?.uid

          if (uid) {
            const updates = {
              plan,
              billing,
              plan_limits: require('../config').PLAN_LIMITS[plan] || require('../config').PLAN_LIMITS.starter,
              lemonsqueezy_subscription_id: event.data?.id,
              lemonsqueezy_customer_email: email,
              subscription_status: attributes.status,
              fecha_actualizacion: new Date(),
            }

            if (attributes.status === 'active') {
              updates.activo = true
              updates.fecha_pago = new Date()
            }

            if (attributes.status === 'cancelled' || attributes.status === 'expired') {
              updates.activo = false
              updates.fecha_desactivacion = new Date()
            }

            await db.collection('usuarios').doc(uid).set(updates, { merge: true })
            await db.collection('usuarios_admin').doc(uid).set(updates, { merge: true })
          }
        } catch (error) {
          console.error('Error updating subscription:', error.message)
        }
      }
      break
    }

    case 'subscription_cancelled': {
      const email = attributes.user_email
      if (email) {
        try {
          const userRecord = await admin.auth().getUserByEmail(email)
          await db.collection('usuarios').doc(userRecord.uid).set({
            plan: 'inactive',
            activo: false,
            subscription_status: 'cancelled',
            fecha_desactivacion: new Date(),
          }, { merge: true })
          await db.collection('usuarios_admin').doc(userRecord.uid).set({
            plan: 'inactive',
            activo: false,
            subscription_status: 'cancelled',
            fecha_desactivacion: new Date(),
          }, { merge: true })
        } catch (error) {
          console.error('Error cancelling subscription:', error.message)
        }
      }
      break
    }

    case 'order_created': {
      const email = attributes.user_email
      const total = attributes.total
      const plan = attributes.metadata?.plan

      if (email && plan) {
        try {
          const userRecord = await admin.auth().getUserByEmail(email).catch(() => null)
          if (userRecord) {
            await db.collection('usuarios').doc(userRecord.uid).set({
              plan,
              activo: true,
              fecha_pago: new Date(),
              monto_pagado: total,
            }, { merge: true })
            await db.collection('usuarios_admin').doc(userRecord.uid).set({
              plan,
              activo: true,
              fecha_pago: new Date(),
              monto_pagado: total,
            }, { merge: true })
          }
        } catch (error) {
          console.error('Error processing order:', error.message)
        }
      }
      break
    }
  }
}

module.exports = {
  createCheckout,
  getSubscription,
  cancelSubscription,
  getOrders,
  verifyWebhook,
  handleWebhook,
  VARIANT_IDS,
  PLAN_NAMES,
  PLAN_PRICES,
}
