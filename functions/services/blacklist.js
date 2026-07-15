const { db } = require('../config')

async function addToBlacklist(userId, phone, reason = '') {
  const normalizedPhone = phone.replace(/\D/g, '')

  const existing = await db.collection('blacklist')
    .where('user_id', '==', userId)
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { success: false, error: 'Phone already blacklisted' }
  }

  await db.collection('blacklist').add({
    user_id: userId,
    phone: normalizedPhone,
    reason,
    created_at: new Date(),
  })

  return { success: true }
}

async function removeFromBlacklist(userId, phone) {
  const normalizedPhone = phone.replace(/\D/g, '')

  const snapshot = await db.collection('blacklist')
    .where('user_id', '==', userId)
    .where('phone', '==', normalizedPhone)
    .get()

  if (snapshot.empty) {
    return { success: false, error: 'Phone not found in blacklist' }
  }

  for (const doc of snapshot.docs) {
    await doc.ref.delete()
  }

  return { success: true }
}

async function getBlacklist(userId) {
  const snapshot = await db.collection('blacklist')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

async function isBlacklisted(userId, phone) {
  const normalizedPhone = phone.replace(/\D/g, '')

  const snapshot = await db.collection('blacklist')
    .where('user_id', '==', userId)
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get()

  return !snapshot.empty
}

module.exports = { addToBlacklist, removeFromBlacklist, getBlacklist, isBlacklisted }
