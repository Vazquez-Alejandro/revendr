import { auth } from '../config/firebase'

const LOCAL_API = 'http://127.0.0.1:5001/revendr-9add8/us-central1/api'
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const API_BASE_URL = isDev ? LOCAL_API : (import.meta.env.VITE_API_URL || '/api')

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async getHeaders() {
    const headers = { 'Content-Type': 'application/json' }
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getHeaders()
    try {
      const response = await fetch(url, { headers, ...options })
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
    const qs = new URLSearchParams(params).toString()
    return this.request(qs ? `${endpoint}?${qs}` : endpoint)
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) })
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) })
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) })
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  campaigns = {
    list: (params) => this.get('/campaigns', params),
    create: (data) => this.post('/campaigns', data),
    update: (id, data) => this.put(`/campaigns/${id}`, data),
    updateStatus: (id, status) => this.patch(`/campaigns/${id}/status`, { estado: status }),
    delete: (id) => this.delete(`/campaigns/${id}`),
    duplicate: (id) => this.post(`/campaigns/${id}/duplicate`),
    triggerScrape: (id, data) => this.post(`/campaigns/${id}/scrape`, data),
    triggerGoogleScrape: (id, data) => this.post(`/campaigns/${id}/scrape-google`, data),
    processDemos: (id, limit) => this.post(`/campaigns/${id}/process-demos`, { limit }),
    generateMessages: (id) => this.post(`/campaigns/${id}/generate-messages`),
    sendMessages: (id, limit) => this.post(`/campaigns/${id}/send-messages`, { limit }),
    sendDemoEmails: (id, data) => this.post(`/campaigns/${id}/send-demo-emails`, data),
    followups: (id, data) => this.post(`/campaigns/${id}/followups`, data),
    processFollowups: (id) => this.post(`/campaigns/${id}/process-followups`),
    roi: (id) => this.get(`/campaigns/${id}/roi`),
    revenue: (id, data) => this.post(`/campaigns/${id}/revenue`, data),
    setSchedule: (id, data) => this.post(`/campaigns/${id}/set-schedule`, data),
    processSequence: (id) => this.post(`/campaigns/${id}/process-sequence`),
    abTest: (id, data) => this.post(`/campaigns/${id}/ab-test`, data),
    abResults: (id) => this.get(`/campaigns/${id}/ab-results`),
  }

  whatsapp = {
    config: () => this.get('/whatsapp/config'),
    sendText: (data) => this.post('/whatsapp/send-text', data),
    sendTemplate: (data) => this.post('/whatsapp/send-template', data),
    sendBulk: (data) => this.post('/whatsapp/send-bulk', data),
    generateMessage: (data) => this.post('/whatsapp/generate-message', data),
    followupSend: (data) => this.post('/whatsapp/followup/send', data),
    reengagementSend: (data) => this.post('/whatsapp/reengagement/send', data),
    campaignMetrics: (campaignId) => campaignId
      ? this.get(`/whatsapp/campaigns/${campaignId}/metrics`)
      : this.get('/whatsapp/campaigns/metrics'),
    abTests: (params) => this.get('/whatsapp/ab-tests', params),
    createAbTest: (data) => this.post('/whatsapp/ab-tests', data),
    deleteAbTest: (id) => this.delete(`/whatsapp/ab-tests/${id}`),
    blacklist: (params) => this.get('/whatsapp/blacklist', params),
    addToBlacklist: (data) => this.post('/whatsapp/blacklist', data),
    removeFromBlacklist: (phone) => this.delete(`/whatsapp/blacklist/${phone}`),
    schedule: (data) => this.post('/whatsapp/schedule', data),
    messages: (params) => this.get('/whatsapp/messages', params),
    messagesStats: (params) => this.get('/whatsapp/messages/stats', params),
    notifications: () => this.get('/whatsapp/notifications'),
  }

  leads = {
    list: (params) => this.get('/leads', params),
    get: (id) => this.get(`/leads/${id}`),
    generateDemo: (id) => this.post(`/leads/${id}/generate-demo`),
    generateMessage: (id) => this.post(`/leads/${id}/generate-message`),
    sendWhatsApp: (id, customMessage) => this.post(`/leads/${id}/send-whatsapp`, { customMessage }),
    sendEmail: (id, data) => this.post(`/leads/${id}/send-email`, data),
    stats: () => this.get('/leads/stats/by-rubro'),
    scoreAll: (data) => this.post('/leads/score-all', data),
    importCsv: (data) => this.post('/leads/import-csv', data),
  }

  team = {
    members: (userId) => this.get(`/team/members/${userId}`),
    invite: (data) => this.post('/team/invite', data),
    accept: (data) => this.post('/team/invite/accept', data),
    acceptLink: (data) => this.post('/team/invite/accept-link', data),
    removeMember: (memberId) => this.delete(`/team/members/${memberId}`),
    invites: (inviteId) => this.get(`/team/invites/${inviteId}`),
  }

  admin = {
    clients: (params) => this.get('/admin/clients', params),
    getClient: (id) => this.get(`/admin/clients/${id}`),
    updateClient: (id, data) => this.patch(`/admin/clients/${id}`, data),
    deleteClient: (id) => this.delete(`/admin/clients/${id}`),
    migrateOwnership: (data) => this.post('/admin/migrate-ownership', data),
    usage: (userId) => this.get(`/usage/${userId}`),
    whitelabel: {
      get: () => this.get('/whitelabel/config'),
      set: (data) => this.post('/whitelabel/config', data),
    },
  }

  content = {
    generate: (data) => this.post('/content/generate', data),
  }

  mercadopago = {
    createPreference: (data) => this.post('/mercadopago/create-preference', data),
    createSubscription: (data) => this.post('/mercadopago/create-subscription', data),
    cancelSubscription: (data) => this.post('/mercadopago/cancel-subscription', data),
    subscriptionStatus: (userId) => this.get(`/mercadopago/subscription-status/${userId}`),
  }

  subscription = {
    get: (userId) => this.get(`/subscription/${userId}`),
    change: (data) => this.post('/subscription/change', data),
    cancel: (data) => this.post('/subscription/cancel', data),
    reactivate: (data) => this.post('/subscription/reactivate', data),
    plans: () => this.get('/plans'),
    createCheckout: (data) => this.post('/create-checkout-session', data),
  }

  email = {
    check: (email) => this.get('/check-email', { email }),
    resendVerification: (data) => this.post('/email/resend-verification', data),
    sendTestDemo: (params) => this.get('/test/send-demo-email', params),
  }

  chat = {
    sendMessage: (data) => this.post('/chat/message', data),
  }

  async getStatus() {
    return this.get('/status')
  }

  async support(data) {
    return this.post('/support', data)
  }

  async clientDashboard(userId) {
    return this.get(`/client/dashboard/${userId}`)
  }

  async ownerDashboard(path) {
    return this.get(`/owner/dashboard/${path}`)
  }

  async statsProducts(data) {
    return this.post('/stats/products', data)
  }

  async getStatus() {
    return this.get('/status')
  }

  async createCheckoutSession(data) {
    return this.post('/create-checkout-session', data)
  }
}

export const api = new ApiService()
export default api
