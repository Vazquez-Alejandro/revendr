const functions = require('firebase-functions')
const admin = require('firebase-admin')

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const axios = require('axios')

const APIFY_TOKEN = process.env.APIFY_TOKEN
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const RESEND_API_KEY = process.env.RESEND_API_KEY
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const FIREBASE_APP_URL = process.env.APP_URL || 'https://revendr-9add8.web.app'
const FIREBASE_API_URL = process.env.API_URL || 'https://us-central1-revendr-9add8.cloudfunctions.net/api'
const ADMIN_TELEGRAM_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

const nodemailer = GMAIL_USER && GMAIL_APP_PASSWORD ? require('nodemailer') : null
const emailTransporter = nodemailer ? nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
}) : null

const APIFY_ACTORS = {
  google_maps: 'compass~crawler-google-places',
  instagram: 'apify~instagram-profile-scraper',
}

const RUBRO_SEARCH_TERMS = {
  inmobiliaria: 'inmobiliaria',
  estetica: 'peluqueria estetica',
  clinica: 'clinica medica',
  restaurante: 'restaurante',
  gimnasio: 'gimnasio',
  otro: 'negocio',
}

const isBusinessHours = () => {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  return hour >= 9 && hour < 18
}

const isCampaignExpired = (campaign) => {
  if (!campaign.fecha_fin) return false
  const fechaFin = campaign.fecha_fin.toDate ? campaign.fecha_fin.toDate() : new Date(campaign.fecha_fin)
  return new Date() > fechaFin
}

const PUBLIC_PATHS = ['/health', '/check-email', '/webhook/stripe', '/landing/view', '/landing/engagement', '/landing/stats/', '/support', '/chat/message', '/chat/reply', '/chat/messages', '/propuestas/', '/content/demo-landing', '/status', '/team/invite/accept-link', '/_health', '/email/resend-verification', '/test/send-demo-email', '/whatsapp/webhook']

const getWhatsAppConfig = async (userId) => {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  if (!userDoc.exists) {
    const adminDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (!adminDoc.exists) throw new Error('Usuario no encontrado')
    const adminData = adminDoc.data()
    const config = adminData?.whatsapp_config || {}
    if (!config.phone_number_id || !config.access_token) {
      return { configured: false, phoneId: null, token: null }
    }
    return { configured: true, phoneId: config.phone_number_id, token: config.access_token, status: config.status || 'active' }
  }
  const userData = userDoc.data()
  const config = userData?.whatsapp_config || {}
  if (!config.phone_number_id || !config.access_token) {
    return { configured: false, phoneId: null, token: null }
  }
  return { configured: true, phoneId: config.phone_number_id, token: config.access_token, status: config.status || 'active' }
}

const checkPlanLimit = async (userId, type) => {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  let plan = 'starter'
  let planLimits = PLAN_LIMITS.starter
  let usage = { leads: 0, propuestas: 0, messages: 0 }
  let whatsappConfig = {}
  if (userDoc.exists) {
    const userData = userDoc.data()
    plan = userData.plan || 'starter'
    planLimits = userData.plan_limits || PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    usage = userData.usage || { leads: 0, propuestas: 0, messages: 0 }
    whatsappConfig = userData.whatsapp_config || {}
  } else {
    const adminDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (adminDoc.exists) {
      const adminData = adminDoc.data()
      plan = adminData.plan || 'starter'
      planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
      usage = adminData.usage || { leads: 0, propuestas: 0, messages: 0 }
      whatsappConfig = adminData.whatsapp_config || {}
    }
  }
  const limit = planLimits[type]
  const currentUsage = usage[type] || 0

  const RATE_LIMITS = {
    starter: { perHour: 8, perDay: 30, minDelaySeconds: 90 },
    growth: { perHour: 15, perDay: 100, minDelaySeconds: 60 },
    enterprise: { perHour: 30, perDay: 200, minDelaySeconds: 30 },
  }
  const rateLimits = RATE_LIMITS[plan] || RATE_LIMITS.starter

  const lastMessageAt = whatsappConfig.last_message_at?.toDate?.() || whatsappConfig.last_message_at
  const messagesLastHour = whatsappConfig.messages_last_hour || 0
  const messagesLastHourResetAt = whatsappConfig.messages_last_hour_reset_at?.toDate?.() || whatsappConfig.messages_last_hour_reset_at
  const now = new Date()

  let hourUsage = messagesLastHour
  if (messagesLastHourResetAt && (now - messagesLastHourResetAt) > 3600000) {
    hourUsage = 0
  }

  let delayOk = true
  let secondsSinceLastMessage = 999
  if (lastMessageAt) {
    secondsSinceLastMessage = (now - lastMessageAt) / 1000
    if (secondsSinceLastMessage < rateLimits.minDelaySeconds) {
      delayOk = false
    }
  }

  if (limit !== -1 && currentUsage >= limit) {
    return { allowed: false, remaining: 0, usage: currentUsage, limit, plan, reason: 'monthly_limit', rateLimits }
  }
  if (hourUsage >= rateLimits.perHour) {
    return { allowed: false, remaining: 0, usage: currentUsage, limit, plan, reason: 'hourly_limit', rateLimits, retryAfterSeconds: 3600 - (now - (messagesLastHourResetAt || now)) / 1000 }
  }
  if (!delayOk) {
    return { allowed: false, remaining: 0, usage: currentUsage, limit, plan, reason: 'min_delay', rateLimits, retryAfterSeconds: Math.ceil(rateLimits.minDelaySeconds - secondsSinceLastMessage) }
  }

  return {
    allowed: true,
    remaining: limit === -1 ? -1 : limit - currentUsage,
    usage: currentUsage,
    limit,
    plan,
    rateLimits,
    hourRemaining: rateLimits.perHour - hourUsage,
  }
}

const incrementUsage = async (userId, type, amount = 1) => {
  const userRef = db.collection('usuarios').doc(userId)
  const userDoc = await userRef.get()
  const now = new Date()
  const updates = {
    [`usage.${type}`]: admin.firestore.FieldValue.increment(amount),
    fecha_actualizacion: now,
  }

  if (type === 'messages') {
    const data = userDoc.exists ? userDoc.data() : {}
    const whatsappConfig = data.whatsapp_config || {}
    const lastMessageAt = whatsappConfig.last_message_at?.toDate?.() || whatsappConfig.last_message_at
    const messagesLastHourResetAt = whatsappConfig.messages_last_hour_reset_at?.toDate?.() || whatsappConfig.messages_last_hour_reset_at
    let messagesLastHour = whatsappConfig.messages_last_hour || 0

    if (messagesLastHourResetAt && (now - messagesLastHourResetAt) > 3600000) {
      messagesLastHour = 0
      updates['whatsapp_config.messages_last_hour_reset_at'] = now
    }

    updates['whatsapp_config.last_message_at'] = now
    updates['whatsapp_config.messages_last_hour'] = messagesLastHour + amount
    if (!messagesLastHourResetAt || (now - messagesLastHourResetAt) > 3600000) {
      updates['whatsapp_config.messages_last_hour_reset_at'] = now
    }
  }

  if (userDoc.exists) {
    await userRef.update(updates)
  } else {
    const adminRef = db.collection('usuarios_admin').doc(userId)
    const adminDoc = await adminRef.get()
    if (adminDoc.exists) {
      await adminRef.update(updates)
    }
  }
}

const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_1TgpksPRwRIumjKDJTuaMTdh',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || 'price_1TgpksPRwRIumjKDMb9IUI4F',
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || 'price_1TgpnzPRwRIumjKDByQoc0Mh',
    annual: process.env.STRIPE_PRICE_GROWTH_ANNUAL || 'price_1TgprbPRwRIumjKD6vYYlLsK',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1TgpsWPRwRIumjKDbvOgfLrP',
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_1Tgpt6PRwRIumjKDXs6laP5D',
  },
}

const PLAN_LIMITS = {
  starter: { leads: 100, rubros: 1, propuestas: 50, messages: 900, emails: 500 },
  growth: { leads: 1000, rubros: 3, propuestas: 500, messages: 3000, emails: 2000 },
  enterprise: { leads: -1, rubros: -1, propuestas: -1, messages: -1, emails: -1 },
}

const EMAIL_RATE_LIMITS = {
  starter: { perHour: 20, perDay: 100 },
  growth: { perHour: 50, perDay: 300 },
  enterprise: { perHour: 100, perDay: 500 },
}

async function checkEmailLimit(userId, type = 'emails') {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  let plan = 'starter'
  let usage = { emails: 0 }
  let planLimits = PLAN_LIMITS.starter

  if (userDoc.exists) {
    const userData = userDoc.data()
    plan = userData.plan || 'starter'
    usage = userData.usage || { emails: 0 }
    planLimits = userData.plan_limits || PLAN_LIMITS[plan] || PLAN_LIMITS.starter
  } else {
    const adminDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (adminDoc.exists) {
      const adminData = adminDoc.data()
      plan = adminData.plan || 'starter'
      usage = adminData.usage || { emails: 0 }
      planLimits = adminData.plan_limits || PLAN_LIMITS[plan] || PLAN_LIMITS.starter
    }
  }

  const limit = planLimits.emails
  const currentUsage = usage.emails || 0
  const rateLimits = EMAIL_RATE_LIMITS[plan] || EMAIL_RATE_LIMITS.starter

  if (limit !== -1 && currentUsage >= limit) {
    return { allowed: false, remaining: 0, usage: currentUsage, limit, plan, reason: 'monthly_limit' }
  }

  return {
    allowed: true,
    remaining: limit === -1 ? -1 : limit - currentUsage,
    usage: currentUsage,
    limit,
    plan,
  }
}

async function incrementEmailUsage(userId, amount = 1) {
  const userRef = db.collection('usuarios').doc(userId)
  const adminRef = db.collection('usuarios_admin').doc(userId)

  const updateData = {
    'usage.emails': admin.firestore.FieldValue.increment(amount),
    fecha_actualizacion: new Date(),
  }

  await userRef.set(updateData, { merge: true })
  await adminRef.set(updateData, { merge: true })
}

const RESEND_FROM = 'onboarding@resend.dev'

module.exports = {
  functions, admin, db, axios,
  APIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID,
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD,
  MP_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, GOOGLE_PLACES_API_KEY,
  FIREBASE_APP_URL, FIREBASE_API_URL,
  ADMIN_TELEGRAM_CHAT_ID, ADMIN_EMAIL,
  emailTransporter,
  APIFY_ACTORS, RUBRO_SEARCH_TERMS,
  isBusinessHours, isCampaignExpired, PUBLIC_PATHS,
  STRIPE_PRICES, PLAN_LIMITS, RESEND_FROM,
  getWhatsAppConfig, checkPlanLimit, incrementUsage,
  checkEmailLimit, incrementEmailUsage,
}
