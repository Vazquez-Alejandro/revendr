const { MercadoPagoConfig, Preference, Payment, PreApproval } = require('mercadopago')
const { MP_ACCESS_TOKEN, FIREBASE_API_URL } = require('../config')
const { admin, db } = require('../config')

let client = null
let preApprovalClient = null

function getClient() {
  if (!client && MP_ACCESS_TOKEN) {
    client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
  }
  return client
}

function getPreApprovalClient() {
  if (!preApprovalClient && MP_ACCESS_TOKEN) {
    preApprovalClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
  }
  return preApprovalClient
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

async function createPreApproval({ planKey, billing, payerEmail, externalReference }) {
  const mpClient = getPreApprovalClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')

  const usd = PLAN_PRICES_USD[planKey]
  const amountArs = toARS(usd)

  const body = {
    reason: `Revendr ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} - ${billing === 'annual' ? 'Anual' : 'Mensual'}`,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amountArs,
      currency_id: 'ARS',
    },
    payer_email: payerEmail,
    external_reference: externalReference,
    statement_descriptor: 'TRACELESS',
    back_url: `${FIREBASE_API_URL}/mercadopago/success`,
  }

  const preApproval = await new PreApproval(mpClient).create({ body })
  return preApproval
}

async function cancelPreApproval(preApprovalId) {
  const mpClient = getPreApprovalClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')
  await new PreApproval(mpClient).update({ id: preApprovalId, body: { status: 'cancelled' } })
}

async function getPayment(paymentId) {
  const mpClient = getClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')
  return new Payment(mpClient).get({ id: paymentId })
}

async function getPreApprovalInfo(preApprovalId) {
  const mpClient = getPreApprovalClient()
  if (!mpClient) throw new Error('MP_ACCESS_TOKEN not configured')
  return new PreApproval(mpClient).get({ id: preApprovalId })
}

async function handleWebhook(body) {
  const { type, data } = body

  if (type === 'payment') {
    const paymentId = data.id
    const payment = await getPayment(paymentId)

    const status = payment.status
    const externalRef = payment.external_reference

    if (!externalRef) return

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

      const parts = externalRef.split(':')
      if (parts[0] === 'plan' && parts[1]) {
        const userId = parts[1]
        const planKey = parts[2] || 'starter'
        updates.plan = planKey
        updates.plan_limits = getPlanLimits(planKey)
        updates.subscription_status = 'active'
        updates.billing = parts[3] || 'monthly'
      }
    }

    await db.collection('usuarios').doc(externalRef.split(':')[1] || '').set(updates, { merge: true })

    await db.collection('checkout_sessions').add({
      ...updates,
      kind: 'plan',
      user_id: externalRef.split(':')[1] || '',
      payment_id: paymentId,
      external_reference: externalRef,
      created_at: new Date(),
    })
  }

  if (type === 'subscription_preapproval') {
    const preApprovalId = data.id
    const preApproval = await getPreApprovalInfo(preApprovalId)

    const status = preApproval.status
    const externalRef = preApproval.external_reference

    if (!externalRef) return

    const parts = externalRef.split(':')
    if (parts[0] !== 'plan' || !parts[1]) return
    const userId = parts[1]
    const planKey = parts[2] || 'starter'

    if (status === 'authorized') {
      await db.collection('usuarios').doc(userId).set({
        plan: planKey,
        plan_limits: getPlanLimits(planKey),
        subscription_status: 'active',
        billing: parts[3] || 'monthly',
        mp_preapproval_id: preApprovalId,
        activo: true,
        fecha_actualizacion: new Date(),
      }, { merge: true })

      await db.collection('cache').set({
        key: `mp_preapproval:${userId}`,
        token: JSON.stringify({ preApprovalId, planKey }),
      })
    } else if (status === 'cancelled' || status === 'paused') {
      await db.collection('usuarios').doc(userId).set({
        plan: 'starter',
        plan_limits: getPlanLimits('starter'),
        subscription_status: status,
        activo: false,
        mp_preapproval_id: null,
        fecha_actualizacion: new Date(),
      }, { merge: true })

      await db.collection('cache').delete().eq('key', `mp_preapproval:${userId}`)
    }
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

const PLAN_PRICES_USD = {
  starter: 29,
  growth: 79,
  enterprise: 199,
}

const USD_TO_ARS = 1000

function toARS(usd) {
  return Math.round(usd * USD_TO_ARS)
}

const PLAN_PRICES = {
  starter: { monthly: toARS(PLAN_PRICES_USD.starter), annual: toARS(PLAN_PRICES_USD.starter * 12 * 0.8) },
  growth: { monthly: toARS(PLAN_PRICES_USD.growth), annual: toARS(PLAN_PRICES_USD.growth * 12 * 0.8) },
  enterprise: { monthly: toARS(PLAN_PRICES_USD.enterprise), annual: toARS(PLAN_PRICES_USD.enterprise * 12 * 0.8) },
}

module.exports = {
  createPreference,
  createPreApproval,
  cancelPreApproval,
  getPayment,
  getPreApprovalInfo,
  handleWebhook,
  getClient,
  PLAN_PRICES,
  PLAN_PRICES_USD,
  getPlanLimits,
}