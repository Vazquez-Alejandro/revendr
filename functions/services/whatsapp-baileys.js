const axios = require('axios')
const warmup = require('./warmup')
const { db } = require('../config')

const WORKER_URL = process.env.BAILEYS_WORKER_URL || 'http://127.0.0.1:3001'

async function sendMessage(userId, phone, text) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  const plan = userDoc.data()?.plan || 'starter'

  const warmupCheck = await warmup.canSendToday(userId, plan)
  if (!warmupCheck.allowed) {
    throw new Error(`Límite diario alcanzado (${warmupCheck.dailyCount}/${warmupCheck.maxToday}) durante warm-up (día ${warmupCheck.warmupDay}/${warmupCheck.totalWarmupDays}). Esperá al día siguiente.`)
  }

  const qualityCheck = await warmup.shouldPauseSending(userId)
  if (qualityCheck.pause) {
    throw new Error(qualityCheck.reason)
  }

  let result
  try {
    const res = await axios.post(`${WORKER_URL}/send-message`, { userId, phone, text }, { timeout: 30000 })
    result = res.data
    if (result.error) throw new Error(result.error)
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      throw Object.assign(new Error('Baileys worker no está corriendo - SESSION_LOST'), { code: 'SESSION_LOST' })
    }
    throw err
  }

  await warmup.incrementDailyUsage(userId)

  return {
    messageId: result.messageId,
    status: 'sent',
    timestamp: new Date(),
    warmup: {
      day: warmupCheck.warmupDay,
      dailyCount: warmupCheck.dailyCount + 1,
      maxToday: warmupCheck.maxToday,
    },
  }
}

async function getStatus(userId) {
  try {
    const res = await axios.get(`${WORKER_URL}/qr?userId=${userId}`, { timeout: 5000 })
    return {
      status: res.data.status || 'disconnected',
      phone: res.data.phone || null,
    }
  } catch {
    return { status: 'disconnected', phone: null }
  }
}

async function disconnect(userId) {
  try {
    await axios.post(`${WORKER_URL}/disconnect`, { userId }, { timeout: 5000 })
  } catch {}

  await db.collection('usuarios').doc(userId).update({
    'whatsapp_config.baileys_status': 'disconnected',
    'whatsapp_config.baileys_phone': require('firebase-admin').firestore.FieldValue.delete(),
    'whatsapp_config.baileys_qr': require('firebase-admin').firestore.FieldValue.delete(),
    'whatsapp_config.baileys_updated_at': new Date(),
  }).catch(() => {})
}

async function getQR(userId) {
  try {
    const res = await axios.get(`${WORKER_URL}/qr?userId=${userId}`, { timeout: 5000 })
    return res.data.qr || null
  } catch {
    return null
  }
}

async function connectSession(userId) {
  try {
    const res = await axios.post(`${WORKER_URL}/connect`, { userId }, { timeout: 10000 })
    return { sock: null, status: res.data.status || 'connecting' }
  } catch {
    return { sock: null, status: 'disconnected' }
  }
}

module.exports = { sendMessage, getQR, getStatus, disconnect, connectSession }
