const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node')
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1, environment: process.env.NODE_ENV || 'production' })
  } catch (e) { console.error('Sentry init failed:', e.message) }
}

const { PUBLIC_PATHS, FIREBASE_APP_URL } = require('./config')

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const userRateLimits = new Map()

function getUserRateLimiter(maxPerMinute = 30) {
  return (req, res, next) => {
    if (isPublicPath(req)) return next()
    const userId = req.user?.uid || req.ip
    const now = Date.now()
    const windowMs = 60 * 1000
    if (!userRateLimits.has(userId)) {
      userRateLimits.set(userId, [])
    }
    const timestamps = userRateLimits.get(userId).filter(t => now - t < windowMs)
    if (timestamps.length >= maxPerMinute) {
      return res.status(429).json({ success: false, error: { message: 'Too many requests. Try again in a minute.' } })
    }
    timestamps.push(now)
    userRateLimits.set(userId, timestamps)
    next()
  }
}

function isPublicPath(req) {
  return PUBLIC_PATHS.some(p => req.path.startsWith(p) || req.originalUrl.startsWith(p))
}

const app = express()
app.set('trust proxy', 1)
const allowedOrigins = [FIREBASE_APP_URL, 'https://revendr-9add8.web.app', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5000']
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com')) {
      return cb(null, true)
    }
    cb(new Error('Not allowed by CORS'))
  },
}))

const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, validate: false, message: { success: false, error: { message: 'Too many requests' } } })
app.use(generalLimiter)

const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, validate: false, message: { success: false, error: { message: 'Too many requests' } } })

app.use(getUserRateLimiter(60))

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))

app.use((req, res, next) => {
  if (isPublicPath(req)) return next()

  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'No auth token' } })
  }
  try {
    const token = header.split('Bearer ')[1]
    admin.auth().verifyIdToken(token).then(decoded => {
      req.user = decoded
      next()
    }).catch(() => {
      res.status(401).json({ success: false, error: { message: 'Invalid token' } })
    })
  } catch (e) {
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ error: 'Email required' })
    const q = await db.collection('usuarios').where('email', '==', email).limit(1).get()
    res.json({ exists: !q.empty })
  } catch (error) {
    res.json({ exists: false })
  }
})

app.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.json({ error: 'No auth token. Open this page while logged in to the app.' })
  }
  try {
    const token = header.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    res.json({ uid: decoded.uid, email: decoded.email, name: decoded.name })
  } catch (e) {
    res.json({ error: 'Invalid token' })
  }
})

require('./routes/campaigns')(app)
require('./routes/leads')(app)
require('./routes/mercadopago')(app)
require('./routes/misc')(app)

exports.api = functions.https.onRequest(app)

exports.processScheduledMessages = functions.pubsub.schedule('every 1 minutes').onRun(async () => {
  const { getPendingScheduledMessages, markScheduledMessageSent, markScheduledMessageFailed } = require('./services/scheduled-messages')
  const whatsappService = require('./services/whatsapp')
  const pending = await getPendingScheduledMessages()
  for (const msg of pending) {
    try {
      await whatsappService.sendMessage(msg.user_id, msg.phone, msg.message)
      await markScheduledMessageSent(msg.id)
      console.log(`Scheduled message ${msg.id} sent to ${msg.phone}`)
    } catch (err) {
      console.error(`Scheduled message ${msg.id} failed:`, err.message)
      await markScheduledMessageFailed(msg.id, err.message)
    }
  }
})

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    const email = user.email
    const nombre = user.displayName || email?.split('@')[0] || 'Usuario'
    if (!email) return
    const { emailTransporter, GMAIL_USER } = require('./config')
    if (!emailTransporter) return

    const verificationLink = await admin.auth().generateEmailVerificationLink(email)
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#6366f1">Bienvenido a Revendr</h1>
      <p>Hola ${nombre},</p>
      <p>Tu cuenta ha sido creada exitosamente. Antes de empezar, verificá tu email:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${verificationLink}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Verificar mi email</a>
      </div>
      <p style="color:#94a3b8;font-size:13px">Si el botón no funciona, copiá este link en tu navegador:<br>${verificationLink}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p><strong>Próximos pasos después de verificar:</strong></p>
      <ol style="color:#334155;line-height:1.8">
        <li>Completá el onboarding (menos de 2 minutos)</li>
        <li>Creá tu primer producto o servicio</li>
        <li>Configurá tu primera campaña de scraping</li>
      </ol>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">© 2026 Revendr</p>
    </div>`

    await emailTransporter.sendMail({
      from: `"Revendr" <${GMAIL_USER}>`,
      to: email,
      subject: `Bienvenido a Revendr, ${nombre}! Verificá tu email`,
      html,
    })
    console.log('Welcome + verification email sent to:', email)

    // Notificar por Telegram
    try {
      const axios = require('axios')
      const TELEGRAM_NOTIFIER_URL = 'https://telegram-notifier-pmcs.onrender.com'
      await axios.post(`${TELEGRAM_NOTIFIER_URL}/notify`, {
        app: 'revendr',
        event: '👤 Nuevo registro',
        message: `Email: ${email}\nNombre: ${nombre}`,
      })
    } catch (e) {
      console.error('Telegram notification error:', e.message)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error.message)
  }
})
