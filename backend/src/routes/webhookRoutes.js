const express = require('express')
const router = express.Router()
const campaignController = require('../controllers/campaignController')
const { getFirestore } = require('../config/firebase')
const { logger } = require('../utils/logger')

router.post('/apify', async (req, res) => {
  const signature = req.headers['x-apify-webhook-signature']
  
  if (!signature) {
    logger.warn('Apify webhook without signature')
  }

  await campaignController.processApifyWebhook(req, res)
})

router.post('/stripe', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    const sig = req.headers['stripe-signature']
    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      logger.error('Stripe webhook signature verification failed:', err.message)
      return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const leadId = session.metadata?.leadId

      if (leadId) {
        const db = getFirestore()
        
        await db.collection('leads').doc(leadId).update({
          estado_proceso: 'cliente_activo',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          fecha_pago: new Date(),
          fecha_actualizacion: new Date(),
        })

        logger.info('Lead converted to customer:', {
          leadId,
          customerId: session.customer,
        })

        await provisionAccount(leadId, session)
      }
    }

    res.json({ received: true })
  } catch (error) {
    logger.error('Stripe webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

async function provisionAccount(leadId, session) {
  try {
    const db = getFirestore()
    const leadDoc = await db.collection('leads').doc(leadId).get()
    
    if (!leadDoc.exists) {
      logger.error('Lead not found for provisioning:', leadId)
      return
    }

    const lead = leadDoc.data()

    logger.info('Account provisioned for lead:', {
      leadId,
      rubro: lead.rubro,
      email: lead.email,
    })
  } catch (error) {
    logger.error('Provisioning error:', error)
  }
}

router.post('/make', async (req, res) => {
  try {
    const { action, data } = req.body

    logger.info('Make.com webhook received:', { action })

    switch (action) {
      case 'process_leads':
        const db = getFirestore()
        const leadsSnapshot = await db.collection('leads')
          .where('estado_proceso', '==', 'scraped')
          .limit(10)
          .get()

        const leads = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))

        res.json({ success: true, leads })
        break

      default:
        res.json({ success: true, message: 'Action not implemented' })
    }
  } catch (error) {
    logger.error('Make webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

module.exports = router
