const { db } = require('../config')

const FOLLOWUP_CONFIG = {
  maxAttempts: 3,
  daysBetweenAttempts: 3,
  blockDaysAfterMaxAttempts: 40,
}

const FOLLOWUP_MESSAGES = [
  null,
  'Hola {nombre}, te escribí hace unos días sobre tu propuesta. ¿Podés revisarla? {url}',
  'Hola {nombre}, último mensaje. Si te interesa, mirá la propuesta: {url}',
]

async function getFollowupStatus(userId, leadId) {
  try {
    const doc = await db.collection('leads').doc(leadId).get()
    if (!doc.exists) return null

    const lead = doc.data()
    if (lead.user_id !== userId) return null

    const followup = lead.followup || {
      attempts: 0,
      lastAttempt: null,
      blockedUntil: null,
      completed: false,
    }

    if (followup.blockedUntil) {
      const blockedDate = followup.blockedUntil?.toDate?.() || new Date(followup.blockedUntil)
      if (blockedDate > new Date()) {
        return { ...followup, status: 'blocked', blockedUntil: blockedDate }
      }
      followup.attempts = 0
      followup.blockedUntil = null
      followup.completed = false
      await db.collection('leads').doc(leadId).update({ followup })
    }

    if (followup.completed) {
      return { ...followup, status: 'completed' }
    }

    if (followup.attempts >= FOLLOWUP_CONFIG.maxAttempts) {
      const blockedUntil = new Date()
      blockedUntil.setDate(blockedUntil.getDate() + FOLLOWUP_CONFIG.blockDaysAfterMaxAttempts)
      followup.blockedUntil = blockedUntil
      followup.completed = true
      await db.collection('leads').doc(leadId).update({ followup })
      return { ...followup, status: 'blocked', blockedUntil }
    }

    if (followup.lastAttempt) {
      const lastDate = followup.lastAttempt?.toDate?.() || new Date(followup.lastAttempt)
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < FOLLOWUP_CONFIG.daysBetweenAttempts) {
        return { ...followup, status: 'waiting', daysLeft: FOLLOWUP_CONFIG.daysBetweenAttempts - daysSince }
      }
    }

    return { ...followup, status: 'ready', nextAttempt: followup.attempts + 1 }
  } catch (error) {
    console.error('Error getting followup status:', error.message)
    return null
  }
}

async function recordFollowupAttempt(userId, leadId) {
  try {
    const doc = await db.collection('leads').doc(leadId).get()
    if (!doc.exists) return

    const lead = doc.data()
    if (lead.user_id !== userId) return

    const followup = lead.followup || { attempts: 0, lastAttempt: null, blockedUntil: null, completed: false }
    followup.attempts++
    followup.lastAttempt = new Date()

    if (followup.attempts >= FOLLOWUP_CONFIG.maxAttempts) {
      const blockedUntil = new Date()
      blockedUntil.setDate(blockedUntil.getDate() + FOLLOWUP_CONFIG.blockDaysAfterMaxAttempts)
      followup.blockedUntil = blockedUntil
      followup.completed = true
    }

    await db.collection('leads').doc(leadId).update({ followup })
    return followup
  } catch (error) {
    console.error('Error recording followup attempt:', error.message)
  }
}

function getFollowupMessage(lead, attemptNumber) {
  const template = FOLLOWUP_MESSAGES[attemptNumber] || FOLLOWUP_MESSAGES[FOLLOWUP_MESSAGES.length - 1]
  return template
    .replace('{nombre}', lead.nombre_negocio || '')
    .replace('{url}', lead.url_propuesta || '')
}

async function getLeadsNeedingFollowup(userId) {
  try {
    const leadsSnapshot = await db.collection('leads')
      .where('user_id', '==', userId)
      .get()

    const needsFollowup = []
    for (const doc of leadsSnapshot.docs) {
      const lead = doc.data()
      const status = await getFollowupStatus(userId, doc.id)
      if (status && status.status === 'ready' && lead.telefono_whatsapp) {
        needsFollowup.push({
          id: doc.id,
          nombre_negocio: lead.nombre_negocio,
          telefono_whatsapp: lead.telefono_whatsapp,
          url_propuesta: lead.url_propuesta,
          attempt: status.nextAttempt,
          message: getFollowupMessage(lead, status.nextAttempt),
        })
      }
    }
    return needsFollowup
  } catch (error) {
    console.error('Error getting leads needing followup:', error.message)
    return []
  }
}

module.exports = {
  FOLLOWUP_CONFIG,
  getFollowupStatus,
  recordFollowupAttempt,
  getFollowupMessage,
  getLeadsNeedingFollowup,
}
