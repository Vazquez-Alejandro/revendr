const { admin, db, axios, WHATSAPP_TOKEN, PHONE_NUMBER_ID, RESEND_API_KEY, emailTransporter, GMAIL_USER } = require('../config')
const { createNotification, calculateLeadScore, getTemperature, getScoreLabel, autoScoreLead, generatePersonalizedMessage, sendEmail, generateEmailTemplate } = require('../helpers')

module.exports = function(app) {

app.get('/leads', async (req, res) => {
  try {
    const { rubro, estado, limit: limitParam = 50 } = req.query
    let query = db.collection('leads').where('user_id', '==', req.user.uid)
    if (rubro && rubro !== 'todos') query = query.where('rubro', '==', rubro)
    if (estado && estado !== 'todos') query = query.where('estado_proceso', '==', estado)
    const snapshot = await query.orderBy('fecha_creacion', 'desc').limit(parseInt(limitParam)).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/leads/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('leads').where('user_id', '==', req.user.uid).get()
    const stats = { total: 0, byRubro: {}, byStatus: {} }
    snapshot.docs.forEach(doc => {
      const lead = doc.data()
      stats.total++
      stats.byRubro[lead.rubro] = (stats.byRubro[lead.rubro] || 0) + 1
      stats.byStatus[lead.estado_proceso] = (stats.byStatus[lead.estado_proceso] || 0) + 1
    })
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/leads/:leadId/generate-demo', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    const propuestaId = `propuesta-${lead.rubro}-${req.params.leadId}`
    const propuestaData = {
      lead_id: req.params.leadId, nombre_negocio: lead.nombre_negocio, rubro: lead.rubro,
      ciudad: lead.ciudad || 'Argentina', direccion: lead.direccion || '',
      telefono_whatsapp: lead.telefono_whatsapp || '', calificacion: lead.calificacion || 4.8,
      logo: lead.datos_personalizados?.logo || '', website: lead.datos_personalizados?.website || '',
      horarios: lead.datos_personalizados?.horarios || [],
      url_propuesta: `https://revendr-9add8.web.app/demo/${lead.rubro}/${leadDoc.id}`, fecha_creacion: new Date(),
    }
    await db.collection('propuestas').doc(propuestaId).set(propuestaData)
    await db.collection('leads').doc(req.params.leadId).update({
      estado_proceso: 'propuesta_generada', url_propuesta: propuestaData.url_propuesta, propuesta_id: propuestaId,
      fecha_generacion_propuesta: new Date(), fecha_actualizacion: new Date(),
    })
    if (lead.id_campania) {
      await db.collection('campanias').doc(lead.id_campania).update({ propuestas_generadas: admin.firestore.FieldValue.increment(1) })
    }
    createNotification({ userId: req.user?.uid, type: 'propuesta_generated', title: 'Propuesta generada', body: `Propuesta para ${lead.nombre_negocio || 'lead'} lista`, link: `/dashboard/leads` })
    res.json({ success: true, data: { propuestaUrl: propuestaData.url_propuesta, propuestaId } })
  } catch (error) {
    console.error('Error generating propuesta:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/leads/:leadId/generate-message', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    let product = null
    if (req.body.productId) { const prodDoc = await db.collection('productos').doc(req.body.productId).get(); if (prodDoc.exists) product = prodDoc.data() }
    const message = generatePersonalizedMessage(lead, product)
    await db.collection('leads').doc(req.params.leadId).update({ mensaje_personalizado: message, fecha_generacion_mensaje: new Date() })
    res.json({ success: true, data: { message } })
  } catch (error) {
    console.error('Error generating message:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/leads/:leadId/send-email', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    if (!lead.email) return res.status(400).json({ success: false, error: { message: 'Lead has no email' } })
    let product = null
    if (req.body.productId) { const prodDoc = await db.collection('productos').doc(req.body.productId).get(); if (prodDoc.exists) product = prodDoc.data() }
    const messageType = req.body.messageType || 'initial'
    const { subject, html } = generateEmailTemplate(lead, product, messageType)
    const result = await sendEmail(lead.email, subject, html)
    if (result.sent) {
      await db.collection('leads').doc(req.params.leadId).update({ ultimo_email_enviado: messageType, fecha_ultimo_email: new Date(), fecha_actualizacion: new Date() })
      await db.collection('message_events').add({ lead_id: req.params.leadId, campaign_id: lead.id_campania, channel: 'email', event_type: 'sent', message_type: messageType, timestamp: new Date() })
      createNotification({ userId: req.user?.uid, type: 'message_sent', title: 'Email enviado', body: `Email ${messageType} enviado a ${lead.nombre_negocio || lead.email}`, link: `/dashboard/crm` })
    }
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/leads/:leadId/send-whatsapp', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    if (!lead.url_propuesta) return res.status(400).json({ success: false, error: { message: 'Lead has no proposal URL. Generate proposal first.' } })
    const customMessage = req.body.customMessage
    const message = customMessage
      ? customMessage.replace(/{nombre_negocio}/g, lead.nombre_negocio).replace(/{url_propuesta}/g, lead.url_propuesta).replace(/{rubro}/g, lead.rubro)
      : `Hola ${lead.nombre_negocio}, te propuse algo especial para tu ${lead.rubro}.\n\nMirá tu propuesta personalizada: ${lead.url_propuesta}\n\n¿Te gustaría que hablemos?`
    const response = await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to: lead.telefono_whatsapp.replace(/\D/g, ''), type: 'text', text: { body: message } }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } })
    await db.collection('leads').doc(req.params.leadId).update({ estado_proceso: 'mensaje_enviado', whatsapp_message_id: response.data.messages?.[0]?.id, fecha_envio_whatsapp: new Date(), fecha_actualizacion: new Date() })
    if (lead.id_campania) await db.collection('campanias').doc(lead.id_campania).update({ mensajes_enviados: admin.firestore.FieldValue.increment(1) })
    createNotification({ userId: req.user?.uid, type: 'message_sent', title: 'WhatsApp enviado', body: `Mensaje enviado a ${lead.nombre_negocio || 'lead'}`, link: `/dashboard/crm` })
    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) {
    console.error('Error sending WhatsApp:', error.response?.data || error.message)
    res.status(500).json({ success: false, error: { message: error.response?.data?.error?.message || error.message } })
  }
})

app.post('/leads/score-all', async (req, res) => {
  try {
    const { campaignId, minScore } = req.body
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)
    const snapshot = await query.get()
    let scored = 0, qualified = 0, disqualified = 0
    for (const doc of snapshot.docs) {
      const lead = doc.data()
      const score = calculateLeadScore(lead)
      const qualifies = score >= (minScore || 30)
      await doc.ref.update({ lead_score: score, temperatura: getTemperature(score), score_label: getScoreLabel(score).label, qualifies_for_messaging: qualifies })
      scored++; if (qualifies) qualified++; else disqualified++
    }
    res.json({ success: true, data: { scored, qualified, disqualified, total: snapshot.size } })
  } catch (error) {
    console.error('Error scoring leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/leads/score-stats', async (req, res) => {
  try {
    const { campaignId } = req.query
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)
    const snapshot = await query.get()
    const stats = { total: snapshot.size, excellent: 0, good: 0, regular: 0, low: 0, veryLow: 0, avgScore: 0, qualified: 0 }
    let totalScore = 0
    snapshot.docs.forEach(doc => {
      const score = doc.data().lead_score || 0
      totalScore += score
      if (score >= 80) stats.excellent++
      else if (score >= 60) stats.good++
      else if (score >= 40) stats.regular++
      else if (score >= 20) stats.low++
      else stats.veryLow++
      if (score >= 50) stats.qualified++
    })
    stats.avgScore = snapshot.size > 0 ? (totalScore / snapshot.size).toFixed(1) : 0
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching score stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/leads/:leadId/detect-language', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    const idioma = detectarIdioma(lead)
    await db.collection('leads').doc(req.params.leadId).update({ idioma_detectado: idioma, fecha_actualizacion: new Date() })
    res.json({ success: true, data: { idioma } })
  } catch (error) {
    console.error('Error detecting language:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/leads/:leadId/smart-time', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    const lead = leadDoc.data()
    const ciudad = lead.ciudad || 'Buenos Aires'
    res.json({ success: true, data: { ciudad, zona_horaria: getZonaHoraria(ciudad), hora_local: getHoraLocal(ciudad), es_horario_optimal: esHorarioOptimal(ciudad).optimal, razon: esHorarioOptimal(ciudad).reason, mejor_momento_para_enviar: getOptimalSendTime(ciudad).toISOString() } })
  } catch (error) {
    console.error('Error getting smart time:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

}

function detectarIdioma(lead) {
  if (lead.idioma) return lead.idioma
  const city = (lead.ciudad || '').toLowerCase()
  if (city.includes('buenos aires') || city.includes('córdoba') || city.includes('rosario') || city.includes('mendoza')) return 'es'
  if (city.includes('são paulo') || city.includes('rio de janeiro') || city.includes('brasilia')) return 'pt'
  if (city.includes('new york') || city.includes('los angeles') || city.includes('miami') || city.includes('london')) return 'en'
  return 'es'
}

const ZONA_HORARIA_POR_CIUDAD = {
  'Buenos Aires': 'America/Argentina/Buenos_Aires', 'Córdoba': 'America/Argentina/Cordoba',
  'Rosario': 'America/Argentina/Cordoba', 'Mendoza': 'America/Argentina/Mendoza',
  'São Paulo': 'America/Sao_Paulo', 'New York': 'America/New_York',
  'Los Angeles': 'America/Los_Angeles', 'Madrid': 'Europe/Madrid', 'Londres': 'Europe/London',
}

function getZonaHoraria(ciudad) { return ZONA_HORARIA_POR_CIUDAD[ciudad] || 'America/Argentina/Buenos_Aires' }
function getHoraLocal(ciudad) { return new Date().toLocaleString('en-US', { timeZone: getZonaHoraria(ciudad), hour: 'numeric', hour12: false }) }
function getDiaLocal(ciudad) { return new Date().toLocaleString('en-US', { timeZone: getZonaHoraria(ciudad), weekday: 'short' }) }

function esHorarioOptimal(ciudad) {
  const hora = parseInt(getHoraLocal(ciudad)); const dia = getDiaLocal(ciudad)
  if (dia === 'Sat' || dia === 'Sun') return { optimal: false, reason: 'weekend' }
  if (hora >= 9 && hora <= 11) return { optimal: true, reason: 'morning' }
  if (hora >= 14 && hora <= 17) return { optimal: true, reason: 'afternoon' }
  if (hora > 17 && hora < 20) return { optimal: true, reason: 'evening' }
  return { optimal: false, reason: 'off_hours' }
}

function getOptimalSendTime(ciudad) {
  const now = new Date(); const hora = parseInt(getHoraLocal(ciudad)); const dia = getDiaLocal(ciudad)
  if (dia === 'Sat' || dia === 'Sun') { const m = new Date(now); m.setDate(m.getDate() + ((1 + 7 - m.getDay()) % 7 || 7)); m.setHours(10, 0, 0, 0); return m }
  if (hora < 9) { now.setHours(9, 30, 0, 0); return now }
  if (hora >= 11 && hora < 14) { now.setHours(14, 0, 0, 0); return now }
  if (hora >= 17) { now.setDate(now.getDate() + 1); now.setHours(10, 0, 0, 0); return now }
  return now
}
