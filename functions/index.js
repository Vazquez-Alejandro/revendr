const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============ CAMPAIGNS ============

app.get('/api/campaigns', async (req, res) => {
  try {
    const snapshot = await db.collection('campanias')
      .orderBy('fecha_creacion', 'desc')
      .limit(50)
      .get()

    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/api/campaigns', async (req, res) => {
  try {
    const { nombre, rubro_objetivo, mensaje_template, ciudad } = req.body

    if (!nombre || !rubro_objetivo) {
      return res.status(400).json({ success: false, error: { message: 'Nombre y rubro requeridos' } })
    }

    const docRef = await db.collection('campanias').add({
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
    })

    res.status(201).json({ success: true, data: { id: docRef.id } })
  } catch (error) {
    console.error('Error creating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.patch('/api/campaigns/:id/status', async (req, res) => {
  try {
    const { estado } = req.body
    await db.collection('campanias').doc(req.params.id).update({
      estado,
      fecha_actualizacion: new Date(),
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ LEADS ============

app.get('/api/leads', async (req, res) => {
  try {
    const { rubro, estado, limit = 50 } = req.query
    let query = db.collection('leads')

    if (rubro) query = query.where('rubro', '==', rubro)
    if (estado) query = query.where('estado_proceso', '==', estado)

    const snapshot = await query
      .orderBy('fecha_creacion', 'desc')
      .limit(parseInt(limit))
      .get()

    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, data: leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.get('/api/leads/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('leads').get()
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

app.post('/api/leads/:leadId/generate-demo', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    const demoId = `demo-${lead.rubro}-${req.params.leadId}`
    const demoUrl = `https://revendr-9add8.web.app/demo/${lead.rubro}/${demoId}`

    await db.collection('leads').doc(req.params.leadId).update({
      estado_proceso: 'demo_generada',
      url_demo: demoUrl,
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { demoUrl } })
  } catch (error) {
    console.error('Error generating demo:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/api/leads/:leadId/send-whatsapp', async (req, res) => {
  try {
    const leadDoc = await db.collection('leads').doc(req.params.leadId).get()
    if (!leadDoc.exists) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found' } })
    }

    const lead = leadDoc.data()
    const WHATSAPP_TOKEN = functions.config().whatsapp?.token
    const PHONE_NUMBER_ID = functions.config().whatsapp?.phone_number_id

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return res.status(500).json({ success: false, error: { message: 'WhatsApp not configured' } })
    }

    const axios = require('axios')
    const message = `Hola ${lead.nombre_negocio}, te propuse algo especial...\n\nMirá tu demo: ${lead.url_demo}`

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: lead.telefono_whatsapp,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    await db.collection('leads').doc(req.params.leadId).update({
      estado_proceso: 'mensaje_enviado',
      whatsapp_message_id: response.data.messages?.[0]?.id,
      fecha_envio_whatsapp: new Date(),
      fecha_actualizacion: new Date(),
    })

    res.json({ success: true, data: { messageId: response.data.messages?.[0]?.id } })
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// ============ WEBHOOKS ============

app.post('/webhooks/apify', async (req, res) => {
  try {
    const { defaultDatasetId, campaignId } = req.body

    const axios = require('axios')
    const APIFY_TOKEN = functions.config().apify?.token

    const response = await axios.get(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
      { params: { token: APIFY_TOKEN, format: 'json' } }
    )

    const leads = response.data
    let saved = 0

    for (const raw of leads) {
      const leadData = {
        id_campania: campaignId || '',
        nombre_negocio: raw.name || raw.title || 'Sin nombre',
        telefono_whatsapp: raw.phone || '',
        email: raw.email || '',
        rubro: req.body.rubro || 'general',
        url_origen: raw.url || '',
        estado_proceso: 'scraped',
        fecha_creacion: new Date(),
      }

      if (leadData.telefono_whatsapp) {
        await db.collection('leads').add(leadData)
        saved++
      }
    }

    if (campaignId) {
      await db.collection('campanias').doc(campaignId).update({
        leads_count: admin.firestore.FieldValue.increment(saved),
        scraping_completed_at: new Date(),
      })
    }

    res.json({ success: true, data: { leadsProcessed: saved } })
  } catch (error) {
    console.error('Error processing Apify webhook:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

app.post('/webhooks/stripe', async (req, res) => {
  try {
    const stripe = require('stripe')(functions.config().stripe?.secret_key)
    const webhookSecret = functions.config().stripe?.webhook_secret

    const sig = req.headers['stripe-signature']
    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      console.error('Stripe signature verification failed:', err.message)
      return res.status(400).json({ error: err.message })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const leadId = session.metadata?.leadId

      if (leadId) {
        await db.collection('leads').doc(leadId).update({
          estado_proceso: 'cliente_activo',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          fecha_pago: new Date(),
          fecha_actualizacion: new Date(),
        })
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

// ============ STATS ============

app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const [campaignsSnap, leadsSnap] = await Promise.all([
      db.collection('campanias').get(),
      db.collection('leads').get(),
    ])

    let activeCampaigns = 0
    let demosGeneradas = 0
    let clientesActivos = 0
    const today = new Date().toDateString()

    campaignsSnap.docs.forEach(doc => {
      if (doc.data().estado === 'activa') activeCampaigns++
    })

    leadsSnap.docs.forEach(doc => {
      const lead = doc.data()
      if (lead.estado_proceso === 'demo_generadas') demosGeneradas++
      if (lead.estado_proceso === 'cliente_activo') clientesActivos++
    })

    res.json({
      success: true,
      data: {
        totalCampaigns: campaignsSnap.size,
        activeCampaigns,
        totalLeads: leadsSnap.size,
        demosGeneradas,
        clientesActivos,
        conversionRate: leadsSnap.size > 0
          ? ((clientesActivos / leadsSnap.size) * 100).toFixed(1)
          : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

exports.api = functions.https.onRequest(app)
