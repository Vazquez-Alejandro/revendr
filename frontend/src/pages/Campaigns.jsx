import { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { api } from '../services/api'
import { 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Loader2,
  Megaphone,
  Calendar,
  Target,
  Globe,
  Sparkles,
  MessageCircle,
  Search,
  Package,
  Copy,
  Edit3,
  BarChart3,
  Eye,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'

const RUBROS = [
  { value: 'inmobiliaria', labelEs: 'Inmobiliarias', labelEn: 'Real Estate' },
  { value: 'estetica', labelEs: 'Estética / Peluquería', labelEn: 'Beauty / Salon' },
  { value: 'clinica', labelEs: 'Clínicas Médicas', labelEn: 'Medical Clinics' },
  { value: 'restaurante', labelEs: 'Restaurantes', labelEn: 'Restaurants' },
  { value: 'gimnasio', labelEs: 'Gimnasios', labelEn: 'Gyms' },
  { value: 'otro', labelEs: 'Otro', labelEn: 'Other' },
]

const ESTADOS_ES = {
  activa: { label: 'Activa', class: 'badge-success' },
  pausada: { label: 'Pausada', class: 'badge-warning' },
  terminada: { label: 'Terminada', class: 'badge-danger' },
}

const ESTADOS_EN = {
  activa: { label: 'Active', class: 'badge-success' },
  pausada: { label: 'Paused', class: 'badge-warning' },
  terminada: { label: 'Terminated', class: 'badge-danger' },
}

export default function Campaigns() {
  const { t, locale } = useI18n()
  const [campaigns, setCampaigns] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [processingAction, setProcessingAction] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [analyticsCampaign, setAnalyticsCampaign] = useState(null)
  const [followupsCampaign, setFollowupsCampaign] = useState(null)
  const [followups, setFollowups] = useState([])
  const [formData, setFormData] = useState({
    nombre: '',
    producto_id: '',
    rubro_objetivo: '',
    mensaje_template: '',
    ciudad: '',
  })

  useEffect(() => {
    loadCampaigns()
    loadProducts()
  }, [])

  const loadCampaigns = async () => {
    try {
      const q = query(
        collection(db, 'campanias'),
        orderBy('fecha_inicio', 'desc')
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setCampaigns(data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error(locale === 'es' ? 'Error al cargar campañas' : 'Error loading campaigns')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) return

      const q = query(
        collection(db, 'productos'),
        where('user_id', '==', userId)
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!formData.nombre) {
      toast.error(locale === 'es' ? 'Completá el nombre de la campaña' : 'Fill in campaign name')
      return
    }

    setCreating(true)
    try {
      const selectedProduct = products.find(p => p.id === formData.producto_id)
      const docRef = await addDoc(collection(db, 'campanias'), {
        nombre: formData.nombre,
        producto_id: formData.producto_id || null,
        producto_nombre: selectedProduct?.nombre || null,
        producto_url_demo: selectedProduct?.url_demo || null,
        producto_mensaje: selectedProduct?.mensaje_whatsapp || null,
        rubro_objetivo: selectedProduct?.nicho || formData.rubro_objetivo,
        mensaje_template: formData.mensaje_template || selectedProduct?.mensaje_whatsapp || '',
        ciudad: formData.ciudad,
        estado: 'activa',
        fecha_inicio: new Date(),
        fecha_creacion: new Date(),
        fecha_fin: formData.fecha_fin || null,
        leads_count: 0,
        demos_generadas: 0,
        mensajes_enviados: 0,
      })

      toast.success(locale === 'es' ? 'Campaña creada. Iniciando scraping...' : 'Campaign created. Starting scrape...')
      setShowCreateModal(false)
      setFormData({ nombre: '', producto_id: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' })

      handleScrape(docRef.id)

      loadCampaigns()
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error(locale === 'es' ? 'Error al crear la campaña' : 'Error creating campaign')
    } finally {
      setCreating(false)
    }
  }

  const handleScrape = async (campaignId) => {
    setProcessingAction(`${campaignId}-scrape`)
    toast.loading(locale === 'es' ? 'Iniciando scraping...' : 'Starting scrape...', { id: 'scrape' })
    try {
      const result = await api.campaigns.triggerScrape(campaignId, {})
      toast.success(
        locale === 'es' 
          ? `Scraping iniciado. Buscando leads...` 
          : `Scrape started. Searching for leads...`,
        { id: 'scrape' }
      )
      setTimeout(loadCampaigns, 3000)
    } catch (error) {
      console.error('Error starting scrape:', error)
      toast.error(
        error.message.includes('not configured')
          ? (locale === 'es' ? 'Token de Apify no configurado. Andá a Settings.' : 'Apify token not configured. Go to Settings.')
          : (locale === 'es' ? 'Error al iniciar scraping' : 'Error starting scrape'),
        { id: 'scrape' }
      )
    } finally {
      setProcessingAction(null)
    }
  }

  const handleProcessDemos = async (campaignId) => {
    setProcessingAction(`${campaignId}-demos`)
    toast.loading(locale === 'es' ? 'Generando demos...' : 'Generating demos...', { id: 'demos' })
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/process-demos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 20 }),
        }
      ).then(r => r.json())

      toast.success(
        locale === 'es' 
          ? `${result.data?.processed || 0} demos generadas` 
          : `${result.data?.processed || 0} demos generated`,
        { id: 'demos' }
      )
      loadCampaigns()
    } catch (error) {
      console.error('Error processing demos:', error)
      toast.error(locale === 'es' ? 'Error al generar demos' : 'Error generating demos', { id: 'demos' })
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSendMessages = async (campaignId) => {
    setProcessingAction(`${campaignId}-messages`)
    toast.loading(locale === 'es' ? 'Enviando mensajes...' : 'Sending messages...', { id: 'messages' })
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/send-messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 10 }),
        }
      ).then(r => r.json())

      toast.success(
        locale === 'es' 
          ? `${result.data?.sent || 0} mensajes enviados, ${result.data?.failed || 0} fallidos` 
          : `${result.data?.sent || 0} messages sent, ${result.data?.failed || 0} failed`,
        { id: 'messages' }
      )
      loadCampaigns()
    } catch (error) {
      console.error('Error sending messages:', error)
      toast.error(
        error.message?.includes('not configured')
          ? (locale === 'es' ? 'WhatsApp no configurado. Andá a Settings.' : 'WhatsApp not configured. Go to Settings.')
          : (locale === 'es' ? 'Error al enviar mensajes' : 'Error sending messages'),
        { id: 'messages' }
      )
    } finally {
      setProcessingAction(null)
    }
  }

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'activa' ? 'pausada' : 'activa'
      await updateDoc(doc(db, 'campanias', campaignId), {
        estado: newStatus,
        fecha_actualizacion: new Date(),
      })
      toast.success(locale === 'es' ? `Campaña ${newStatus === 'activa' ? 'activada' : 'pausada'}` : `Campaign ${newStatus === 'activa' ? 'activated' : 'paused'}`)
      loadCampaigns()
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error(locale === 'es' ? 'Error al actualizar la campaña' : 'Error updating campaign')
    }
  }

  const terminateCampaign = async (campaignId) => {
    if (!confirm(t('confirmTerminate'))) return
    
    try {
      await updateDoc(doc(db, 'campanias', campaignId), {
        estado: 'terminada',
        fecha_fin: new Date(),
      })
      toast.success(locale === 'es' ? 'Campaña terminada' : 'Campaign terminated')
      loadCampaigns()
    } catch (error) {
      console.error('Error terminating campaign:', error)
      toast.error(locale === 'es' ? 'Error al terminar la campaña' : 'Error terminating campaign')
    }
  }

  const handleEditCampaign = async (e) => {
    e.preventDefault()
    if (!formData.nombre) {
      toast.error(locale === 'es' ? 'Completá el nombre' : 'Fill in the name')
      return
    }

    setCreating(true)
    try {
      const selectedProduct = products.find(p => p.id === formData.producto_id)
      await updateDoc(doc(db, 'campanias', editingId), {
        nombre: formData.nombre,
        producto_id: formData.producto_id || null,
        producto_nombre: selectedProduct?.nombre || null,
        producto_url_demo: selectedProduct?.url_demo || null,
        producto_mensaje: selectedProduct?.mensaje_whatsapp || null,
        rubro_objetivo: selectedProduct?.nicho || formData.rubro_objetivo,
        mensaje_template: formData.mensaje_template || selectedProduct?.mensaje_whatsapp || '',
        ciudad: formData.ciudad,
        fecha_fin: formData.fecha_fin || null,
        fecha_actualizacion: new Date(),
      })
      toast.success(locale === 'es' ? 'Campaña actualizada' : 'Campaign updated')
      setShowCreateModal(false)
      setEditingId(null)
      setFormData({ nombre: '', producto_id: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' })
      loadCampaigns()
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error(locale === 'es' ? 'Error al actualizar' : 'Error updating')
    } finally {
      setCreating(false)
    }
  }

  const handleDuplicateCampaign = async (campaign) => {
    try {
      const newCampaign = {
        nombre: `${campaign.nombre} (copia)`,
        producto_id: campaign.producto_id || null,
        producto_nombre: campaign.producto_nombre || null,
        producto_url_demo: campaign.producto_url_demo || null,
        producto_mensaje: campaign.producto_mensaje || null,
        rubro_objetivo: campaign.rubro_objetivo,
        mensaje_template: campaign.mensaje_template || '',
        ciudad: campaign.ciudad || '',
        estado: 'activa',
        fecha_inicio: new Date(),
        fecha_creacion: new Date(),
        leads_count: 0,
        demos_generadas: 0,
        mensajes_enviados: 0,
      }
      await addDoc(collection(db, 'campanias'), newCampaign)
      toast.success(locale === 'es' ? 'Campaña duplicada' : 'Campaign duplicated')
      loadCampaigns()
    } catch (error) {
      console.error('Error duplicating campaign:', error)
      toast.error(locale === 'es' ? 'Error al duplicar' : 'Error duplicating')
    }
  }

  const startEditCampaign = (campaign) => {
    setFormData({
      nombre: campaign.nombre || '',
      producto_id: campaign.producto_id || '',
      rubro_objetivo: campaign.rubro_objetivo || '',
      mensaje_template: campaign.mensaje_template || '',
      ciudad: campaign.ciudad || '',
      fecha_fin: campaign.fecha_fin || '',
    })
    setEditingId(campaign.id)
    setShowCreateModal(true)
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(search) ||
      c.producto_nombre?.toLowerCase().includes(search) ||
      c.ciudad?.toLowerCase().includes(search) ||
      c.rubro_objetivo?.toLowerCase().includes(search)
    )
  })

  const ESTADOS = locale === 'es' ? ESTADOS_ES : ESTADOS_EN

  const isCampaignExpired = (campaign) => {
    if (!campaign.fecha_fin) return false
    const fechaFin = campaign.fecha_fin?.toDate ? campaign.fecha_fin.toDate() : new Date(campaign.fecha_fin)
    return new Date() > fechaFin
  }

  const openFollowups = (campaign) => {
    setFollowupsCampaign(campaign)
    setFollowups(campaign.followups || [
      { delayDays: 2, message: 'Hola {nombre_negocio}, ¿viste tu demo? Si tenés dudas te la explico.' },
      { delayDays: 5, message: 'Hola {nombre_negocio}, te cuento que tenemos 20% off esta semana. ¡No lo dejes pasar!' },
    ])
  }

  const saveFollowups = async () => {
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${followupsCampaign.id}/followups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followups }),
        }
      )
      toast.success(locale === 'es' ? 'Follow-ups guardados' : 'Follow-ups saved')
      setFollowupsCampaign(null)
      loadCampaigns()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error al guardar' : 'Error saving')
    }
  }

  const addFollowup = () => {
    setFollowups([...followups, { delayDays: 7, message: '' }])
  }

  const updateFollowup = (index, field, value) => {
    const updated = [...followups]
    updated[index] = { ...updated[index], [field]: value }
    setFollowups(updated)
  }

  const removeFollowup = (index) => {
    setFollowups(followups.filter((_, i) => i !== index))
  }

  const processFollowups = async (campaignId) => {
    setProcessingAction(`${campaignId}-followups`)
    toast.loading(locale === 'es' ? 'Procesando follow-ups...' : 'Processing follow-ups...', { id: 'followups' })
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/process-followups`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      ).then(r => r.json())
      toast.success(
        locale === 'es' ? `${result.data?.sent || 0} follow-ups enviados` : `${result.data?.sent || 0} follow-ups sent`,
        { id: 'followups' }
      )
      loadCampaigns()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error', { id: 'followups' })
    } finally {
      setProcessingAction(null)
    }
  }

  const getScrapingBadge = (status) => {
    const badges = {
      running: 'badge-warning',
      completed: 'badge-success',
      failed: 'badge-danger',
      error: 'badge-danger',
      timeout: 'badge-danger',
    }
    const labels = {
      running: locale === 'es' ? 'Scrapeando...' : 'Scraping...',
      completed: locale === 'es' ? 'Scrapeado' : 'Scraped',
      failed: locale === 'es' ? 'Falló' : 'Failed',
      error: locale === 'es' ? 'Error' : 'Error',
      timeout: locale === 'es' ? 'Timeout' : 'Timeout',
    }
    if (!status) return null
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">{t('campaigns')}</h1>
          <p className="text-dark-400 mt-1">{t('campaignsDesc')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('newCampaign')}
        </button>
      </div>

      {/* Search */}
      {campaigns.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
            placeholder={locale === 'es' ? 'Buscar campañas...' : 'Search campaigns...'}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone className="w-12 h-12 mx-auto text-dark-500 mb-4" />
          <h3 className="text-lg font-medium text-dark-200 mb-2">
            {t('noCampaigns')}
          </h3>
          <p className="text-dark-400 mb-4">
            {t('noCampaignsDesc')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            {t('createFirstCampaign')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-dark-100">
                      {campaign.nombre}
                    </h3>
                    {getScrapingBadge(campaign.scraping_status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${ESTADOS[campaign.estado]?.class || 'badge-info'}`}>
                      {ESTADOS[campaign.estado]?.label || campaign.estado}
                    </span>
                    {campaign.producto_nombre && (
                      <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <Package className="w-3 h-3 mr-1" />
                        {campaign.producto_nombre}
                      </span>
                    )}
                    {campaign.fecha_fin && (
                      <span className={`badge ${
                        isCampaignExpired(campaign)
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {isCampaignExpired(campaign)
                          ? (locale === 'es' ? 'Expirada' : 'Expired')
                          : (locale === 'es' ? 'Fin:' : 'End:') + ' ' + campaign.fecha_fin?.toDate?.()?.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US')
                        }
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAnalyticsCampaign(campaign)}
                    className="p-2 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                    title={locale === 'es' ? 'Analytics' : 'Analytics'}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  {campaign.producto_url_demo && (
                    <a
                      href={campaign.producto_url_demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                      title={locale === 'es' ? 'Ver Landing' : 'View Landing'}
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => startEditCampaign(campaign)}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-all"
                    title={locale === 'es' ? 'Editar' : 'Edit'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openFollowups(campaign)}
                    className="p-2 text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                    title={locale === 'es' ? 'Follow-ups' : 'Follow-ups'}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateCampaign(campaign)}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-all"
                    title={locale === 'es' ? 'Duplicar' : 'Duplicate'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleCampaignStatus(campaign.id, campaign.estado)}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-all"
                    title={campaign.estado === 'activa' ? t('pause') : t('activate')}
                  >
                    {campaign.estado === 'activa' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => terminateCampaign(campaign.id)}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title={t('terminate')}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Target className="w-4 h-4 text-dark-400" />
                  <span className="capitalize">{campaign.rubro_objetivo}</span>
                  {campaign.ciudad && <span className="text-dark-500">• {campaign.ciudad}</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Calendar className="w-4 h-4 text-dark-400" />
                  <span>
                    {campaign.fecha_inicio?.toDate?.()?.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US') || (locale === 'es' ? 'Sin fecha' : 'No date')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.leads_count || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('leads')}</div>
                </div>
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-brand-400">
                    {campaign.demos_generadas || 0}
                  </div>
                  <div className="text-xs text-dark-400">Demos</div>
                </div>
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-emerald-400">
                    {campaign.mensajes_enviados || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('sentEs')}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleScrape(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-scrape` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  {locale === 'es' ? 'Scraping' : 'Scrape'}
                </button>
                <button
                  onClick={() => handleProcessDemos(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-demos` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {locale === 'es' ? 'Demos' : 'Demos'}
                </button>
                <button
                  onClick={() => handleSendMessages(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-messages` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <MessageCircle className="w-3 h-3" />
                  )}
                  {locale === 'es' ? 'WhatsApp' : 'WhatsApp'}
                </button>
              </div>

              {/* Preview del mensaje */}
              {(campaign.producto_mensaje || campaign.mensaje_template) && (
                <div className="mt-3 bg-dark-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-medium text-dark-400">
                      {locale === 'es' ? 'Preview del mensaje' : 'Message preview'}
                    </span>
                  </div>
                  <p className="text-xs text-dark-300 whitespace-pre-line leading-relaxed">
                    {(campaign.producto_mensaje || campaign.mensaje_template || '')
                      .replace(/{nombre_negocio}/g, 'Ej: Inmoxil Propiedades')
                      .replace(/{url_demo}/g, 'https://revendr-9add8.web.app/...')
                      .replace(/{rubro}/g, 'inmobiliaria')
                      .substring(0, 200)}
                    {(campaign.producto_mensaje || campaign.mensaje_template || '').length > 200 && '...'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">
                {editingId
                  ? (locale === 'es' ? 'Editar Campaña' : 'Edit Campaign')
                  : t('newCampaign')}
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setEditingId(null); setFormData({ nombre: '', producto_id: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' }) }}
                className="text-dark-400 hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingId ? handleEditCampaign : handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('campaignName')} *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-field"
                  placeholder={locale === 'es' ? 'Ej: Inmobiliarias Buenos Aires Q1 2024' : 'E.g.: Real Estate Buenos Aires Q1 2024'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  {locale === 'es' ? 'Producto a ofrecer' : 'Product to offer'}
                </label>
                <select
                  value={formData.producto_id}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value)
                    setFormData({
                      ...formData,
                      producto_id: e.target.value,
                      rubro_objetivo: product?.nicho || formData.rubro_objetivo,
                      mensaje_template: product?.mensaje_whatsapp || formData.mensaje_template,
                    })
                  }}
                  className="select-field"
                >
                  <option value="">{locale === 'es' ? 'Seleccionar producto (opcional)' : 'Select product (optional)'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es'
                    ? 'Si seleccionás un producto, se usa su demo URL y mensaje automáticamente'
                    : 'If you select a product, its demo URL and message are used automatically'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('targetNiche')}
                </label>
                <select
                  value={formData.rubro_objetivo}
                  onChange={(e) => setFormData({ ...formData, rubro_objetivo: e.target.value })}
                  className="select-field"
                >
                  <option value="">{locale === 'es' ? 'Seleccionar rubro' : 'Select niche'}</option>
                  {RUBROS.map(r => (
                    <option key={r.value} value={r.value}>{locale === 'es' ? r.labelEs : r.labelEn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('city')}
                </label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  className="input-field"
                  placeholder={locale === 'es' ? 'Ej: Buenos Aires, Córdoba, etc.' : 'E.g.: Buenos Aires, Córdoba, etc.'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Mensaje de WhatsApp' : 'WhatsApp Message'}
                </label>
                <textarea
                  value={formData.mensaje_template}
                  onChange={(e) => setFormData({ ...formData, mensaje_template: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder={locale === 'es' ? 'Hola {nombre_negocio}, te propongo algo interesante...' : 'Hello {nombre_negocio}, I have something interesting for you...'}
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es' ? 'Variables disponibles:' : 'Available variables:'} {'{nombre_negocio}'}, {'{url_demo}'}, {'{rubro}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Fecha de fin (opcional)' : 'End date (optional)'}
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es' ? 'La campaña se pausa automáticamente después de esta fecha' : 'Campaign auto-pauses after this date'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setEditingId(null); setFormData({ nombre: '', producto_id: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' }) }}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('creating')}
                    </>
                  ) : (
                    t('createCampaign')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {analyticsCampaign && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {locale === 'es' ? 'Analytics de' : 'Analytics for'} {analyticsCampaign.nombre}
              </h2>
              <button
                onClick={() => setAnalyticsCampaign(null)}
                className="text-dark-400 hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{analyticsCampaign.leads_count || 0}</div>
                <div className="text-xs text-dark-400">{locale === 'es' ? 'Leads Scrapeados' : 'Leads Scraped'}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-violet-400">{analyticsCampaign.demos_generadas || 0}</div>
                <div className="text-xs text-dark-400">{locale === 'es' ? 'Demos Generadas' : 'Demos Generated'}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{analyticsCampaign.mensajes_enviados || 0}</div>
                <div className="text-xs text-dark-400">{locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent'}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {analyticsCampaign.leads_count > 0
                    ? Math.round((analyticsCampaign.mensajes_enviados / analyticsCampaign.leads_count) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-dark-400">{locale === 'es' ? 'Tasa de Envío' : 'Send Rate'}</div>
              </div>
            </div>

            {/* Funnel */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-dark-300 mb-2">{locale === 'es' ? 'Funnel' : 'Funnel'}</h3>
              {[
                { label: locale === 'es' ? 'Leads Scrapeados' : 'Leads Scraped', value: analyticsCampaign.leads_count || 0, color: 'bg-orange-500' },
                { label: locale === 'es' ? 'Demos Generadas' : 'Demos Generated', value: analyticsCampaign.demos_generadas || 0, color: 'bg-violet-500' },
                { label: locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent', value: analyticsCampaign.mensajes_enviados || 0, color: 'bg-emerald-500' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-dark-400 shrink-0">{step.label}</div>
                  <div className="flex-1 bg-dark-900 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all`}
                      style={{
                        width: `${analyticsCampaign.leads_count > 0
                          ? (step.value / analyticsCampaign.leads_count) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-dark-200 w-8 text-right">{step.value}</span>
                </div>
              ))}
            </div>

            {analyticsCampaign.fecha_inicio && (
              <div className="mt-4 text-xs text-dark-500">
                {locale === 'es' ? 'Iniciada:' : 'Started:'} {analyticsCampaign.fecha_inicio?.toDate?.()?.toLocaleDateString('es-AR')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-ups Modal */}
      {followupsCampaign && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {locale === 'es' ? 'Follow-ups para' : 'Follow-ups for'} {followupsCampaign.nombre}
              </h2>
              <button onClick={() => setFollowupsCampaign(null)} className="text-dark-400 hover:text-dark-200">✕</button>
            </div>

            <p className="text-sm text-dark-400 mb-4">
              {locale === 'es'
                ? 'Mensajes automáticos que se envían después de X días si el lead no respondió.'
                : 'Auto-messages sent after X days if lead didn\'t respond.'}
            </p>

            <div className="space-y-4">
              {followups.map((fu, i) => (
                <div key={i} className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-dark-400">
                        {locale === 'es' ? 'Día' : 'Day'}
                      </span>
                      <input
                        type="number"
                        value={fu.delayDays}
                        onChange={(e) => updateFollowup(i, 'delayDays', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 bg-dark-800 border border-dark-600 rounded text-sm text-dark-100 text-center"
                        min="1"
                        max="30"
                      />
                    </div>
                    <button
                      onClick={() => removeFollowup(i)}
                      className="text-dark-500 hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={fu.message}
                    onChange={(e) => updateFollowup(i, 'message', e.target.value)}
                    className="input-field min-h-[80px] text-sm"
                    placeholder="Hola {nombre_negocio}, ..."
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addFollowup}
              className="w-full mt-4 py-2 border border-dashed border-dark-600 rounded-lg text-sm text-dark-400 hover:text-dark-200 hover:border-dark-400 transition-all"
            >
              + {locale === 'es' ? 'Agregar follow-up' : 'Add follow-up'}
            </button>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setFollowupsCampaign(null)} className="btn-secondary flex-1">
                {t('cancel')}
              </button>
              <button onClick={saveFollowups} className="btn-primary flex-1">
                {locale === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
