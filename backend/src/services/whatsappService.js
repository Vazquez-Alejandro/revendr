const axios = require('axios')
const { logger } = require('../utils/logger')

class WhatsAppService {
  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    this.baseUrl = 'https://graph.facebook.com/v17.0'
    
    if (!this.apiToken || !this.phoneNumberId) {
      logger.warn('WhatsApp API credentials not configured')
    }
  }

  async sendMessage(to, message, options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhone(to),
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      }

      if (options.mediaUrl) {
        payload.type = 'image'
        payload.image = {
          link: options.mediaUrl,
          caption: message,
        }
        delete payload.text
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const messageId = response.data.messages?.[0]?.id

      logger.info('WhatsApp message sent:', { to, messageId })

      return {
        success: true,
        messageId,
        status: 'sent',
      }
    } catch (error) {
      const errorData = error.response?.data?.error
      logger.error('WhatsApp API error:', {
        to,
        error: errorData || error.message,
      })

      if (errorData?.code === 130429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }

      if (errorData?.code === 131047) {
        throw new Error('Re-engagement message required. User has not messaged in 24h.')
      }

      throw new Error(errorData?.message || 'Failed to send WhatsApp message')
    }
  }

  async sendTemplate(to, templateName, languageCode = 'es', parameters = []) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhone(to),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param,
              })),
            },
          ] : undefined,
        },
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const messageId = response.data.messages?.[0]?.id

      logger.info('WhatsApp template sent:', { to, templateName, messageId })

      return {
        success: true,
        messageId,
        status: 'sent',
      }
    } catch (error) {
      const errorData = error.response?.data?.error
      logger.error('WhatsApp template error:', {
        to,
        template: templateName,
        error: errorData || error.message,
      })
      throw new Error(errorData?.message || 'Failed to send WhatsApp template')
    }
  }

  async checkConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      )

      return {
        connected: true,
        phoneNumberId: this.phoneNumberId,
        displayPhoneNumber: response.data.display_phone_number,
        qualityRating: response.data.quality_rating,
      }
    } catch (error) {
      logger.error('WhatsApp connection check failed:', error.message)
      return {
        connected: false,
        error: error.message,
      }
    }
  }

  normalizePhone(phone) {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('54')) return cleaned
    if (cleaned.startsWith('9')) return '54' + cleaned
    return '54' + cleaned
  }
}

module.exports = { WhatsAppService }
