const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

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
const FIREBASE_APP_URL = process.env.FIREBASE_APP_URL || 'https://revendr-9add8.web.app'
const FIREBASE_API_URL = process.env.FIREBASE_API_URL || 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

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

const PUBLIC_PATHS = ['/health', '/check-email', '/webhook/stripe', '/landing/view', '/landing/engagement', '/landing/stats/', '/support', '/chat/message', '/chat/reply', '/chat/messages', '/propuestas/', '/content/demo-landing', '/status', '/team/invite/accept-link', '/_health', '/email/resend-verification', '/test/send-demo-email']

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
  starter: { leads: 100, rubros: 1, propuestas: 50, messages: 1000 },
  growth: { leads: 1000, rubros: 3, propuestas: 500, messages: 10000 },
  enterprise: { leads: -1, rubros: -1, propuestas: -1, messages: -1 },
}

const RESEND_FROM = 'onboarding@resend.dev'

module.exports = {
  functions, admin, db, axios,
  APIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID,
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD,
  MP_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, GOOGLE_PLACES_API_KEY,
  FIREBASE_APP_URL, FIREBASE_API_URL,
  emailTransporter,
  APIFY_ACTORS, RUBRO_SEARCH_TERMS,
  isBusinessHours, isCampaignExpired, PUBLIC_PATHS,
  STRIPE_PRICES, PLAN_LIMITS, RESEND_FROM,
}
