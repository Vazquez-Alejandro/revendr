const { db, admin } = require('../config')

async function getLeadEngagementStatus(userId) {
  const leadsSnapshot = await db.collection('leads')
    .where('user_id', '==', userId)
    .get()

  const leads = []
  for (const doc of leadsSnapshot.docs) {
    const lead = doc.data()
    const engagement = categorizeEngagement(lead)
    leads.push({
      id: doc.id,
      nombre_negocio: lead.nombre_negocio,
      telefono_whatsapp: lead.telefono_whatsapp,
      email: lead.email,
      estado_proceso: lead.estado_proceso,
      engagement,
      fecha_ultimo_mensaje: lead.fecha_ultimo_mensaje?.toDate?.() || null,
      fecha_envio_whatsapp: lead.fecha_envio_whatsapp?.toDate?.() || null,
      fecha_creacion: lead.fecha_creacion?.toDate?.() || null,
    })
  }

  return {
    engaged: leads.filter(l => l.engagement.level === 'engaged'),
    ignored: leads.filter(l => l.engagement.level === 'ignored'),
    converted: leads.filter(l => l.engagement.level === 'converted'),
    pending: leads.filter(l => l.engagement.level === 'pending'),
  }
}

function categorizeEngagement(lead) {
  if (lead.estado_proceso === 'cliente_activo') {
    return { level: 'converted', label: 'Convirtió', color: 'emerald' }
  }

  const hasOpened = (lead.landing_views || 0) > 0
  const hasClicked = (lead.cta_clicks || 0) > 0
  const hasResponded = (lead.mensajes_leidos || 0) > 0 || (lead.respuestas_whatsapp || 0) > 0
  const hasTimeOnPage = (lead.tiempo_total_landing || 0) > 30

  if (hasClicked || (hasOpened && hasTimeOnPage)) {
    return { level: 'engaged', label: 'Abrió/Interesado', color: 'blue' }
  }

  if (hasOpened) {
    return { level: 'viewed', label: 'Vio el link', color: 'amber' }
  }

  if (lead.fecha_envio_whatsapp) {
    const daysSinceSend = Math.floor((Date.now() - lead.fecha_envio_whatsapp.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSend > 3 && !hasResponded) {
      return { level: 'ignored', label: 'Ignoró', color: 'red' }
    }
  }

  return { level: 'pending', label: 'Pendiente', color: 'gray' }
}

async function checkReengagement(userId, newLeads) {
  const existingLeadsSnapshot = await db.collection('leads')
    .where('user_id', '==', userId)
    .get()

  const existingPhones = new Map()
  const existingEmails = new Map()

  for (const doc of existingLeadsSnapshot.docs) {
    const lead = doc.data()
    if (lead.telefono_whatsapp) {
      existingPhones.set(lead.telefono_whatsapp, { id: doc.id, ...lead })
    }
    if (lead.email) {
      existingEmails.set(lead.email, { id: doc.id, ...lead })
    }
  }

  const reengagements = []

  for (const newLead of newLeads) {
    const existingByPhone = newLead.telefono_whatsapp ? existingPhones.get(newLead.telefono_whatsapp) : null
    const existingByEmail = newLead.email ? existingEmails.get(newLead.email) : null
    const existing = existingByPhone || existingByEmail

    if (existing) {
      const daysSinceLastMessage = existing.fecha_envio_whatsapp
        ? Math.floor((Date.now() - existing.fecha_envio_whatsapp.getTime()) / (1000 * 60 * 60 * 24))
        : null

      reengagements.push({
        lead: newLead,
        existingLead: { id: existing.id, nombre_negocio: existing.nombre_negocio },
        lastMessageDaysAgo: daysSinceLastMessage,
        wasConverted: existing.estado_proceso === 'cliente_activo',
        wasIgnored: existing.estado_proceso === 'mensaje_enviado' && !existing.mensajes_leidos,
      })
    }
  }

  return reengagements
}

async function getEligibleLeadsForSending(userId) {
  const leadsSnapshot = await db.collection('leads')
    .where('user_id', '==', userId)
    .get()

  const eligible = []
  for (const doc of leadsSnapshot.docs) {
    const lead = doc.data()
    const engagement = categorizeEngagement(lead)
    const hasPhone = lead.telefono_whatsapp && lead.telefono_whatsapp.length >= 8
    const notSent = !lead.fecha_envio_whatsapp
    const wasIgnored = engagement.level === 'ignored'
    const wasViewed = engagement.level === 'viewed' || engagement.level === 'engaged'

    if (hasPhone && (notSent || wasViewed || wasIgnored)) {
      eligible.push({
        id: doc.id,
        nombre_negocio: lead.nombre_negocio,
        telefono_whatsapp: lead.telefono_whatsapp,
        email: lead.email,
        rubro: lead.rubro,
        engagement,
        lead_score: lead.lead_score || 0,
        landing_views: lead.landing_views || 0,
        cta_clicks: lead.cta_clicks || 0,
      })
    }
  }

  eligible.sort((a, b) => {
    const priority = { engaged: 0, viewed: 1, ignored: 2, pending: 3, converted: 4 }
    const pa = priority[a.engagement.level] ?? 3
    const pb = priority[b.engagement.level] ?? 3
    if (pa !== pb) return pa - pb
    return (b.landing_views || 0) - (a.landing_views || 0)
  })

  return eligible
}

module.exports = { getLeadEngagementStatus, checkReengagement, categorizeEngagement, getEligibleLeadsForSending }
