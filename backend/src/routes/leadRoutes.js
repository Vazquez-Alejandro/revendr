const express = require('express')
const router = express.Router()
const { getFirestore } = require('../config/firebase')
const { logger } = require('../utils/logger')
const campaignController = require('../controllers/campaignController')

router.get('/', async (req, res) => {
  try {
    const db = getFirestore()
    const { rubro, estado, campaniaId, limit = 50, offset = 0 } = req.query

    let query = db.collection('leads')

    if (rubro) query = query.where('rubro', '==', rubro)
    if (estado) query = query.where('estado_proceso', '==', estado)
    if (campaniaId) query = query.where('id_campania', '==', campaniaId)

    const snapshot = await query
      .orderBy('fecha_creacion', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get()

    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json({
      success: true,
      data: leads,
      total: leads.length,
    })
  } catch (error) {
    logger.error('Error fetching leads:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Error al obtener los leads' },
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const db = getFirestore()
    const leadDoc = await db.collection('leads').doc(req.params.id).get()

    if (!leadDoc.exists) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lead no encontrado' },
      })
    }

    res.json({
      success: true,
      data: { id: leadDoc.id, ...leadDoc.data() },
    })
  } catch (error) {
    logger.error('Error fetching lead:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Error al obtener el lead' },
    })
  }
})

router.post('/:leadId/generate-demo', (req, res) => {
  campaignController.generateDemo(req, res)
})

router.post('/:leadId/send-whatsapp', (req, res) => {
  campaignController.sendWhatsAppMessage(req, res)
})

router.get('/stats/by-rubro', async (req, res) => {
  try {
    const db = getFirestore()
    const snapshot = await db.collection('leads').get()

    const stats = {}
    snapshot.docs.forEach(doc => {
      const lead = doc.data()
      if (!stats[lead.rubro]) {
        stats[lead.rubro] = { total: 0, byStatus: {} }
      }
      stats[lead.rubro].total++
      stats[lead.rubro].byStatus[lead.estado_proceso] = 
        (stats[lead.rubro].byStatus[lead.estado_proceso] || 0) + 1
    })

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    logger.error('Error fetching lead stats:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Error al obtener estadísticas' },
    })
  }
})

module.exports = router
