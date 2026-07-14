const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const path = require('path')
const fs = require('fs')
const { db, admin } = require('../config')
const warmup = require('./warmup')

const sessions = new Map()
const qrCodes = new Map()

function getSessionDir(userId) {
  const dir = path.join('/tmp', `wa-session-${userId}`)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function connectSession(userId) {
  if (sessions.has(userId)) {
    const sock = sessions.get(userId)
    if (sock.ws?.readyState === 1) return { sock, status: 'connected' }
  }

  const sessionDir = getSessionDir(userId)
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Revendr', 'Chrome', '4.0.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrCodes.set(userId, qr)
      await db.collection('usuarios').doc(userId).update({
        'whatsapp_config.baileys_qr': qr,
        'whatsapp_config.baileys_status': 'waiting_qr',
        'whatsapp_config.baileys_updated_at': new Date(),
      }).catch(() => {})
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      if (statusCode === DisconnectReason.loggedOut) {
        sessions.delete(userId)
        qrCodes.delete(userId)
        await db.collection('usuarios').doc(userId).update({
          'whatsapp_config.baileys_status': 'logged_out',
          'whatsapp_config.baileys_updated_at': new Date(),
        }).catch(() => {})
        try { fs.rmSync(sessionDir, { recursive: true, force: true }) } catch {}
      } else if (shouldReconnect) {
        setTimeout(() => connectSession(userId).catch(() => {}), 3000)
      }
    }

    if (connection === 'open') {
      qrCodes.delete(userId)
      const me = sock.user
      await db.collection('usuarios').doc(userId).update({
        'whatsapp_config.baileys_status': 'connected',
        'whatsapp_config.baileys_phone': me?.id?.split(':')[0] || '',
        'whatsapp_config.baileys_qr': admin.firestore.FieldValue.delete(),
        'whatsapp_config.baileys_connected_at': new Date(),
        'whatsapp_config.baileys_updated_at': new Date(),
      }).catch(() => {})
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      await handleIncomingMessage(userId, msg).catch(console.error)
    }
  })

  sessions.set(userId, sock)
  return { sock, status: 'connecting' }
}

async function handleIncomingMessage(userId, message) {
  const from = message.key.remoteJid
  if (from.endsWith('@g.us')) return

  const phone = from.replace('@s.whatsapp.net', '')
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || ''

  const conversationsRef = db.collection('whatsapp_conversations')
  const q = conversationsRef.where('user_id', '==', userId).where('contact_phone', '==', phone).limit(1)
  const snapshot = await q.get()

  let conversationId
  if (snapshot.empty) {
    const lead = await findLeadByPhone(userId, phone)
    const newConvo = await conversationsRef.add({
      user_id: userId,
      contact_phone: phone,
      contact_name: message.pushName || lead?.nombre_negocio || phone,
      lead_id: lead?.id || null,
      last_message_at: new Date(),
      unread_count: 1,
      status: 'active',
      provider: 'baileys',
      created_at: new Date(),
    })
    conversationId = newConvo.id
  } else {
    conversationId = snapshot.docs[0].id
    await conversationsRef.doc(conversationId).update({
      last_message_at: new Date(),
      unread_count: (snapshot.docs[0].data().unread_count || 0) + 1,
      contact_name: message.pushName || snapshot.docs[0].data().contact_name,
    })
  }

  await db.collection('whatsapp_messages').add({
    conversation_id: conversationId,
    user_id: userId,
    contact_phone: phone,
    direction: 'incoming',
    message_type: 'text',
    content: text,
    whatsapp_message_id: message.key.id,
    timestamp: new Date(parseInt(message.messageTimestamp) * 1000),
    status: 'received',
    provider: 'baileys',
    created_at: new Date(),
  })
}

async function findLeadByPhone(userId, phone) {
  try {
    const snapshot = await db.collection('leads')
      .where('user_id', '==', userId)
      .where('telefono_whatsapp', '==', phone)
      .limit(1).get()
    if (snapshot.empty) return null
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
  } catch { return null }
}

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

  const { sock } = await connectSession(userId)
  const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net'

  const result = await sock.sendMessage(jid, { text })

  await warmup.incrementDailyUsage(userId)

  return {
    messageId: result.key.id,
    status: 'sent',
    timestamp: new Date(),
    warmup: {
      day: warmupCheck.warmupDay,
      dailyCount: warmupCheck.dailyCount + 1,
      maxToday: warmupCheck.maxToday,
    },
  }
}

async function getQR(userId) {
  return qrCodes.get(userId) || null
}

async function getStatus(userId) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  const config = userDoc.data()?.whatsapp_config || {}
  return {
    status: config.baileys_status || 'disconnected',
    phone: config.baileys_phone || null,
    connected_at: config.baileys_connected_at || null,
  }
}

async function disconnect(userId) {
  const sock = sessions.get(userId)
  if (sock) {
    try { sock.end() } catch {}
    sessions.delete(userId)
  }
  qrCodes.delete(userId)

  const sessionDir = getSessionDir(userId)
  try { fs.rmSync(sessionDir, { recursive: true, force: true }) } catch {}

  await db.collection('usuarios').doc(userId).update({
    'whatsapp_config.baileys_status': 'disconnected',
    'whatsapp_config.baileys_phone': admin.firestore.FieldValue.delete(),
    'whatsapp_config.baileys_qr': admin.firestore.FieldValue.delete(),
    'whatsapp_config.baileys_updated_at': new Date(),
  }).catch(() => {})
}

module.exports = { connectSession, sendMessage, getQR, getStatus, disconnect }
