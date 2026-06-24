const { db } = require('../config')

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

function generateEmailTemplate(lead, product, messageType = 'initial', campaignId = null) {
  const negocio = lead.nombre_negocio || 'tu negocio'
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

module.exports = {
  calculateLeadScore, getScoreLabel, getTemperature, autoScoreLead,
  MESSAGE_TEMPLATES, generatePersonalizedMessage,
  generateEmailTemplate,
  SEQUENCE_RULES,
}
