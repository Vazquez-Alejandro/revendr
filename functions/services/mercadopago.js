const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')
const { MP_ACCESS_TOKEN, FIREBASE_API_URL } = require('../config')
const { admin, db } = require('../config')

let client = null

function getClient() {
  if (!client && MP_ACCESS_TOKEN) {
    client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
  }
  return client
}

async function createPreference({ items, externalReference, payerEmail, description }) {
  const mpClient = getClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')

  const preference = await new Preference(mpClient).create({
    body: {
      items: items.map(item => ({
        title: item.title,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        currency_id: 'ARS',
      })),
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: externalReference,
      notification_url: `${FIREBASE_API_URL}/mercadopago/webhook`,
      back_urls: {
        success: `${FIREBASE_API_URL}/mercadopago/success`,
        failure: `${FIREBASE_API_URL}/mercadopago/failure`,
        pending: `${FIREBASE_API_URL}/mercadopago/pending`,
      },
      auto_return: 'approved',
      purpose: 'subscription',
    },
  })

  return preference
}

async function getPayment(paymentId) {
  const mpClient = getClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')
  return new Payment(mpClient).get({ id: paymentId })
}

async function handleWebhook(body) {
  const { type, data } = body

  if (type === 'payment') {
    const paymentId = data.id
    const payment = await getPayment(paymentId)

    const status = payment.status
    const externalRef = payment.external_reference

    if (!externalRef) return

    const [kind, userId] = externalRef.split(':')

    const updates = {
      mp_payment_id: paymentId,
      mp_status: status,
      mp_payment_method: payment.payment_method_id,
      mp_installments: payment.installments,
      mp_date_approved: payment.date_approved,
      fecha_actualizacion: new Date(),
    }

    if (status === 'approved') {
      updates.mp_status_detail = payment.status_detail
      updates.fecha_pago = new Date()
      updates.monto_pagado = payment.transaction_amount
      updates.activo = true

      if (kind === 'plan' && userId) {
        const plan = externalRef.split(':')[2] || 'starter'
        updates.plan = plan
        updates.plan_limits = getPlanLimits(plan)
        updates.subscription_status = 'active'
        updates.billing = 'monthly'
      }
    }

    await db.collection('usuarios').doc(userId).set(updates, { merge: true })

    await db.collection('checkout_sessions').add({
      ...updates,
      kind,
      user_id: userId,
      payment_id: paymentId,
      external_reference: externalRef,
      created_at: new Date(),
    })
  }
}

function getPlanLimits(plan) {
  const limits = {
    starter: { leads: 100, rubros: 1, propuestas: 50, messages: 900, emails: 500 },
    growth: { leads: 1000, rubros: 3, propuestas: 500, messages: 3000, emails: 2000 },
    enterprise: { leads: -1, rubros: -1, propuestas: -1, messages: -1, emails: -1 },
  }
  return limits[plan] || limits.starter
}

const PLAN_PRICES = {
  starter: { monthly: 29900, annual: 299000 },
  growth: { monthly: 79900, annual: 799000 },
  enterprise: { monthly: 199900, annual: 1999000 },
}

module.exports = { createPreference, getPayment, handleWebhook, getClient, PLAN_PRICES }
