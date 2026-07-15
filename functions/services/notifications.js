const { db } = require('../config')

async function sendNotificationEmail(userId, { subject, body, type }) {
  try {
    const userDoc = await db.collection('usuarios').doc(userId).get()
    if (!userDoc.exists) return

    const user = userDoc.data()
    const email = user.email
    if (!email) return

    await db.collection('notifications').add({
      user_id: userId,
      email,
      subject,
      body,
      type,
      status: 'pending',
      created_at: new Date(),
    })

    console.log(`Notification queued: ${type} to ${email}`)
    return true
  } catch (error) {
    console.error('Error sending notification email:', error.message)
    return false
  }
}

async function notifyConversion(userId, lead) {
  return sendNotificationEmail(userId, {
    subject: `🎉 ¡Lead convertido: ${lead.nombre_negocio}!`,
    body: `${lead.nombre_negocio} se convirtió en cliente activo. Mirá los detalles en el dashboard.`,
    type: 'conversion',
  })
}

async function notifyResponse(userId, lead) {
  return sendNotificationEmail(userId, {
    subject: `💬 ${lead.nombre_negocio} respondió tu mensaje`,
    body: `${lead.nombre_negocio} respondió por WhatsApp. Entrá al dashboard para ver el mensaje.`,
    type: 'response',
  })
}

async function notifyLowQuality(userId, score) {
  return sendNotificationEmail(userId, {
    subject: `⚠️ Quality score bajo: ${score}%`,
    body: `Tu quality score bajó a ${score}%. Revisá tus mensajes y propuestas para mejorar el engagement.`,
    type: 'low_quality',
  })
}

async function getNotifications(userId, { limit = 20 } = {}) {
  const snapshot = await db.collection('notifications')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

async function markNotificationRead(userId, notificationId) {
  const doc = await db.collection('notifications').doc(notificationId).get()
  if (!doc.exists) return false
  const data = doc.data()
  if (data.user_id !== userId) return false

  await doc.ref.update({ status: 'read', read_at: new Date() })
  return true
}

module.exports = { sendNotificationEmail, notifyConversion, notifyResponse, notifyLowQuality, getNotifications, markNotificationRead }
