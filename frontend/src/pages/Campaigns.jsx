import { useEffect, useState, useRef } from 'react'
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
  Mail,
  Search,
  Package,
  Copy,
  Edit3,
  BarChart3,
  Eye,
  Send,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../hooks/useConfirm'

const RUBROS = [
  { value: 'inmobiliaria', labelEs: 'Inmobiliarias', labelEn: 'Real Estate' },
  { value: 'estetica', labelEs: 'Estética / Peluquería', labelEn: 'Beauty / Salon' },
  { value: 'clinica', labelEs: 'Clínicas Médicas', labelEn: 'Medical Clinics' },
  { value: 'restaurante', labelEs: 'Restaurantes', labelEn: 'Restaurants' },
  { value: 'gimnasio', labelEs: 'Gimnasios', labelEn: 'Gyms' },
  { value: 'tecnologia', labelEs: 'Tecnología / SaaS', labelEn: 'Technology / SaaS' },
  { value: 'agencia_marketing', labelEs: 'Agencias de Marketing', labelEn: 'Marketing Agencies' },
  { value: 'desarrolladores', labelEs: 'Desarrolladores / Freelancers', labelEn: 'Developers / Freelancers' },
  { value: 'otro', labelEs: 'Otro', labelEn: 'Other' },
]

const CIUDADES_ARGENTINA = [
  'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán',
  'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan',
  'Resistencia', 'Santiago del Estero', 'Corrientes', 'Neuquén', 'Posadas',
  'Paraná', 'San Salvador de Jujuy', 'Bahía Blanca', 'Formosa', 'San Luis',
  'La Rioja', 'Catamarca', 'Rawson', 'San Carlos de Bariloche', 'Concepción del Uruguay',
  'Gualeguaychú', 'Villa Carlos Paz', 'San Rafael', 'Junín', 'Pergamino',
  'Olavarría', 'Chivilcoy', 'Lobos', 'Bragado', '25 de Mayo',
  'Nueve de Julio', 'Mercedes', 'Dolores', 'San Clemente del Tuyú', 'Pinamar',
  'Cariló', 'Villa Gesell', 'Mar de Ajó', 'San Bernardo', 'Miramar',
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
  const { confirm, ConfirmDialog } = useConfirm()
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
  const [roiCampaign, setRoiCampaign] = useState(null)
  const [roiData, setRoiData] = useState(null)
  const [revenueModal, setRevenueModal] = useState(null)
  const [revenueForm, setRevenueForm] = useState({ leadId: '', amount: '', notes: '' })
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const cityInputRef = useRef(null)
  const [abTestModal, setAbTestModal] = useState(null)
  const [abTestForm, setAbTestForm] = useState({ messageA: '', messageB: '' })
  const [abResults, setAbResults] = useState(null)
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

  useEffect(() => {
    const hasRunning = campaigns.some(c => c.scraping_status === 'running')
    if (!hasRunning) return

    const interval = setInterval(() => {
      loadCampaigns()
    }, 10000)

    return () => clearInterval(interval)
  }, [campaigns])

  const loadCampaigns = async () => {
    try {
      const q = query(
        collection(db, 'campanias'),
        where('user_id', '==', auth.currentUser?.uid || '')
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.fecha_inicio?.toMillis?.() || 0) - (a.fecha_inicio?.toMillis?.() || 0))

      data.forEach(newCamp => {
        const oldCamp = campaigns.find(c => c.id === newCamp.id)
        if (oldCamp?.scraping_status === 'running' && newCamp.scraping_status === 'completed') {
          toast.success(
            locale === 'es'
              ? `${newCamp.nombre}: ${newCamp.leads_count || 0} leads encontrados`
              : `${newCamp.nombre}: ${newCamp.leads_count || 0} leads found`,
            { duration: 5000 }
          )
        }
      })

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
        user_id: auth.currentUser?.uid || '',
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
        propuestas_generadas: 0,
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
    toast.loading(locale === 'es' ? 'Iniciando scraping Apify...' : 'Starting Apify scrape...', { id: 'scrape' })
    try {
      const result = await api.campaigns.triggerScrape(campaignId, {})
      toast.success(
        locale === 'es' 
          ? `Scraping Apify iniciado. Buscando leads...` 
          : `Apify scrape started. Searching for leads...`,
        { id: 'scrape' }
      )
      setTimeout(loadCampaigns, 3000)
    } catch (error) {
      console.error('Error starting scrape:', error)
      toast.error(
        error.message.includes('not configured')
          ? (locale === 'es' ? 'Token de Apify no configurado.' : 'Apify token not configured.')
          : (locale === 'es' ? 'Error al iniciar scraping' : 'Error starting scrape'),
        { id: 'scrape' }
      )
    } finally {
      setProcessingAction(null)
    }
  }

  const handleGoogleScrape = async (campaignId) => {
    setProcessingAction(`${campaignId}-google`)
    toast.loading(locale === 'es' ? 'Buscando en Google Places...' : 'Searching Google Places...', { id: 'google' })
    try {
      const result = await api.campaigns.triggerGoogleScrape(campaignId, {})
      if (result.data?.saved > 0) {
        toast.success(
          locale === 'es'
            ? `${result.data.saved} leads encontrados via Google Places`
            : `${result.data.saved} leads found via Google Places`,
          { id: 'google' }
        )
        loadCampaigns()
      } else {
        toast.success(
          locale === 'es' ? 'Búsqueda completada, sin leads nuevos' : 'Search completed, no new leads',
          { id: 'google' }
        )
      }
    } catch (error) {
      console.error('Error in Google Places scrape:', error)
      toast.error(
        error.message.includes('not configured')
          ? (locale === 'es' ? 'Google Places API key no configurada. Agregala en .env' : 'Google Places API key not configured. Add it in .env')
          : (locale === 'es' ? 'Error al buscar en Google Places' : 'Error searching Google Places'),
        { id: 'google' }
      )
    } finally {
      setProcessingAction(null)
    }
  }

  const handleProcessDemos = async (campaignId) => {
    setProcessingAction(`${campaignId}-demos`)
    toast.loading(locale === 'es' ? 'Calificando leads y generando propuestas...' : 'Qualifying leads and generating proposals...', { id: 'demos' })
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      }

      // First, score all leads
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/leads/score-all`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ campaignId }),
        }
      )

      // Then generate messages for qualified leads
      const msgResult = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/generate-messages`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ minScore: 0 }),
        }
      ).then(r => r.json())

      // Then generate demos
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/process-demos`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ limit: 20 }),
        }
      ).then(r => r.json())

      toast.success(
        locale === 'es'
          ? `${msgResult.data?.generated || 0} mensajes personalizados, ${result.data?.processed || 0} propuestas generadas`
          : `${msgResult.data?.generated || 0} personalized messages, ${result.data?.processed || 0} proposals generated`,
        { id: 'demos', duration: 5000 }
      )
      loadCampaigns()
    } catch (error) {
      console.error('Error processing demos:', error)
      toast.error(locale === 'es' ? 'Error al procesar' : 'Error processing', { id: 'demos' })
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSendMessages = async (campaignId) => {
    setProcessingAction(`${campaignId}-messages`)
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    }

    // Check if WhatsApp is configured
    const configRes = await fetch(
      `https://us-central1-revendr-9add8.cloudfunctions.net/api/whatsapp/config`,
      { headers: authHeaders }
    ).then(r => r.json())
    const whatsappConfigured = configRes?.data?.configured

    if (whatsappConfigured) {
      toast.loading(locale === 'es' ? 'Enviando mensajes por WhatsApp...' : 'Sending WhatsApp messages...', { id: 'messages' })
      try {
        const result = await fetch(
          `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/send-messages`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ limit: 10, minScore: 30 }),
          }
        ).then(r => r.json())

        toast.success(
          locale === 'es'
            ? `${result.data?.sent || 0} mensajes enviados, ${result.data?.failed || 0} fallidos, ${result.data?.skippedLowScore || 0} descartados (score bajo)`
            : `${result.data?.sent || 0} messages sent, ${result.data?.failed || 0} failed, ${result.data?.skippedLowScore || 0} skipped (low score)`,
          { id: 'messages', duration: 5000 }
        )
        loadCampaigns()
      } catch (error) {
        console.error('Error sending WhatsApp messages:', error)
        toast.error(locale === 'es' ? 'Error al enviar por WhatsApp' : 'Error sending via WhatsApp', { id: 'messages' })
      } finally {
        setProcessingAction(null)
      }
    } else {
        toast.loading(locale === 'es' ? 'Enviando propuestas por email...' : 'Sending proposals via email...', { id: 'messages' })
      try {
        const result = await fetch(
          `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/send-demo-emails`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        ).then(r => r.json())

        const waFallback = result.data?.whatsapp_fallback || 0
        toast.success(
          locale === 'es'
            ? `${result.data?.sent || 0} por email, ${waFallback} vía WhatsApp, ${result.data?.skipped || 0} sin contacto`
            : `${result.data?.sent || 0} via email, ${waFallback} via WhatsApp, ${result.data?.skipped || 0} no contact`,
          { id: 'messages', duration: 6000 }
        )
        if (result.data?.hasWhatsappLinks) {
          toast(locale === 'es' ? '📱 Revisá Telegram para los enlaces WhatsApp de leads sin email' : '📱 Check Telegram for WhatsApp links of leads without email', { duration: 8000 })
        }
        loadCampaigns()
      } catch (error) {
        console.error('Error sending demo emails:', error)
        toast.error(locale === 'es' ? 'Error al enviar por email' : 'Error sending via email', { id: 'messages' })
      } finally {
        setProcessingAction(null)
      }
    }
  }

  const handleSendTestTelegram = async (campaignId) => {
    setProcessingAction(`${campaignId}-test-tg`)
    toast.loading(locale === 'es' ? 'Enviando propuesta a Telegram...' : 'Sending proposal to Telegram...', { id: 'test-tg' })
    try {
      const chatId = 8091046688
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/test/send-demo-email?campaignId=${campaignId}&chatId=${chatId}`
      ).then(r => r.json())

      if (result.data?.sent) {
        toast.success(
          locale === 'es'
          ? 'Propuesta enviada a Telegram! Revisá @Revendr_bot'
          : 'Proposal sent to Telegram! Check @Revendr_bot',
          { id: 'test-tg', duration: 8000 }
        )
      } else {
        toast.error(
          locale === 'es' ? 'No se pudo enviar a Telegram' : 'Could not send to Telegram',
          { id: 'test-tg' }
        )
      }
    } catch (error) {
      console.error('Error sending test telegram:', error)
      toast.error(locale === 'es' ? 'Error al enviar a Telegram' : 'Error sending to Telegram', { id: 'test-tg' })
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSendTestEmail = async (campaignId) => {
    setProcessingAction(`${campaignId}-test`)
    const email = auth.currentUser?.email
    if (!email) {
      toast.error(locale === 'es' ? 'No hay email registrado en tu cuenta' : 'No email on your account')
      setProcessingAction(null)
      return
    }
    toast.loading(locale === 'es' ? 'Enviando propuesta a tu email...' : 'Sending proposal to your email...', { id: 'test' })
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/test/send-demo-email?campaignId=${campaignId}&email=${encodeURIComponent(email)}`
      ).then(r => r.json())

      if (result.data?.sent) {
        toast.success(
          locale === 'es'
            ? `Propuesta enviada a ${email}. Revisá tu bandeja de entrada.`
            : `Proposal sent to ${email}. Check your inbox.`,
          { id: 'test', duration: 8000 }
        )
      } else {
        toast.error(
          locale === 'es'
            ? `No se pudo enviar: ${result.data?.reason || 'error'}`
            : `Could not send: ${result.data?.reason || 'error'}`,
          { id: 'test' }
        )
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error(locale === 'es' ? 'Error al enviar propuesta' : 'Error sending proposal', { id: 'test' })
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
    if (!(await confirm(t('confirmTerminate'), 'Finalizar'))) return
    
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
        nombre: campaign.nombre + ' (copia)',
        user_id: auth.currentUser?.uid || '',
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
        propuestas_generadas: 0,
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
      { delayDays: 2, message: 'Hola {nombre_negocio}, ¿viste tu propuesta? Si tenés dudas te la explico.' },
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

  const loadROI = async (campaignId) => {
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/roi`
      ).then(r => r.json())
      setRoiData(result.data)
    } catch (error) {
      console.error('Error loading ROI:', error)
    }
  }

  const openROI = async (campaign) => {
    setRoiCampaign(campaign)
    await loadROI(campaign.id)
  }

  const addRevenue = async (e) => {
    e.preventDefault()
    if (!revenueForm.amount) return
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${revenueModal.id}/revenue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(revenueForm),
        }
      )
      toast.success(locale === 'es' ? 'Ingreso registrado' : 'Revenue recorded')
      setRevenueModal(null)
      setRevenueForm({ leadId: '', amount: '', notes: '' })
      loadCampaigns()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error')
    }
  }

  const toggleAutoScrape = async (campaignId, current) => {
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/set-schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auto_scrape: !current, scrape_schedule: 'weekly' }),
        }
      )
      toast.success(locale === 'es' ? 'Scraping automático actualizado' : 'Auto-scrape updated')
      loadCampaigns()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error')
    }
  }

  const processSequence = async (campaignId) => {
    setProcessingAction(`${campaignId}-sequence`)
    toast.loading(locale === 'es' ? 'Procesando secuencia inteligente...' : 'Processing smart sequence...', { id: 'sequence' })
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/process-sequence`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      ).then(r => r.json())
      toast.success(
        locale === 'es'
          ? `${result.data?.actions || 0} acciones ejecutadas (emails enviados)`
          : `${result.data?.actions || 0} actions executed (emails sent)`,
        { id: 'sequence', duration: 4000 }
      )
      loadCampaigns()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error', { id: 'sequence' })
    } finally {
      setProcessingAction(null)
    }
  }

  const openAbTest = (campaign) => {
    setAbTestModal(campaign)
    setAbTestForm({
      messageA: campaign.producto_mensaje || campaign.mensaje_template || 'Hola {nombre_negocio}, te preparé algo especial: {url_propuesta}',
      messageB: campaign.producto_mensaje || campaign.mensaje_template || 'Hola {nombre_negocio}, mirá lo que armamos para vos: {url_propuesta}',
    })
    loadAbResults(campaign.id)
  }

  const loadAbResults = async (campaignId) => {
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${campaignId}/ab-results`
      ).then(r => r.json())
      setAbResults(result.data)
    } catch (error) {
      console.error('Error loading A/B results:', error)
    }
  }

  const createAbTest = async () => {
    if (!abTestForm.messageA || !abTestForm.messageB) {
      toast.error(locale === 'es' ? 'Completá ambos mensajes' : 'Fill both messages')
      return
    }
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/campaigns/${abTestModal.id}/ab-test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(abTestForm),
        }
      ).then(r => r.json())

      if (result.success) {
        toast.success(
          locale === 'es'
            ? `A/B Test creado: ${result.data.groupA} vs ${result.data.groupB} leads`
            : `A/B Test created: ${result.data.groupA} vs ${result.data.groupB} leads`,
          { duration: 4000 }
        )
        setAbTestModal(null)
        loadAbResults(abTestModal.id)
      } else {
        toast.error(result.error?.message || 'Error')
      }
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error')
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
                  <button
                    onClick={() => openROI(campaign)}
                    className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                    title="ROI"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleAutoScrape(campaign.id, campaign.auto_scrape)}
                    className={`p-2 rounded-lg transition-all ${
                      campaign.auto_scrape
                        ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                    }`}
                    title={locale === 'es' ? 'Scraping automático' : 'Auto-scrape'}
                  >
                    <RefreshCw className="w-4 h-4" />
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

              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.leads_count || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('leads')}</div>
                </div>
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-brand-400">
                    {campaign.propuestas_generadas || 0}
                  </div>
                  <div className="text-xs text-dark-400">{locale === 'es' ? 'Props.' : 'Props.'}</div>
                </div>
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-emerald-400">
                    {campaign.mensajes_enviados || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('sentEs')}</div>
                </div>
                <div className="bg-dark-900 rounded-lg py-2">
                  <div className="text-lg font-semibold text-amber-400">
                    {campaign.total_revenue ? `$${campaign.total_revenue}` : '$0'}
                  </div>
                  <div className="text-xs text-dark-400">{locale === 'es' ? 'Ingresos' : 'Revenue'}</div>
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
                  Apify
                </button>
                <button
                  onClick={() => handleGoogleScrape(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-google` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Globe className="w-3 h-3" />
                  )}
                  Google
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
                  {locale === 'es' ? 'Props.' : 'Props.'}
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

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSendTestEmail(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-test` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  {locale === 'es' ? 'Email' : 'Email'}
                </button>
                <button
                  onClick={() => handleSendTestTelegram(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg text-xs font-medium hover:bg-sky-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-test-tg` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Telegram
                </button>
                <button
                  onClick={() => processSequence(campaign.id)}
                  disabled={processingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-medium hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {processingAction === `${campaign.id}-sequence` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {locale === 'es' ? 'Secuencia' : 'Sequence'}
                </button>
                <button
                  onClick={() => openAbTest(campaign)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-lg text-xs font-medium hover:bg-pink-500/20 transition-all"
                >
                  <span className="text-xs font-bold">A/B</span>
                  {locale === 'es' ? 'Test' : 'Test'}
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
                      .replace(/{nombre_negocio}/g, 'Ej: Revendr')
                      .replace(/{url_propuesta}/g, 'https://revendr-9add8.web.app/...')
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
                    ? 'Si seleccionás un producto, se usa su URL y mensaje automáticamente'
                    : 'If you select a product, its URL and message are used automatically'}
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

              <div className="relative">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('city')}
                </label>
                <input
                  ref={cityInputRef}
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => {
                    setFormData({ ...formData, ciudad: e.target.value })
                    setCityFilter(e.target.value)
                    setShowCityDropdown(true)
                  }}
                  onFocus={() => {
                    setCityFilter(formData.ciudad)
                    setShowCityDropdown(true)
                  }}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  className="input-field"
                  placeholder={locale === 'es' ? 'Ej: Buenos Aires, Córdoba, etc.' : 'E.g.: Buenos Aires, Córdoba, etc.'}
                />
                {showCityDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {CIUDADES_ARGENTINA
                      .filter(c => c.toLowerCase().includes(cityFilter.toLowerCase()))
                      .slice(0, 10)
                      .map(ciudad => (
                        <button
                          key={ciudad}
                          onMouseDown={() => {
                            setFormData({ ...formData, ciudad })
                            setShowCityDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 transition-colors"
                        >
                          {ciudad}
                        </button>
                      ))}
                    {CIUDADES_ARGENTINA.filter(c => c.toLowerCase().includes(cityFilter.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-sm text-dark-500">
                        {locale === 'es' ? 'Escribí para buscar...' : 'Type to search...'}
                      </div>
                    )}
                  </div>
                )}
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
                  {locale === 'es' ? 'Variables disponibles:' : 'Available variables:'} {'{nombre_negocio}'}, {'{url_propuesta}'}, {'{rubro}'}
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
                <div className="text-2xl font-bold text-violet-400">{analyticsCampaign.propuestas_generadas || 0}</div>
                <div className="text-xs text-dark-400">{locale === 'es' ? 'Props. Generadas' : 'Props. Generated'}</div>
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
                { label: locale === 'es' ? 'Props. Generadas' : 'Props. Generated', value: analyticsCampaign.propuestas_generadas || 0, color: 'bg-violet-500' },
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

      {/* ROI Modal */}
      {roiCampaign && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                ROI — {roiCampaign.nombre}
              </h2>
              <button onClick={() => { setRoiCampaign(null); setRoiData(null) }} className="text-dark-400 hover:text-dark-200">✕</button>
            </div>

            {roiData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">${roiData.totalRevenue}</div>
                    <div className="text-xs text-dark-400">{locale === 'es' ? 'Ingresos' : 'Revenue'}</div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-400">{roiData.totalClients}</div>
                    <div className="text-xs text-dark-400">{locale === 'es' ? 'Clientes' : 'Clients'}</div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">${roiData.estimatedCost}</div>
                    <div className="text-xs text-dark-400">{locale === 'es' ? 'Costo Est.' : 'Est. Cost'}</div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold ${roiData.roi > 0 ? 'text-emerald-400' : 'text-dark-400'}`}>
                      {roiData.roi}%
                    </div>
                    <div className="text-xs text-dark-400">ROI</div>
                  </div>
                </div>

                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">{locale === 'es' ? 'Tasa de Conversión' : 'Conversion Rate'}</span>
                    <span className="text-dark-200 font-medium">{roiData.conversionRate}%</span>
                  </div>
                  <div className="w-full bg-dark-800 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(roiData.conversionRate, 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => { setRoiCampaign(null); setRoiData(null); setRevenueModal(roiCampaign) }}
                  className="btn-primary w-full"
                >
                  {locale === 'es' ? '+ Registrar Ingreso' : '+ Record Revenue'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Modal */}
      {revenueModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">
                {locale === 'es' ? 'Registrar Ingreso' : 'Record Revenue'}
              </h2>
              <button onClick={() => setRevenueModal(null)} className="text-dark-400 hover:text-dark-200">✕</button>
            </div>

            <form onSubmit={addRevenue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Monto' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
                </label>
                <input
                  type="text"
                  value={revenueForm.notes}
                  onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })}
                  className="input-field"
                  placeholder={locale === 'es' ? 'Ej: Plan anual' : 'E.g.: Annual plan'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRevenueModal(null)} className="btn-secondary flex-1">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {locale === 'es' ? 'Guardar' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A/B Test Modal */}
      {abTestModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
                <span className="text-pink-400 font-bold">A/B</span>
                {locale === 'es' ? 'Test de Mensajes' : 'Message Test'} — {abTestModal.nombre}
              </h2>
              <button onClick={() => { setAbTestModal(null); setAbResults(null) }} className="text-dark-400 hover:text-dark-200">✕</button>
            </div>

            <p className="text-sm text-dark-400 mb-4">
              {locale === 'es'
                ? 'Dividí tus leads en 2 grupos y probá qué mensaje convierte más. Los leads se reparten 50/50 automáticamente.'
                : 'Split your leads into 2 groups and test which message converts better. Leads are split 50/50 automatically.'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-pink-400 mb-2">Variante A</label>
                <textarea
                  value={abTestForm.messageA}
                  onChange={(e) => setAbTestForm({ ...abTestForm, messageA: e.target.value })}
                  className="input-field min-h-[120px] text-sm"
                  placeholder="Hola {nombre_negocio}, ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Variante B</label>
                <textarea
                  value={abTestForm.messageB}
                  onChange={(e) => setAbTestForm({ ...abTestForm, messageB: e.target.value })}
                  className="input-field min-h-[120px] text-sm"
                  placeholder="Hola {nombre_negocio}, ..."
                />
              </div>
            </div>

            <button
              onClick={createAbTest}
              className="w-full py-3 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-lg font-medium hover:bg-pink-500/30 transition-all mb-6"
            >
              {locale === 'es' ? 'Crear A/B Test' : 'Create A/B Test'}
            </button>

            {/* Previous Tests */}
            {abResults && abResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-dark-300 mb-3">
                  {locale === 'es' ? 'Tests Anteriores' : 'Previous Tests'}
                </h3>
                <div className="space-y-3">
                  {abResults.map((test) => (
                    <div key={test.id} className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-dark-500">
                          {test.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR')}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          test.winner === 'A' ? 'bg-pink-500/20 text-pink-400' :
                          test.winner === 'B' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-dark-700 text-dark-400'
                        }`}>
                          {test.winner === 'A' ? 'A ganó' : test.winner === 'B' ? 'B ganó' : 'Empate'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-pink-400">{test.groupA?.engagementRate || 0}%</div>
                          <div className="text-xs text-dark-500">A ({test.groupA?.size || 0} leads)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-400">{test.groupB?.engagementRate || 0}%</div>
                          <div className="text-xs text-dark-500">B ({test.groupB?.size || 0} leads)</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
