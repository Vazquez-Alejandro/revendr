import { auth } from '../config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getHeaders()

    const config = {
      headers,
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url)
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  campaigns = {
    list: (params) => this.get('/campaigns', params),
    create: (data) => this.post('/campaigns', data),
    updateStatus: (id, status) => this.patch(`/campaigns/${id}/status`, { estado: status }),
    triggerScrape: (campaignId, data) => this.post(`/campaigns/${campaignId}/scrape`, data),
    triggerGoogleScrape: (campaignId, data) => this.post(`/campaigns/${campaignId}/scrape-google`, data),
    processDemos: (campaignId, limit) => this.post(`/campaigns/${campaignId}/process-demos`, { limit }),
    sendMessages: (campaignId, limit) => this.post(`/campaigns/${campaignId}/send-messages`, { limit }),
  }

  leads = {
    list: (params) => this.get('/leads', params),
    get: (id) => this.get(`/leads/${id}`),
    generateDemo: (leadId) => this.post(`/leads/${leadId}/generate-demo`),
    sendWhatsApp: (leadId, customMessage) => this.post(`/leads/${leadId}/send-whatsapp`, { customMessage }),
    stats: () => this.get('/leads/stats/by-rubro'),
  }
}

export const api = new ApiService()
export default api
