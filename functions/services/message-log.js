const { db } = require('../config')

async function logMessage({ userId, leadId, channel, message, status = 'sent', recipient, campaignId = null }) {
  try {
    const messageData = {
      user_id: userId,
      lead_id: leadId,
      channel,
      message,
      status,
      recipient,
      campaign_id: campaignId,
      created_at: new Date(),
    }
    const docRef = await db.collection('message_log').add(messageData)

    await db.collection('leads').doc(leadId).update({
      fecha_ultimo_mensaje: new Date(),
      ultimo_mensaje_canal: channel,
    }).catch(() => {})

    return { id: docRef.id, ...messageData }
  } catch (error) {
    console.error('Error logging message:', error.message)
    return null
  }
}

async function getMessageHistory(userId, { leadId = null, channel = null, limit = 50 } = {}) {
  try {
    let query = db.collection('message_log').where('user_id', '==', userId)
    if (leadId) query = query.where('lead_id', '==', leadId)
    if (channel) query = query.where('channel', '==', channel)
    const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting message history:', error.message)
    return []
  }
}

async function getMessageStats(userId) {
  try {
    const snapshot = await db.collection('message_log').where('user_id', '==', userId).get()
    const stats = { total: 0, sent: 0, failed: 0, whatsapp: 0, email: 0, byDay: {} }
    snapshot.docs.forEach(doc => {
      const msg = doc.data()
      stats.total++
      if (msg.status === 'sent') stats.sent++
      if (msg.status === 'failed') stats.failed++
      if (msg.channel === 'whatsapp') stats.whatsapp++
      if (msg.channel === 'email') stats.email++
      const day = msg.created_at?.toDate?.()?.toISOString()?.split('T')[0]
      if (day) stats.byDay[day] = (stats.byDay[day] || 0) + 1
    })
    return stats
  } catch (error) {
    console.error('Error getting message stats:', error.message)
    return { total: 0, sent: 0, failed: 0, whatsapp: 0, email: 0, byDay: {} }
  }
}

module.exports = { logMessage, getMessageHistory, getMessageStats }
