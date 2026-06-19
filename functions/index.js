const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')

admin.initializeApp()
const db = admin.firestore()

const app = express()
app.use(cors({ origin: true }))

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))

const { PUBLIC_PATHS } = require('./config')

app.use((req, res, next) => {
  const isPublic = PUBLIC_PATHS.some(p => req.path.startsWith(p) || req.originalUrl.startsWith(p))
  if (isPublic) return next()

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
    if (!q.empty) return res.json({ exists: true })
    const qa = await db.collection('usuarios_admin').where('email', '==', email).limit(1).get()
    if (!qa.empty) return res.json({ exists: true })
    res.json({ exists: false })
  } catch (error) {
    res.json({ exists: false })
  }
})

require('./routes/campaigns')(app)
require('./routes/leads')(app)
require('./routes/payments')(app)
require('./routes/misc')(app)

exports.api = functions.https.onRequest(app)

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
  } catch (error) {
    console.error('Error sending welcome email:', error.message)
  }
})
