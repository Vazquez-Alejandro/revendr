const { admin, db, axios, RESEND_API_KEY, GMAIL_USER, emailTransporter, TELEGRAM_BOT_TOKEN, RESEND_FROM } = require('../config')

async function createNotification({ userId, type, title, body, link = null, data = {} }) {
  try {
    await db.collection('notificaciones').add({
      userId, type, title, body: body || '', data,
      read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), link,
    })
  } catch (e) {
    console.error('Error creating notification:', e.message)
  }
}

async function sendEmail(to, subject, html) {
  try {
    const emailData = { from: RESEND_FROM, to, subject, html }
    if (RESEND_API_KEY) {
      await axios.post('https://api.resend.com/emails', emailData, {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      })
      return { sent: true, provider: 'resend' }
    }
    if (emailTransporter) {
      await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to, subject, html })
      return { sent: true, provider: 'gmail' }
    }
    return { sent: false, reason: 'no_email_provider' }
  } catch (error) {
    console.error('Email error:', error.message)
    return { sent: false, reason: error.message }
  }
}

async function sendSimpleEmail(to, subject, html) {
  if (!to || !subject || !html) return { sent: false, reason: 'missing_params' }
  try {
    if (RESEND_API_KEY) {
      const res = await axios.post('https://api.resend.com/emails',
        { from: RESEND_FROM, to, subject, html },
        { headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      )
      if (res.status === 200) return { sent: true, provider: 'resend' }
    }
    if (emailTransporter) {
      await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to, subject, html })
      return { sent: true, provider: 'gmail' }
    }
    return { sent: false, reason: 'no_provider_available' }
  } catch (error) {
    console.error('sendSimpleEmail error:', error.message)
    return { sent: false, reason: error.message }
  }
}

async function sendTransactionalEmail(to, type, data = {}) {
  const templates = {
    welcome: { subject: '¡Bienvenido a Revendr!', html: `<h1>¡Bienvenido a Revendr!</h1><p>Estamos emocionados de tenerte a bordo.</p>` },
    email_verification: { subject: 'Verifica tu email en Revendr', html: `<h1>Verifica tu email</h1><p>Hacé clic <a href="${data.link || '#'}">acá</a> para verificar tu email.</p>` },
    plan_change: { subject: 'Plan actualizado', html: `<h1>Plan actualizado a ${data.plan || 'nuevo plan'}</h1>` },
    payment_failed: { subject: 'Problema con tu pago', html: `<h1>Problema con el pago</h1><p>No pudimos procesar tu pago.</p>` },
    subscription_cancelled: { subject: 'Suscripción cancelada', html: `<h1>Suscripción cancelada</h1>` },
    payment_reminder: { subject: 'Recordatorio de pago', html: `<h1>Recordatorio</h1><p>Tu próxima factura vence pronto.</p>` },
  }
  const t = templates[type]
  if (!t) return { sent: false, reason: 'unknown_template' }
  return sendSimpleEmail(to, t.subject, t.html)
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return { sent: false, reason: 'no_telegram_token' }
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false,
    })
    return { sent: true }
  } catch (error) {
    console.error('Telegram error:', error.message)
    return { sent: false, reason: error.message }
  }
}

module.exports = {
  createNotification,
  sendEmail, sendSimpleEmail, sendTransactionalEmail,
  sendTelegramMessage,
}
