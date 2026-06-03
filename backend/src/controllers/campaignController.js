const { getFirestore } = require('../config/firebase')
const { logger } = require('../utils/logger')
const { ApifyService } = require('../services/apifyService')
const { DemoGeneratorService } = require('../services/demoGenerator')
const { WhatsAppService } = require('../services/whatsappService')

class CampaignController {
  constructor() {
    this.db = getFirestore()
    this.apify = new ApifyService()
    this.demoGenerator = new DemoGeneratorService()
    this.whatsapp = new WhatsAppService()
  }

  async createCampaign(req, res) {
    try {
      const { nombre, rubro_objetivo, mensaje_template, ciudad } = req.body

      if (!nombre || !rubro_objetivo) {
        return res.status(400).json({
          success: false,
          error: { message: 'Nombre y rubro objetivo son requeridos' },
        })
      }

      const campaignData = {
        nombre,
        rubro_objetivo,
        ciudad: ciudad || '',
        mensaje_template: mensaje_template || '',
        estado: 'activa',
        fecha_inicio: new Date(),
        fecha_creacion: new Date(),
        leads_count: 0,
        demos_generadas: 0,
        mensajes_enviados: 0,
        created_by: req.user?.uid || 'system',
      }

      const docRef = await this.db.collection('campanias').add(campaignData)

      logger.info('Campaign created:', { id: docRef.id, nombre })

      res.status(201).json({
        success: true,
        data: { id: docRef.id, ...campaignData },
      })
    } catch (error) {
      logger.error('Error creating campaign:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al crear la campaña' },
      })
    }
  }

  async getCampaigns(req, res) {
    try {
      const { estado, rubro } = req.query

      let query = this.db.collection('campanias')

      if (estado) {
        query = query.where('estado', '==', estado)
      }
      if (rubro) {
        query = query.where('rubro_objetivo', '==', rubro)
      }

      const snapshot = await query
        .orderBy('fecha_creacion', 'desc')
        .limit(50)
        .get()

      const campaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      res.json({
        success: true,
        data: campaigns,
        total: campaigns.length,
      })
    } catch (error) {
      logger.error('Error fetching campaigns:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al obtener las campañas' },
      })
    }
  }

  async updateCampaignStatus(req, res) {
    try {
      const { id } = req.params
      const { estado } = req.body

      const validStates = ['activa', 'pausada', 'terminada']
      if (!validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Estado inválido' },
        })
      }

      await this.db.collection('campanias').doc(id).update({
        estado,
        fecha_actualizacion: new Date(),
      })

      logger.info('Campaign status updated:', { id, estado })

      res.json({
        success: true,
        data: { id, estado },
      })
    } catch (error) {
      logger.error('Error updating campaign:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al actualizar la campaña' },
      })
    }
  }

  async triggerScraping(req, res) {
    try {
      const { campaignId } = req.params
      const { rubro, ciudad, maxResults = 100 } = req.body

      const campaignDoc = await this.db.collection('campanias').doc(campaignId).get()
      if (!campaignDoc.exists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaña no encontrada' },
        })
      }

      const campaign = campaignDoc.data()
      if (campaign.estado !== 'activa') {
        return res.status(400).json({
          success: false,
          error: { message: 'La campaña no está activa' },
        })
      }

      const scraperConfig = this.buildScraperConfig(rubro || campaign.rubro_objetivo, ciudad || campaign.ciudad)
      
      const taskId = await this.apify.startActor(scraperConfig)

      logger.info('Scraping triggered:', { campaignId, taskId, rubro })

      await this.db.collection('campanias').doc(campaignId).update({
        scraping_task_id: taskId,
        scraping_started_at: new Date(),
      })

      res.json({
        success: true,
        data: {
          taskId,
          message: 'Scraping iniciado. Los leads se procesarán automáticamente.',
        },
      })
    } catch (error) {
      logger.error('Error triggering scraping:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al iniciar el scraping' },
      })
    }
  }

  async processApifyWebhook(req, res) {
    try {
      const { resource, defaultDatasetId, id: taskId } = req.body

      if (resource?.defaultDatasetId !== defaultDatasetId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid webhook payload' },
        })
      }

      logger.info('Apify webhook received:', { taskId, datasetId: defaultDatasetId })

      const leads = await this.apify.getDatasetItems(defaultDatasetId)
      
      const campaignId = req.query.campaignId || await this.findCampaignByTaskId(taskId)
      
      if (!campaignId) {
        logger.warn('No campaign found for task:', taskId)
        return res.status(200).json({ success: true, message: 'No campaign associated' })
      }

      const savedLeads = await this.processLeads(leads, campaignId)

      await this.db.collection('campanias').doc(campaignId).update({
        leads_count: this.db.FieldValue.increment(savedLeads.length),
        scraping_task_id: null,
        scraping_completed_at: new Date(),
      })

      logger.info('Leads processed from Apify:', { campaignId, count: savedLeads.length })

      res.json({
        success: true,
        data: {
          leadsProcessed: savedLeads.length,
          campaignId,
        },
      })
    } catch (error) {
      logger.error('Error processing Apify webhook:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error procesando el webhook' },
      })
    }
  }

  async processLeads(rawLeads, campaignId) {
    const campaignDoc = await this.db.collection('campanias').doc(campaignId).get()
    const campaign = campaignDoc.data()
    
    const savedLeads = []

    for (const rawLead of rawLeads) {
      try {
        const leadData = this.transformLeadData(rawLead, campaign)
        
        const existingLead = await this.findExistingLead(leadData.telefono_whatsapp, campaignId)
        if (existingLead) {
          logger.debug('Lead already exists:', { phone: leadData.telefono_whatsapp })
          continue
        }

        const docRef = await this.db.collection('leads').add(leadData)
        savedLeads.push({ id: docRef.id, ...leadData })

        await this.db.collection('campanias').doc(campaignId).update({
          leads_count: this.db.FieldValue.increment(1),
        })
      } catch (error) {
        logger.error('Error saving lead:', { lead: rawLead, error: error.message })
      }
    }

    return savedLeads
  }

  transformLeadData(rawLead, campaign) {
    return {
      id_campania: campaign.id || campaignId,
      nombre_negocio: rawLead.name || rawLead.title || 'Sin nombre',
      telefono_whatsapp: this.normalizePhone(rawLead.phone || rawLead.phoneNumber || ''),
      email: rawLead.email || '',
      rubro: campaign.rubro_objetivo,
      url_origen: rawLead.url || rawLead.link || '',
      datos_personalizados: {
        address: rawLead.address || '',
        website: rawLead.website || '',
        rating: rawLead.totalScore || rawLead.rating,
        reviewsCount: rawLead.reviewsCount || 0,
        imageUrl: rawLead.imageUrl || rawLead.image || '',
        location: rawLead.location || null,
      },
      estado_proceso: 'scraped',
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    }
  }

  normalizePhone(phone) {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('54')) return cleaned
    if (cleaned.startsWith('9')) return '54' + cleaned
    return '54' + cleaned
  }

  async findExistingLead(phone, campaignId) {
    const snapshot = await this.db.collection('leads')
      .where('telefono_whatsapp', '==', phone)
      .where('id_campania', '==', campaignId)
      .limit(1)
      .get()

    return snapshot.empty ? null : snapshot.docs[0]
  }

  async findCampaignByTaskId(taskId) {
    const snapshot = await this.db.collection('campanias')
      .where('scraping_task_id', '==', taskId)
      .limit(1)
      .get()

    return snapshot.empty ? null : snapshot.docs[0].id
  }

  buildScraperConfig(rubro, ciudad) {
    const searchTerms = {
      inmobiliaria: ['inmobiliaria', 'real estate agency', 'propiedades'],
      estetica: ['peluquería', 'estética', 'salon de belleza', 'beauty salon'],
      clinica: ['clínica', 'consultorio médico', 'centro médico'],
      restaurante: ['restaurante', 'restaurant', 'comida'],
      gimnasio: ['gimnasio', 'gym', 'fitness center'],
    }

    const terms = searchTerms[rubro] || [rubro]
    const searchQuery = terms.map(t => `${t} ${ciudad || 'Argentina'}`).join(' | ')

    return {
      actor: 'apify/google-maps-scraper',
      input: {
        searchTerms: terms,
        language: 'es',
        maxCrawledPlacesPerSearch: 100,
        customGeolocationIds: ciudad ? [] : undefined,
      },
    }
  }

  async generateDemo(req, res) {
    try {
      const { leadId } = req.params

      const leadDoc = await this.db.collection('leads').doc(leadId).get()
      if (!leadDoc.exists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead no encontrado' },
        })
      }

      const lead = leadDoc.data()

      if (lead.estado_proceso !== 'scraped') {
        return res.status(400).json({
          success: false,
          error: { message: 'El lead ya tiene una demo generada o está en otro estado' },
        })
      }

      const demoResult = await this.demoGenerator.generate(lead)

      await this.db.collection('leads').doc(leadId).update({
        estado_proceso: 'demo_generada',
        url_demo: demoResult.url,
        datos_personalizados: {
          ...lead.datos_personalizados,
          demo_data: demoResult.data,
        },
        fecha_actualizacion: new Date(),
      })

      logger.info('Demo generated:', { leadId, rubro: lead.rubro, url: demoResult.url })

      res.json({
        success: true,
        data: {
          leadId,
          demoUrl: demoResult.url,
          rubro: lead.rubro,
        },
      })
    } catch (error) {
      logger.error('Error generating demo:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al generar la demo' },
      })
    }
  }

  async sendWhatsAppMessage(req, res) {
    try {
      const { leadId } = req.params
      const { customMessage } = req.body

      const leadDoc = await this.db.collection('leads').doc(leadId).get()
      if (!leadDoc.exists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead no encontrado' },
        })
      }

      const lead = leadDoc.data()

      if (lead.estado_proceso !== 'demo_generada') {
        return res.status(400).json({
          success: false,
          error: { message: 'El lead debe tener una demo generada primero' },
        })
      }

      if (!lead.telefono_whatsapp) {
        return res.status(400).json({
          success: false,
          error: { message: 'El lead no tiene número de WhatsApp' },
        })
      }

      const campaignDoc = await this.db.collection('campanias').doc(lead.id_campania).get()
      const campaign = campaignDoc.data()

      let message = customMessage || campaign.mensaje_template || ''
      message = message
        .replace(/{nombre_negocio}/g, lead.nombre_negocio)
        .replace(/{url_demo}/g, lead.url_demo || '')
        .replace(/{rubro}/g, lead.rubro)

      const result = await this.whatsapp.sendMessage(
        lead.telefono_whatsapp,
        message
      )

      await this.db.collection('leads').doc(leadId).update({
        estado_proceso: 'mensaje_enviado',
        whatsapp_message_id: result.messageId,
        fecha_envio_whatsapp: new Date(),
        fecha_actualizacion: new Date(),
      })

      await this.db.collection('campanias').doc(lead.id_campania).update({
        mensajes_enviados: this.db.FieldValue.increment(1),
      })

      logger.info('WhatsApp message sent:', { leadId, phone: lead.telefono_whatsapp })

      res.json({
        success: true,
        data: {
          leadId,
          messageId: result.messageId,
          status: 'sent',
        },
      })
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error al enviar el mensaje de WhatsApp' },
      })
    }
  }

  async batchProcessDemos(req, res) {
    try {
      const { campaignId } = req.params
      const { limit: batchLimit = 50 } = req.query

      const leadsSnapshot = await this.db.collection('leads')
        .where('id_campania', '==', campaignId)
        .where('estado_proceso', '==', 'scraped')
        .limit(parseInt(batchLimit))
        .get()

      if (leadsSnapshot.empty) {
        return res.json({
          success: true,
          data: { processed: 0, message: 'No hay leads pendientes de demo' },
        })
      }

      const results = {
        processed: 0,
        failed: 0,
        errors: [],
      }

      for (const leadDoc of leadsSnapshot.docs) {
        try {
          const lead = leadDoc.data()
          const demoResult = await this.demoGenerator.generate(lead)

          await leadDoc.ref.update({
            estado_proceso: 'demo_generada',
            url_demo: demoResult.url,
            datos_personalizados: {
              ...lead.datos_personalizados,
              demo_data: demoResult.data,
            },
            fecha_actualizacion: new Date(),
          })

          results.processed++
          
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          results.failed++
          results.errors.push({
            leadId: leadDoc.id,
            error: error.message,
          })
          logger.error('Error in batch demo generation:', { leadId: leadDoc.id, error: error.message })
        }
      }

      logger.info('Batch demo processing completed:', { campaignId, ...results })

      res.json({
        success: true,
        data: results,
      })
    } catch (error) {
      logger.error('Error in batch processing:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error en el procesamiento por lotes' },
      })
    }
  }

  async batchSendMessages(req, res) {
    try {
      const { campaignId } = req.params
      const { limit: batchLimit = 20 } = req.query

      const leadsSnapshot = await this.db.collection('leads')
        .where('id_campania', '==', campaignId)
        .where('estado_proceso', '==', 'demo_generada')
        .limit(parseInt(batchLimit))
        .get()

      if (leadsSnapshot.empty) {
        return res.json({
          success: true,
          data: { sent: 0, message: 'No hay leads pendientes de envío' },
        })
      }

      const campaignDoc = await this.db.collection('campanias').doc(campaignId).get()
      const campaign = campaignDoc.data()

      const results = {
        sent: 0,
        failed: 0,
        errors: [],
      }

      for (const leadDoc of leadsSnapshot.docs) {
        try {
          const lead = leadDoc.data()

          if (!lead.telefono_whatsapp || !lead.url_demo) {
            results.failed++
            results.errors.push({ leadId: leadDoc.id, error: 'Missing phone or demo URL' })
            continue
          }

          let message = campaign.mensaje_template || ''
          message = message
            .replace(/{nombre_negocio}/g, lead.nombre_negocio)
            .replace(/{url_demo}/g, lead.url_demo)
            .replace(/{rubro}/g, lead.rubro)

          const result = await this.whatsapp.sendMessage(lead.telefono_whatsapp, message)

          await leadDoc.ref.update({
            estado_proceso: 'mensaje_enviado',
            whatsapp_message_id: result.messageId,
            fecha_envio_whatsapp: new Date(),
            fecha_actualizacion: new Date(),
          })

          results.sent++

          const delay = 2000 + Math.random() * 3000
          await new Promise(resolve => setTimeout(resolve, delay))
        } catch (error) {
          results.failed++
          results.errors.push({ leadId: leadDoc.id, error: error.message })
          logger.error('Error sending batch message:', { leadId: leadDoc.id, error: error.message })
        }
      }

      await this.db.collection('campanias').doc(campaignId).update({
        mensajes_enviados: this.db.FieldValue.increment(results.sent),
      })

      logger.info('Batch message sending completed:', { campaignId, ...results })

      res.json({
        success: true,
        data: results,
      })
    } catch (error) {
      logger.error('Error in batch message sending:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Error en el envío por lotes' },
      })
    }
  }
}

module.exports = new CampaignController()
