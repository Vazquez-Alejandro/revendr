const { db, axios, WHATSAPP_TOKEN, PHONE_NUMBER_ID } = require('../config')

async function sendMessage(phoneId, token, phone, text, templateData = null) {
  const resolvedPhoneId = phoneId || PHONE_NUMBER_ID
  const resolvedToken = token || WHATSAPP_TOKEN

  if (!resolvedPhoneId || !resolvedToken) {
    throw new Error('Meta Cloud API credentials not configured')
  }

  if (templateData) {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${resolvedPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateData.name,
          language: { code: templateData.language || 'es' },
          ...(templateData.components?.length > 0 && {
            components: templateData.components,
          }),
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return {
      messageId: response.data.messages?.[0]?.id,
      status: 'sent',
      timestamp: new Date(),
    }
  }

  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${resolvedPhoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: phone.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        'Authorization': `Bearer ${resolvedToken}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return {
    messageId: response.data.messages?.[0]?.id,
    status: 'sent',
    timestamp: new Date(),
  }
}

module.exports = { sendMessage }