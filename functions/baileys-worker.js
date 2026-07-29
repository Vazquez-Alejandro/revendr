const express = require('express')
const cors = require('cors')
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const path = require('path')
const fs = require('fs')
const { Server } = require('http')

const logger = pino({ level: 'debug' })

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001
const sessions = new Map()

function getSessionDir(userId) {
  const dir = path.join('/tmp', `wa-session-${userId}`)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function log(userId, msg) {
  console.log(`[Baileys ${userId.slice(0, 8)}] ${msg}`)
}

function getStatusCode(lastDisconnect) {
  if (!lastDisconnect) return undefined
  if (lastDisconnect.statusCode !== undefined) return lastDisconnect.statusCode
  if (lastDisconnect.error?.output?.statusCode !== undefined) return lastDisconnect.error.output.statusCode
  if (lastDisconnect.error?.status !== undefined) return lastDisconnect.error.status
  if (lastDisconnect.error?.error?.output?.statusCode !== undefined) return lastDisconnect.error.error.output.statusCode
  const raw = String(lastDisconnect)
  const m = raw.match(/code[=:]?\s*(\d{3})/)
  if (m) return parseInt(m[1])
  return undefined
}

function setupSocket(userId, sock, session, sessionDir, saveCreds) {
  session.lastActivity = Date.now()

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    session.lastActivity = Date.now()
    const { connection, lastDisconnect, qr, pairingCode } = update

    if (pairingCode) {
      session.pairingCode = pairingCode
      session.status = 'waiting_pairing_code'
      log(userId, `Pairing code: ${pairingCode}`)
    }

    if (qr) {
      session.qr = qr
      session.status = 'waiting_qr'
      log(userId, 'QR generated')
    }

    if (connection === 'open') {
      session.status = 'connected'
      session.qr = null
      session.pairingCode = null
      session.user = sock.user
      session.pairingAttempted = false
      session.reconnectCount = 0
      log(userId, `Connected! Phone: ${sock.user?.id?.split(':')[0]}`)
    }

    if (connection === 'close') {
      const statusCode = getStatusCode(lastDisconnect)
      log(userId, `Closed. code=${statusCode}`)

      if (statusCode === DisconnectReason.loggedOut) {
        session.status = 'logged_out'
        session.user = null
        session.qr = null
        session.pairingCode = null
        try { fs.rmSync(sessionDir, { recursive: true, force: true }) } catch {}
        return
      }

      if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
        log(userId, 'restartRequired (515) - reconnecting with saved creds...')
        session.status = 'reconnecting'
        session.qr = null
        session.pairingCode = null
        session.user = null
        setTimeout(() => {
          connectUser(userId).catch(e => log(userId, `Reconnect error: ${e.message}`))
        }, 2000)
        return
      }

      if (statusCode === 405) {
        log(userId, '405 Connection Failure - WhatsApp rejected connection')
        session.status = 'error_405'
        session.user = null
        session.qr = null
        session.pairingCode = null
        return
      }

      log(userId, `Disconnected. Will auto-reconnect in 5s (attempt ${(session.reconnectCount || 0) + 1})`)
      session.status = 'disconnected'
      session.user = null
      session.qr = null
      session.pairingCode = null
      session.sock = null
      clearTimeout(session.watchdog)
      session.reconnectCount = (session.reconnectCount || 0) + 1
      if (session.reconnectCount <= 5) {
        setTimeout(() => {
          connectUser(userId).catch(e => log(userId, `Auto-reconnect error: ${e.message}`))
        }, 5000)
      } else {
        log(userId, 'Max auto-reconnect attempts reached (5). Stopping.')
      }
    }
  })

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    session.lastActivity = Date.now()
    if (type !== 'notify') return
    for (const msg of messages) {
      try {
        const dir = msg.key?.fromMe ? 'Outgoing' : 'Incoming'
        log(userId, `${dir} ${msg.key?.remoteJid}: ${msg.message?.conversation?.slice(0, 50) || '(non-text)'}`)
      } catch {}
    }
  })
  sock.ev.on('messages.update', (updates) => {
    session.lastActivity = Date.now()
    for (const u of updates) {
      try {
        if (u.status && u.key?.fromMe) {
          const statuses = { 1: 'sent', 2: 'delivered', 3: 'read' }
          log(userId, `Msg update ${u.key.id}: ${statuses[u.status] || u.status}`)
        }
      } catch {}
    }
  })

  session.watchdog = setInterval(() => {
    const idle = Date.now() - session.lastActivity
    if (session.status === 'waiting_qr' && idle > 90000) {
      log(userId, `Watchdog: no QR scan for ${idle}ms, reconnecting...`)
      clearInterval(session.watchdog)
      connectUser(userId).catch(e => log(userId, `Watchdog reconnect error: ${e.message}`))
    }
  }, 10000)
}

async function connectUser(userId) {
  const existing = sessions.get(userId)
  if (existing?.sock) {
    clearInterval(existing.watchdog)
    try { existing.sock.end() } catch {}
    sessions.delete(userId)
  }

  const session = { sock: null, status: 'connecting', qr: null, pairingCode: null, user: null, pairingAttempted: false, lastActivity: Date.now(), watchdog: null }
  sessions.set(userId, session)

  const sessionDir = getSessionDir(userId)
  log(userId, 'Loading auth state...')
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  const { version, isLatest } = await fetchLatestWaWebVersion()
  log(userId, `WA version: ${version.join('.')} (from web: ${isLatest})`)

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '145.0.0'],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    qrTimeout: 120000,
  })

  session.sock = sock
  setupSocket(userId, sock, session, sessionDir, saveCreds)
}

app.post('/connect', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const existing = sessions.get(userId)
  if (existing?.sock && existing.status === 'connected') {
    return res.json({ status: 'connected', qr: null })
  }
  if (existing?.status === 'reconnecting') {
    return res.json({ status: 'reconnecting', qr: null })
  }

  try {
    await connectUser(userId)
    const session = sessions.get(userId)
    for (let i = 0; i < 20; i++) {
      if (session?.qr || session?.pairingCode || session?.status === 'connected' || session?.status === 'error_405') break
      await new Promise(r => setTimeout(r, 1000))
    }
    const s = sessions.get(userId)
    res.json({
      status: s?.status || 'disconnected',
      qr: s?.qr || null,
      pairingCode: s?.pairingCode || null,
      phone: s?.user?.id?.split(':')[0] || null
    })
  } catch (err) {
    log(userId, `Connect error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

app.post('/pair-code', async (req, res) => {
  const { userId, phone } = req.body
  if (!userId || !phone) return res.status(400).json({ error: 'userId and phone required' })
  const session = sessions.get(userId)
  if (!session?.sock) return res.status(400).json({ error: 'Not connected. Call /connect first' })
  try {
    const code = await session.sock.requestPairingCode(phone)
    session.pairingCode = code
    session.status = 'waiting_pairing_code'
    log(userId, `Pairing code for ${phone}: ${code}`)
    res.json({ pairingCode: code, status: 'waiting_pairing_code' })
  } catch (err) {
    log(userId, `Pair-code error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

app.get('/qr', (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })
  const session = sessions.get(userId)
  if (!session) return res.json({ status: 'disconnected', qr: null })
  res.json({
    status: session.status,
    qr: session.qr || null,
    pairingCode: session.pairingCode || null,
    phone: session.user?.id?.split(':')[0] || null
  })
})

app.post('/send-message', async (req, res) => {
  const { userId, phone, text } = req.body
  if (!userId || !phone || !text) return res.status(400).json({ error: 'userId, phone, text required' })
  const session = sessions.get(userId)
  if (!session?.sock || session.status !== 'connected') return res.status(400).json({ error: 'Not connected' })
  try {
    const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net'
    log(userId, `sendMessage to ${jid}: "${text.slice(0, 50)}"`)
    const result = await session.sock.sendMessage(jid, { text })
    log(userId, `sendMessage OK: id=${result.key.id}, status=${result.status}`)
    res.json({ messageId: result.key.id, status: 'sent' })
  } catch (err) {
    log(userId, `sendMessage ERROR: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

app.post('/send-test', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  const session = sessions.get(userId)
  if (!session?.sock || session.status !== 'connected') return res.status(400).json({ error: 'Not connected' })
  try {
    const sock = session.sock
    const myJid = session.user?.id
    const pnJid = '5491158210746@s.whatsapp.net'
    log(userId, `sendTest: myJid=${myJid}, pnJid=${pnJid}`)
    log(userId, `ws open? ${sock.ws?.isOpen}`)
    // Try sending via raw relayMessage directly
    const { generateWAMessage, proto } = require('@whiskeysockets/baileys')
    const msg = await generateWAMessage(pnJid, { text: 'Test directo' }, { userJid: myJid })
    log(userId, `generated msg id=${msg.key.id}`)
    const msgRelayOpts = { messageId: msg.key.id, useCachedGroupMetadata: false }
    try {
      await sock.relayMessage(pnJid, msg.message, msgRelayOpts)
      log(userId, `relayMessage OK`)
    } catch (e) {
      log(userId, `relayMessage ERR: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 3000))
    log(userId, `sendTest done`)
    res.json({ messageId: msg.key.id, status: 'sent' })
  } catch (err) {
    log(userId, `sendTest ERROR: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

app.post('/disconnect', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  const session = sessions.get(userId)
  if (session?.sock) {
    clearInterval(session.watchdog)
    try { session.sock.end() } catch {}
  }
  sessions.delete(userId)
  const sessionDir = getSessionDir(userId)
  try { fs.rmSync(sessionDir, { recursive: true, force: true }) } catch {}
  res.json({ status: 'disconnected' })
})

app.get('/health', (req, res) => {
  const statuses = {}
  for (const [uid, s] of sessions) statuses[uid] = `${s.status} ${s.sock?.ws ? (s.sock.ws.isOpen ? '(ws:open)' : '(ws:closed)') : '(no ws)'}`
  res.json({ status: 'ok', sessions: sessions.size, connections: statuses })
})

process.on('unhandledRejection', (err) => {
  console.error('[BaileysWorker] Unhandled rejection:', err?.message || err?.stack || err)
})
process.on('uncaughtException', (err) => {
  console.error('[BaileysWorker] Uncaught exception:', err?.message || err?.stack || err)
})

const server = Server(app)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🟢 Baileys Worker running on http://0.0.0.0:${PORT}`)
  console.log(`  Connect:      POST /connect   { userId }`)
  console.log(`  QR/status:    GET  /qr?userId=xxx`)
  console.log(`  Pair Code:    POST /pair-code { userId, phone }`)
  console.log(`  Send msg:     POST /send-message { userId, phone, text }`)
  console.log(`  Disconnect:   POST /disconnect   { userId }`)
  console.log(`  Health:       GET  /health\n`)
})

process.on('SIGINT', () => {
  console.log('\n[BaileysWorker] Shutting down...')
  for (const [uid, s] of sessions) {
    clearInterval(s.watchdog)
    try { s.sock?.end() } catch {}
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  for (const [uid, s] of sessions) {
    clearInterval(s.watchdog)
    try { s.sock?.end() } catch {}
  }
  process.exit(0)
})
