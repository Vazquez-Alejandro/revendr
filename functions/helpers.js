const { admin, db, axios, APIFY_TOKEN, RESEND_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, emailTransporter, TELEGRAM_BOT_TOKEN, RESEND_FROM } = require('./config')

// ============ NOTIFICATIONS ============

async function createNotification({ userId, type, title, body, link = null, data = {} }) {
  try {
    await db.collection('notificaciones').add({
      userId, type, title, body: body || '', data,
      read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), link,
    })
  } catch (e) {
    console.error('Error creating notification:', e.message)
  }
}

// ============ APIFY HELPERS ============

async function pollApifyRun(runId, campaignId, rubro, userId) {
  const maxAttempts = 60
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    attempts++
    try {
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        { params: { token: APIFY_TOKEN } }
      )
      const run = statusResponse.data.data
      if (run.status === 'SUCCEEDED') {
        await processApifyResults(run.defaultDatasetId, campaignId, rubro, userId)
        return
      }
      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        await db.collection('campanias').doc(campaignId).update({
          scraping_status: 'failed', scraping_error: run.status, scraping_completed_at: new Date(),
        })
        if (userId) {
          createNotification({ userId, type: 'scraping_error', title: 'Error en scraping', body: `El scraping falló: ${run.status}`, link: `/dashboard/campanias` })
        }
        return
      }
    } catch (error) {
      console.error('Error polling Apify:', error.message)
    }
  }
  await db.collection('campanias').doc(campaignId).update({
    scraping_status: 'timeout', scraping_completed_at: new Date(),
  })
}

async function processApifyResults(datasetId, campaignId, rubro, userId) {
  try {
    const response = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      { params: { token: APIFY_TOKEN, format: 'json' } }
    )
    const leads = response.data || []
    let saved = 0
    for (const raw of leads) {
      const phone = raw.phone || raw.telefono || ''
      const phoneClean = phone.replace(/\D/g, '')
      if (!phoneClean || phoneClean.length < 8) continue
      const leadData = {
        id_campania: campaignId, user_id: userId || '',
        nombre_negocio: raw.name || raw.title || raw.nombre || 'Sin nombre',
        telefono_whatsapp: phoneClean.startsWith('54') ? `+${phoneClean}` : `+54${phoneClean}`,
        email: raw.email || '', rubro: rubro || 'general',
        ciudad: raw.city || raw.location || '', direccion: raw.address || raw.direccion || '',
        url_origen: raw.url || raw.placeId || '', url_google_maps: raw.url || '',
        calificacion: raw.totalScore || raw.rating || null,
        reviews_count: raw.reviewsCount || raw.reviews || 0,
        total_reviews: raw.reviewsCount || raw.reviews || 0,
        datos_personalizados: { logo: raw.image || raw.photos?.[0] || '', horarios: raw.openingHours || [], website: raw.website || '' },
        estado_proceso: 'scraped', fecha_creacion: new Date(),
      }
      const score = calculateLeadScore(leadData)
      leadData.lead_score = score
      leadData.temperatura = getTemperature(score)
      leadData.score_label = getScoreLabel(score).label
      leadData.qualifies_for_messaging = score >= 30
      await db.collection('leads').add(leadData)
      saved++
    }
    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'completed', scraping_completed_at: new Date(),
      leads_count: admin.firestore.FieldValue.increment(saved),
    })
    if (userId && saved > 0) {
      createNotification({ userId, type: 'new_lead', title: `${saved} ${saved === 1 ? 'nuevo lead' : 'nuevos leads'} encontrados`, body: `Scraping completado para la campaña`, link: `/dashboard/leads` })
    }
  } catch (error) {
    console.error('Error processing Apify results:', error.message)
    await db.collection('campanias').doc(campaignId).update({
      scraping_status: 'error', scraping_error: error.message, scraping_completed_at: new Date(),
    })
  }
}

// ============ LEAD SCORING (0-100) ============

function calculateLeadScore(lead) {
  let score = 0
  if (lead.reviews_count > 0) score += Math.min(lead.reviews_count, 15)
  if (lead.calificacion >= 4.5) score += 10
  else if (lead.calificacion >= 4.0) score += 5
  else if (lead.calificacion >= 3.0) score += 2
  if (lead.datos_personalizados?.website) score += 10
  if (lead.email) score += 15
  if (lead.telefono_whatsapp) score += 15
  if (lead.datos_personalizados?.horarios?.length > 0) score += 5
  if (lead.datos_personalizados?.logo) score += 5
  if (lead.direccion) score += 5
  if (lead.url_google_maps) score += 5
  if (lead.ciudad) score += 3
  const rubrosPremium = ['inmobiliaria', 'clinica', 'estetica']
  if (rubrosPremium.includes(lead.rubro)) score += 10
  if (lead.nombre_negocio && lead.nombre_negocio !== 'Sin nombre') score += 5
  if (lead.telefono_whatsapp && lead.email) score += 10
  return Math.min(score, 100)
}

function getScoreLabel(score) {
  if (score >= 70) return { label: 'Excelente', color: 'text-emerald-400' }
  if (score >= 50) return { label: 'Bueno', color: 'text-blue-400' }
  if (score >= 30) return { label: 'Regular', color: 'text-amber-400' }
  return { label: 'Bajo', color: 'text-red-400' }
}

function getTemperature(score) {
  if (score >= 60) return 'hot'
  if (score >= 30) return 'warm'
  return 'cold'
}

async function autoScoreLead(leadId, lead) {
  const score = calculateLeadScore(lead)
  const temp = getTemperature(score)
  const label = getScoreLabel(score).label
  await db.collection('leads').doc(leadId).update({
    lead_score: score, temperatura: temp, score_label: label,
    qualifies_for_messaging: score >= 30,
    fecha_actualizacion: new Date(),
  })
}

// ============ AI MESSAGE GENERATOR ============

const MESSAGE_TEMPLATES = {
  inmobiliaria: [
    'Hola {nombre}! 👋 Soy {vendedor} de {empresa}. Te escribo porque vi tu inmobiliaria en {ciudad} y tengo una propuesta que puede interesarte. Hicimos un análisis de tu presencia digital y creemos que podemos ayudarte a captar más clientes. ¿Tenés 5 minutos para verlo?',
    'Hola {nombre}, soy {vendedor}. En {empresa} ayudamos a inmobiliarias como la tuya a conseguir más leads calificados. Te preparamos una propuesta personalizada para tu negocio. ¿Te parecen 5 minutos para mostrártelo?',
  ],
  estetica: [
    'Hola {nombre}! ✨ Soy {vendedor} de {empresa}. Vimos tu centro de estética en {ciudad} y nos encantó. Preparamos una propuesta especial para ayudarte a atraer más clientas. ¿Te tomarías 2 minutos para verla?',
    'Hola {nombre}! 💅 Te habla {vendedor} de {empresa}. Tenemos una herramienta que está ayudando a centros de estética como el tuyo a llenar la agenda. Te dejamos una propuesta para que la veas cuando puedas.',
  ],
  clinica: [
    'Hola {nombre}! 🏥 Soy {vendedor} de {empresa}. Vimos tu clínica/consultorio en {ciudad} y tenemos una propuesta que puede ayudarlos a gestionar mejor sus turnos y pacientes. ¿Te interesa verla?',
  ],
  restaurante: [
    'Hola {nombre}! 🍕 Soy {vendedor} de {empresa}. Vimos tu restaurante en {ciudad} y tenemos una idea para ayudarte a atraer más comensales. Te preparamos una propuesta personalizada. ¿La ves?',
  ],
  gimnasio: [
    'Hola {nombre}! 💪 Soy {vendedor} de {empresa}. Vimos tu gimnasio en {ciudad} y tenemos una herramienta que puede ayudarte a retener y atraer más socios. ¿Te interesa ver la propuesta?',
  ],
  otro: [
    'Hola {nombre}! 👋 Soy {vendedor} de {empresa}. Te escribo porque encontramos tu negocio en {ciudad} y tenemos una propuesta que puede ayudarte a crecer. ¿Tenés 5 minutos para verla?',
  ],
}

function generatePersonalizedMessage(lead, product) {
  const rubro = lead.rubro || 'otro'
  const templates = MESSAGE_TEMPLATES[rubro] || MESSAGE_TEMPLATES.otro
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace(/{nombre}/g, lead.nombre_negocio || '')
    .replace(/{vendedor}/g, product?.vendedor_nombre || 'Alejandro')
    .replace(/{empresa}/g, product?.nombre || 'Revendr')
    .replace(/{ciudad}/g, lead.ciudad || 'tu zona')
}

// ============ EMAIL SENDING (RESEND) ============

async function sendEmail(to, subject, html) {
  try {
    const emailData = { from: RESEND_FROM, to, subject, html }
    if (RESEND_API_KEY) {
      await axios.post('https://api.resend.com/emails', emailData, {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      })
      return { sent: true, provider: 'resend' }
    }
    if (emailTransporter) {
      await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to, subject, html })
      return { sent: true, provider: 'gmail' }
    }
    return { sent: false, reason: 'no_email_provider' }
  } catch (error) {
    console.error('Email error:', error.message)
    return { sent: false, reason: error.message }
  }
}

function generateEmailTemplate(lead, product, messageType = 'initial', campaignId = null) {
  const negocio = lead.nombre_negocio || 'tu negocio'
  const rubro = lead.rubro || 'tu industria'
  let propuestaUrl = lead.url_propuesta || ''
  if (campaignId && propuestaUrl) {
    const utmParams = new URLSearchParams({
      utm_source: 'email',
      utm_medium: 'email_sequence',
      utm_campaign: campaignId,
      utm_content: negocio
    }).toString()
    propuestaUrl = `${propuestaUrl}${propuestaUrl.includes('?') ? '&' : '?'}${utmParams}`
  }
  const templates = {
    initial: { subject: `Propuesta personalizada para ${negocio}`, body: `
      <h1 style="color:#6366f1">Hola ${negocio}</h1>
      <p>En ${product?.nombre || 'Revendr'} analizamos tu negocio y preparamos una propuesta especialmente para vos.</p>
      <p>Hacé clic en el botón para verla:</p>
      <div style="text-align:center;margin:24px 0"><a href="${propuestaUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Ver propuesta</a></div>
      <p style="color:#94a3b8">Saludos,<br>El equipo de ${product?.nombre || 'Revendr'}</p>` },
    reminder: { subject: `Recordatorio: Propuesta para ${negocio}`, body: `
      <h1 style="color:#6366f1">¿Viste tu propuesta?</h1>
      <p>Hace unos días te enviamos una propuesta para ${negocio}. Queríamos asegurarnos de que la hayas visto.</p>
      <div style="text-align:center;margin:24px 0"><a href="${propuestaUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Ver propuesta</a></div>
      <p style="color:#94a3b8">Saludos</p>` },
    discount: { subject: `🎁 Oferta especial para ${negocio}`, body: `
      <h1 style="color:#6366f1">Oferta por tiempo limitado</h1>
      <p>Para ${negocio} tenemos un descuento especial si activás antes de 7 días.</p>
      <div style="text-align:center;margin:24px 0"><a href="${propuestaUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Ver oferta</a></div>` },
    lastChance: { subject: `⏰ Último aviso - Propuesta para ${negocio}`, body: `
      <h1 style="color:#ef4444">Última oportunidad</h1>
      <p>Esta es la última vez que te contactamos sobre la propuesta para ${negocio}. No queremos molestarte, pero la oferta se cierra pronto.</p>
      <div style="text-align:center;margin:24px 0"><a href="${propuestaUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Ver propuesta</a></div>` },
  }
  const t = templates[messageType] || templates.initial
  const baseHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${t.body}<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} Revendr</p></div>`
  return { subject: t.subject, html: baseHtml }
}

// ============ SMART SEQUENCE ENGINE ============

const SEQUENCE_RULES = {
  initial: {
    delayDays: 0, condition: () => true,
    nextStep: 'email_reminder',
  },
  email_reminder: {
    delayDays: 3, condition: (lead) => !lead.cta_clicks || lead.cta_clicks < 1,
    nextStep: 'email_discount',
  },
  email_discount: {
    delayDays: 7, condition: (lead) => !lead.cta_clicks || lead.cta_clicks < 1,
    nextStep: 'email_lastChance',
  },
  email_lastChance: {
    delayDays: 14, condition: (lead) => !lead.cta_clicks || lead.cta_clicks < 1,
    nextStep: null,
  },
}

// ============ EMAIL TEMPLATES ============

async function sendSimpleEmail(to, subject, html) {
  if (!to || !subject || !html) return { sent: false, reason: 'missing_params' }
  try {
    if (RESEND_API_KEY) {
      const res = await axios.post('https://api.resend.com/emails',
        { from: RESEND_FROM, to, subject, html },
        { headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      )
      if (res.status === 200) return { sent: true, provider: 'resend' }
    }
    if (emailTransporter) {
      await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to, subject, html })
      return { sent: true, provider: 'gmail' }
    }
    return { sent: false, reason: 'no_provider_available' }
  } catch (error) {
    console.error('sendSimpleEmail error:', error.message)
    return { sent: false, reason: error.message }
  }
}

async function sendTransactionalEmail(to, type, data = {}) {
  const templates = {
    welcome: { subject: '¡Bienvenido a Revendr!', html: `<h1>¡Bienvenido a Revendr!</h1><p>Estamos emocionados de tenerte a bordo.</p>` },
    email_verification: { subject: 'Verifica tu email en Revendr', html: `<h1>Verifica tu email</h1><p>Hacé clic <a href="${data.link || '#'}">acá</a> para verificar tu email.</p>` },
    plan_change: { subject: 'Plan actualizado', html: `<h1>Plan actualizado a ${data.plan || 'nuevo plan'}</h1>` },
    payment_failed: { subject: 'Problema con tu pago', html: `<h1>Problema con el pago</h1><p>No pudimos procesar tu pago.</p>` },
    subscription_cancelled: { subject: 'Suscripción cancelada', html: `<h1>Suscripción cancelada</h1>` },
    payment_reminder: { subject: 'Recordatorio de pago', html: `<h1>Recordatorio</h1><p>Tu próxima factura vence pronto.</p>` },
  }
  const t = templates[type]
  if (!t) return { sent: false, reason: 'unknown_template' }
  return sendSimpleEmail(to, t.subject, t.html)
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return { sent: false, reason: 'no_telegram_token' }
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false,
    })
    return { sent: true }
  } catch (error) {
    console.error('Telegram error:', error.message)
    return { sent: false, reason: error.message }
  }
}

module.exports = {
  createNotification,
  pollApifyRun, processApifyResults,
  calculateLeadScore, getScoreLabel, getTemperature, autoScoreLead,
  MESSAGE_TEMPLATES, generatePersonalizedMessage,
  sendEmail, generateEmailTemplate,
  SEQUENCE_RULES,
  sendSimpleEmail, sendTransactionalEmail,
  sendTelegramMessage,
}
