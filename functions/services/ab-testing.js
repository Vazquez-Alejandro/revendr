const { db } = require('../config')

async function createABTest(userId, { campaignId, name, messageA, messageB, splitPercent = 50 }) {
  const docRef = await db.collection('ab_tests').add({
    user_id: userId,
    campaign_id: campaignId,
    name,
    message_a: messageA,
    message_b: messageB,
    split_percent: splitPercent,
    status: 'active',
    results: { a: { sent: 0, views: 0, clicks: 0, conversions: 0 }, b: { sent: 0, views: 0, clicks: 0, conversions: 0 } },
    created_at: new Date(),
  })

  return { id: docRef.id }
}

async function getABTest(userId, testId) {
  const doc = await db.collection('ab_tests').doc(testId).get()
  if (!doc.exists) return null
  const data = doc.data()
  if (data.user_id !== userId) return null
  return { id: doc.id, ...data }
}

async function getABTests(userId) {
  const snapshot = await db.collection('ab_tests')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .get()

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

async function assignVariant(userId, testId) {
  const test = await getABTest(userId, testId)
  if (!test || test.status !== 'active') return null

  const random = Math.random() * 100
  const variant = random < test.split_percent ? 'a' : 'b'
  return variant
}

async function recordABResult(userId, testId, variant, { viewed = false, clicked = false, converted = false }) {
  const test = await getABTest(userId, testId)
  if (!test) return

  const updatePath = `results.${variant}`
  const updates = {}

  if (viewed) updates[`${updatePath}.views`] = (test.results[variant].views || 0) + 1
  if (clicked) updates[`${updatePath}.clicks`] = (test.results[variant].clicks || 0) + 1
  if (converted) updates[`${updatePath}.conversions`] = (test.results[variant].conversions || 0) + 1

  if (Object.keys(updates).length > 0) {
    await db.collection('ab_tests').doc(testId).update(updates)
  }
}

async function getABTestWinner(userId, testId) {
  const test = await getABTest(userId, testId)
  if (!test) return null

  const { a, b } = test.results
  const totalA = a.views || 0
  const totalB = b.views || 0

  if (totalA === 0 && totalB === 0) return { winner: null, reason: 'No data yet' }

  const rateA = totalA > 0 ? ((a.conversions || 0) / totalA) * 100 : 0
  const rateB = totalB > 0 ? ((b.conversions || 0) / totalB) * 100 : 0

  if (Math.abs(rateA - rateB) < 1) return { winner: null, reason: 'Too close to call' }

  const winner = rateA > rateB ? 'a' : 'b'
  return {
    winner,
    messageA: test.message_a,
    messageB: test.message_b,
    rateA: rateA.toFixed(1),
    rateB: rateB.toFixed(1),
    confidence: Math.abs(rateA - rateB).toFixed(1),
  }
}

module.exports = { createABTest, getABTest, getABTests, assignVariant, recordABResult, getABTestWinner }
