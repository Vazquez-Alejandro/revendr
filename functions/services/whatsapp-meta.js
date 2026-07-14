const { db, axios } = require('../config')

async function sendMessage(phoneId, token, phone, text, templateData = null) {
  if (templateData) {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
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
          'Authorization': `Bearer ${token}`,
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
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: phone.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
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
