const { db } = require('../config')

const REENGAGEMENT_CONFIG = {
  hoursAfterVisit: 24,
  messageTemplate: 'Hola {nombre}, veo que visitaste nuestra propuesta. ¿Tenés alguna duda? Respondemos al toque.',
}

async function checkAndTriggerReengagement(userId) {
  try {
    const leadsSnapshot = await db.collection('leads')
      .where('user_id', '==', userId)
      .get()

    const triggers = []
    const now = new Date()

    for (const doc of leadsSnapshot.docs) {
      const lead = doc.data()

      if (!lead.telefono_whatsapp) continue
      if (lead.reengagement_sent) continue

      const lastVisit = lead.fecha_ultima_visita?.toDate?.()
      if (!lastVisit) continue

      const hoursSinceVisit = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60)
      if (hoursSinceVisit >= REENGAGEMENT_CONFIG.hoursAfterVisit && hoursSinceVisit <= 72) {
        const prevEngagement = lead.previous_engagement_level || 'ignored'
        if (prevEngagement === 'ignored') {
          triggers.push({
            id: doc.id,
            nombre_negocio: lead.nombre_negocio,
            telefono_whatsapp: lead.telefono_whatsapp,
            message: REENGAGEMENT_CONFIG.messageTemplate
              .replace('{nombre}', lead.nombre_negocio || ''),
          })
        }
      }
    }

    return triggers
  } catch (error) {
    console.error('Error checking re-engagement triggers:', error.message)
    return []
  }
}

async function markReengagementSent(userId, leadId) {
  try {
    await db.collection('leads').doc(leadId).update({
      reengagement_sent: true,
      reengagement_sent_at: new Date(),
    })
  } catch (error) {
    console.error('Error marking re-engagement sent:', error.message)
  }
}

module.exports = { REENGAGEMENT_CONFIG, checkAndTriggerReengagement, markReengagementSent }
