const { db, axios, getWhatsAppConfig } = require('../../config')

module.exports = function(app) {

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'revendr-webhook-verify-token'

app.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified')
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

app.post('/whatsapp/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] || ''
    const rawBody = req.rawBody || JSON.stringify(req.body)
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (!appSecret) {
      console.error('WHATSAPP_APP_SECRET no configurado; rechazando webhook sin validación de firma')
      return res.sendStatus(401)
    }
    if (!signature) {
      console.error('Missing X-Hub-Signature-256 header')
      return res.sendStatus(401)
    }
    const crypto = require('crypto')
    const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
    const expectedSig = `sha256=${expected}`
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      console.error('Invalid webhook signature')
      return res.sendStatus(403)
    }

    res.sendStatus(200)

    const body = req.body
    if (body.object !== 'whatsapp_business_account') return

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue

        const value = change.value
        const phoneNumberId = value.metadata?.phone_number_id

        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(phoneNumberId, message, value.contacts)
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(phoneNumberId, status)
          }
        }
      }
    }
  } catch (error) {
    console.error('Webhook error:', error)
  }
})

async function handleIncomingMessage(phoneNumberId, message, contacts) {
  try {
    const from = message.from
    const contact = contacts?.find(c => c.wa_id === from)
    const contactName = contact?.profile?.name || ''

    const usersSnapshot = await db.collection('usuarios')
      .where('whatsapp_config.phone_number_id', '==', phoneNumberId)
      .get()

    if (usersSnapshot.empty) return

    await processMessageForUser(usersSnapshot.docs[0].id, from, contactName, message)
  } catch (error) {
    console.error('Error handling incoming message:', error)
  }
}

async function processMessageForUser(userId, from, contactName, message) {
  const conversationsRef = db.collection('whatsapp_conversations')
  const q = conversationsRef
    .where('user_id', '==', userId)
    .where('contact_phone', '==', from)
    .limit(1)
  const snapshot = await q.get()

  let conversationId
  if (snapshot.empty) {
    const lead = await findLeadByPhone(userId, from)
    const newConvo = await conversationsRef.add({
      user_id: userId,
      contact_phone: from,
      contact_name: contactName || lead?.nombre_negocio || from,
      lead_id: lead?.id || null,
      last_message_at: new Date(),
      unread_count: 1,
      status: 'active',
      created_at: new Date(),
    })
    conversationId = newConvo.id
  } else {
    conversationId = snapshot.docs[0].id
    await conversationsRef.doc(conversationId).update({
      last_message_at: new Date(),
      unread_count: (snapshot.docs[0].data().unread_count || 0) + 1,
      contact_name: contactName || snapshot.docs[0].data().contact_name,
    })
  }

  let messageContent = ''
  let messageType = message.type
  let mediaUrl = null

  switch (message.type) {
    case 'text':
      messageContent = message.text?.body || ''
      break
    case 'image':
      messageContent = message.image?.caption || '[Imagen]'
      mediaUrl = message.image?.id
      break
    case 'video':
      messageContent = message.video?.caption || '[Video]'
      mediaUrl = message.video?.id
      break
    case 'document':
      messageContent = message.document?.caption || message.document?.filename || '[Documento]'
      mediaUrl = message.document?.id
      break
    case 'audio':
      messageContent = '[Audio]'
      mediaUrl = message.audio?.id
      break
    case 'location':
      messageContent = `[Ubicación: ${message.location?.latitude}, ${message.location?.longitude}]`
      break
    case 'sticker':
      messageContent = '[Sticker]'
      mediaUrl = message.sticker?.id
      break
    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        messageContent = message.interactive.button_reply?.title || ''
      } else if (message.interactive?.type === 'list_reply') {
        messageContent = message.interactive.list_reply?.title || ''
      }
      break
    default:
      messageContent = `[${message.type}]`
  }

  await db.collection('whatsapp_messages').add({
    conversation_id: conversationId,
    user_id: userId,
    contact_phone: from,
    direction: 'incoming',
    message_type: messageType,
    content: messageContent,
    media_url: mediaUrl,
    whatsapp_message_id: message.id,
    timestamp: new Date(parseInt(message.timestamp) * 1000),
    status: 'received',
    created_at: new Date(),
  })

  await db.collection('leads').where('user_id', '==', userId).where('telefono_whatsapp', '==', from).limit(1).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        snapshot.docs[0].ref.update({
          fecha_ultimo_mensaje: new Date(),
          ultimo_mensaje: messageContent,
          mensajes_no_leidos: (snapshot.docs[0].data().mensajes_no_leidos || 0) + 1,
        })
      }
    })
}

async function handleStatusUpdate(phoneNumberId, status) {
  try {
    const messageRef = await db.collection('whatsapp_messages')
      .where('whatsapp_message_id', '==', status.id)
      .limit(1)
      .get()

    if (!messageRef.empty) {
      const updates = { status: status.status }
      if (status.status === 'delivered') updates.delivered_at = new Date()
      if (status.status === 'read') updates.read_at = new Date()
      await messageRef.docs[0].ref.update(updates)
    }
  } catch (error) {
    console.error('Error handling status update:', error)
  }
}

async function findLeadByPhone(userId, phone) {
  try {
    const snapshot = await db.collection('leads')
      .where('user_id', '==', userId)
      .where('telefono_whatsapp', '==', phone)
      .limit(1)
      .get()
    if (snapshot.empty) return null
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
  } catch {
    return null
  }
}

app.post('/whatsapp/conversations/:conversationId/send', async (req, res) => {
  try {
    const { conversationId } = req.params
    const { message } = req.body

    const convoDoc = await db.collection('whatsapp_conversations').doc(conversationId).get()
    if (!convoDoc.exists) return res.status(404).json({ success: false, error: { message: 'Conversation not found' } })
    const conversation = convoDoc.data()

    if (conversation.user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } })

    const whatsappService = require('../../services/whatsapp')
    const result = await whatsappService.sendMessage(req.user.uid, conversation.contact_phone, message)

    await db.collection('whatsapp_messages').add({
      conversation_id: conversationId,
      user_id: req.user.uid,
      contact_phone: conversation.contact_phone,
      direction: 'outgoing',
      message_type: 'text',
      content: message,
      whatsapp_message_id: result.messageId,
      timestamp: new Date(),
      status: 'sent',
      created_at: new Date(),
    })

    await db.collection('whatsapp_conversations').doc(conversationId).update({
      last_message_at: new Date(),
      last_message_preview: message.substring(0, 100),
    })

    res.json({ success: true, data: { messageId: result.messageId } })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/conversations', async (req, res) => {
  try {
    const snapshot = await db.collection('whatsapp_conversations')
      .where('user_id', '==', req.user.uid)
      .orderBy('last_message_at', 'desc')
      .limit(50)
      .get()

    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json({ success: true, data: conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/whatsapp/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params
    const { limit: limitParam = 50 } = req.query

    const convoDoc = await db.collection('whatsapp_conversations').doc(conversationId).get()
    if (!convoDoc.exists) return res.status(404).json({ success: false, error: { message: 'Conversation not found' } })
    if (convoDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } })

    const snapshot = await db.collection('whatsapp_messages')
      .where('conversation_id', '==', conversationId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limitParam))
      .get()

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })).reverse()

    await db.collection('whatsapp_conversations').doc(conversationId).update({ unread_count: 0 })

    res.json({ success: true, data: messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/whatsapp/conversations/:conversationId/read', async (req, res) => {
  try {
    const convoDoc = await db.collection('whatsapp_conversations').doc(req.params.conversationId).get()
    if (!convoDoc.exists) return res.status(404).json({ success: false, error: { message: 'Conversation not found' } })
    if (convoDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } })
    await db.collection('whatsapp_conversations').doc(req.params.conversationId).update({ unread_count: 0 })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

}
