const { db, admin, WHATSAPP_TOKEN, PHONE_NUMBER_ID } = require('../config')
const metaProvider = require('./whatsapp-meta')
const baileysProvider = require('./whatsapp-baileys')

const SYSTEM_META_CONFIG = WHATSAPP_TOKEN && PHONE_NUMBER_ID
  ? { phone_number_id: PHONE_NUMBER_ID, access_token: WHATSAPP_TOKEN, status: 'active', provider: 'meta' }
  : null

async function getActiveProvider(userId) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  if (!userDoc.exists) return { provider: null, config: {} }
  return resolveProvider(userId, userDoc.data())
}

function resolveProvider(userId, userData) {
  const config = userData.whatsapp_config || {}

  if (config.baileys_status === 'connected') {
    return { provider: 'baileys', config }
  }

  if (config.phone_number_id && config.access_token && config.status === 'active') {
    return { provider: 'meta', config }
  }

  if (SYSTEM_META_CONFIG) {
    return { provider: 'meta', config: SYSTEM_META_CONFIG }
  }

  return { provider: null, config }
}

async function sendMessage(userId, phone, text, options = {}) {
  const { provider, config } = await getActiveProvider(userId)

  if (!provider) {
    throw new Error('No hay proveedor de WhatsApp conectado. Conectá WhatsApp en Settings.')
  }

  if (provider === 'baileys') {
    try {
      return await baileysProvider.sendMessage(userId, phone, text)
    } catch (baileysErr) {
      const isSessionLost =
        baileysErr.message?.includes('Baileys worker') ||
        baileysErr.message?.includes('SESSION_LOST') ||
        baileysErr.message?.includes('ECONNREFUSED') ||
        baileysErr.message?.includes('ECONNRESET')

      if (isSessionLost && config.phone_number_id && config.access_token) {
        console.warn(`[whatsapp] Baileys session lost, falling back to Meta Cloud API: ${baileysErr.message}`)
        return await metaProvider.sendMessage(
          config.phone_number_id,
          config.access_token,
          phone,
          text,
          options.template || null
        )
      }
      throw baileysErr
    }
  }

  if (provider === 'meta') {
    return await metaProvider.sendMessage(
      config.phone_number_id,
      config.access_token,
      phone,
      text,
      options.template || null
    )
  }

  throw new Error('Proveedor desconocido')
}

async function connectBaileys(userId) {
  return await baileysProvider.connectSession(userId)
}

async function getQR(userId) {
  return await baileysProvider.getQR(userId)
}

async function getBaileysStatus(userId) {
  return await baileysProvider.getStatus(userId)
}

async function disconnectBaileys(userId) {
  return await baileysProvider.disconnect(userId)
}

async function getConnectionStatus(userId) {
  const { provider, config } = await getActiveProvider(userId)

  if (provider === 'baileys') {
    const status = await baileysProvider.getStatus(userId)
    return {
      connected: status.status === 'connected',
      provider: 'baileys',
      status: status.status,
      phone: status.phone,
    }
  }

  if (provider === 'meta') {
    return {
      connected: true,
      provider: 'meta',
      status: 'active',
      phone: config.phone_number_id,
    }
  }

  return {
    connected: false,
    provider: null,
    status: 'disconnected',
    phone: null,
  }
}

module.exports = {
  sendMessage,
  connectBaileys,
  getQR,
  getBaileysStatus,
  disconnectBaileys,
  getConnectionStatus,
  getActiveProvider,
}
