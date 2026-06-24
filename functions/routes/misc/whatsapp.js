const { db, axios, WHATSAPP_TOKEN, PHONE_NUMBER_ID } = require('../../config')

module.exports = function(app) {

app.get('/whatsapp/config', async (req, res) => {
  const configured = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID)
  res.json({ success: true, data: { configured, provider: configured ? 'Meta Cloud API' : 'none', phone_number_id: configured ? PHONE_NUMBER_ID : null, status: configured ? 'active' : 'not_configured' } })
})

app.post('/whatsapp/send-template', async (req, res) => {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return res.status(503).json({ success: false, error: { message: 'WhatsApp Business API no configurada', code: 'WHATSAPP_NOT_CONFIGURED' } })
  try {
    const { to, templateName, languageCode, params } = req.body
    if (!to || !templateName) return res.status(400).json({ success: false, error: { message: 'to and templateName required' } })
    const components = params?.length > 0 ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : []
    const response = await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: { name: templateName, language: { code: languageCode || 'es' }, ...(components.length > 0 && { components }) } }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } })
    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) { console.error('WhatsApp template error:', error.response?.data || error.message); res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } }) }
})

}
