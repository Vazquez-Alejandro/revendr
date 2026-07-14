const { db, admin } = require('../config')
const metaProvider = require('./whatsapp-meta')
const baileysProvider = require('./whatsapp-baileys')

async function getActiveProvider(userId) {
  const userDoc = await db.collection('usuarios').doc(userId).get()
  if (!userDoc.exists) {
    const adminDoc = await db.collection('usuarios_admin').doc(userId).get()
    if (!adminDoc.exists) return { provider: null, config: {} }
    const data = adminDoc.data()
    return resolveProvider(userId, data)
  }
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

  return { provider: null, config }
}

async function sendMessage(userId, phone, text, options = {}) {
  const { provider, config } = await getActiveProvider(userId)

  if (!provider) {
    throw new Error('No hay proveedor de WhatsApp conectado. Conectá WhatsApp en Settings.')
  }

  if (provider === 'baileys') {
    return await baileysProvider.sendMessage(userId, phone, text)
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
