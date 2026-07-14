const { db, admin } = require('../config')

const WARMUP_CONFIG = {
  starter: {
    daysToWarmup: 5,
    maxPerDay: [10, 15, 20, 25, 30],
    maxPerHour: [3, 5, 6, 7, 8],
  },
  growth: {
    daysToWarmup: 5,
    maxPerDay: [20, 40, 60, 80, 100],
    maxPerHour: [5, 8, 10, 12, 15],
  },
  enterprise: {
    daysToWarmup: 5,
    maxPerDay: [30, 60, 100, 150, 200],
    maxPerHour: [8, 12, 20, 25, 30],
  },
}

async function getWarmupDay(userId) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  const data = userDoc.data() || {}
  const config = data.whatsapp_config || {}

  const connectedAt = config.baileys_connected_at?.toDate?.() || config.connected_at?.toDate?.()
  if (!connectedAt) return 0

  const daysSinceConnect = Math.floor((Date.now() - connectedAt.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(daysSinceConnect, 4)
}

async function canSendToday(userId, plan) {
  const warmupDay = await getWarmupDay(userId)
  const config = WARMUP_CONFIG[plan] || WARMUP_CONFIG.starter
  const maxToday = config.maxPerDay[warmupDay]

  const userDoc = await db.collection('usuarios').doc(userId).get()
  const data = userDoc.data() || {}
  const usage = data.usage || {}

  const today = new Date().toDateString()
  const lastReset = data.whatsapp_config?.daily_usage_reset?.toDate?.()

  let dailyCount = 0
  if (lastReset && lastReset.toDateString() === today) {
    dailyCount = data.whatsapp_config?.daily_usage_count || 0
  }

  return {
    allowed: dailyCount < maxToday,
    dailyCount,
    maxToday,
    warmupDay: warmupDay + 1,
    totalWarmupDays: 5,
  }
}

async function incrementDailyUsage(userId) {
  const today = new Date().toDateString()
  const userRef = db.collection('usuarios').doc(userId)
  const userDoc = await userRef.get()
  const data = userDoc.data() || {}
  const config = data.whatsapp_config || {}

  const lastReset = config.daily_usage_reset?.toDate?.()
  const isSameDay = lastReset && lastReset.toDateString() === today

  await userRef.update({
    'whatsapp_config.daily_usage_count': isSameDay ? (config.daily_usage_count || 0) + 1 : 1,
    'whatsapp_config.daily_usage_reset': new Date(),
  })
}

async function getQualityScore(userId) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  const data = userDoc.data() || {}
  const config = data.whatsapp_config || {}

  const messagesSent = data.usage?.messages || 0
  const responsesReceived = config.responses_received || 0

  if (messagesSent === 0) return { score: 100, level: 'excellent' }

  const responseRate = responsesReceived / messagesSent

  if (responseRate >= 0.3) return { score: 100, level: 'excellent' }
  if (responseRate >= 0.2) return { score: 80, level: 'good' }
  if (responseRate >= 0.1) return { score: 60, level: 'fair' }
  if (responseRate >= 0.05) return { score: 40, level: 'poor' }
  return { score: 20, level: 'critical' }
}

async function shouldPauseSending(userId) {
  const quality = await getQualityScore(userId)
  if (quality.level === 'critical') {
    return { pause: true, reason: 'Quality score critical. Pause sending and improve message quality.' }
  }
  if (quality.level === 'poor') {
    return { pause: false, warning: 'Quality score low. Consider personalizing messages more.' }
  }
  return { pause: false }
}

module.exports = {
  getWarmupDay,
  canSendToday,
  incrementDailyUsage,
  getQualityScore,
  shouldPauseSending,
  WARMUP_CONFIG,
}
