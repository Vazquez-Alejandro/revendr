const { db } = require('../config')

async function scheduleMessage(userId, { leadId, phone, message, scheduledFor, campaignId = null }) {
  const scheduledDate = new Date(scheduledFor)
  if (scheduledDate <= new Date()) {
    return { success: false, error: 'Scheduled time must be in the future' }
  }

  const docRef = await db.collection('scheduled_messages').add({
    user_id: userId,
    lead_id: leadId || null,
    phone,
    message,
    scheduled_for: scheduledDate,
    campaign_id: campaignId,
    status: 'pending',
    created_at: new Date(),
  })

  return { success: true, id: docRef.id }
}

async function cancelScheduledMessage(userId, messageId) {
  const doc = await db.collection('scheduled_messages').doc(messageId).get()
  if (!doc.exists) return { success: false, error: 'Message not found' }

  const data = doc.data()
  if (data.user_id !== userId) return { success: false, error: 'Access denied' }
  if (data.status !== 'pending') return { success: false, error: 'Message already processed' }

  await doc.ref.update({ status: 'cancelled' })
  return { success: true }
}

async function getScheduledMessages(userId) {
  const snapshot = await db.collection('scheduled_messages')
    .where('user_id', '==', userId)
    .where('status', '==', 'pending')
    .orderBy('scheduled_for', 'asc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    scheduled_for: doc.data().scheduled_for?.toDate?.() || doc.data().scheduled_for,
  }))
}

async function getPendingScheduledMessages() {
  const now = new Date()
  const snapshot = await db.collection('scheduled_messages')
    .where('status', '==', 'pending')
    .where('scheduled_for', '<=', now)
    .limit(50)
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

async function markScheduledMessageSent(messageId) {
  await db.collection('scheduled_messages').doc(messageId).update({
    status: 'sent',
    sent_at: new Date(),
  })
}

async function markScheduledMessageFailed(messageId, error) {
  await db.collection('scheduled_messages').doc(messageId).update({
    status: 'failed',
    error,
  })
}

module.exports = {
  scheduleMessage,
  cancelScheduledMessage,
  getScheduledMessages,
  getPendingScheduledMessages,
  markScheduledMessageSent,
  markScheduledMessageFailed,
}
