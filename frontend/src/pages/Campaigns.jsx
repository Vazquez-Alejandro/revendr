import { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Loader2,
  Megaphone,
  Calendar,
  Target
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
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    rubro_objetivo: '',
    mensaje_template: '',
    ciudad: '',
  })

  useEffect(() => {
    loadCampaigns()
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

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!formData.nombre || !formData.rubro_objetivo) {
      toast.error(locale === 'es' ? 'Completa todos los campos obligatorios' : 'Fill in all required fields')
      return
    }

    setCreating(true)
    try {
      await addDoc(collection(db, 'campanias'), {
        ...formData,
        estado: 'activa',
        fecha_inicio: new Date(),
        fecha_creacion: new Date(),
        leads_count: 0,
        demos_generadas: 0,
        mensajes_enviados: 0,
      })
      toast.success(locale === 'es' ? 'Campaña creada exitosamente' : 'Campaign created successfully')
      setShowCreateModal(false)
      setFormData({ nombre: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' })
      loadCampaigns()
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error(locale === 'es' ? 'Error al crear la campaña' : 'Error creating campaign')
    } finally {
      setCreating(false)
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

  const ESTADOS = locale === 'es' ? ESTADOS_ES : ESTADOS_EN

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-100 mb-1">
                    {campaign.nombre}
                  </h3>
                  <span className={`badge ${ESTADOS[campaign.estado]?.class || 'badge-info'}`}>
                    {ESTADOS[campaign.estado]?.label || campaign.estado}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Target className="w-4 h-4 text-dark-400" />
                  <span className="capitalize">{campaign.rubro_objetivo}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Calendar className="w-4 h-4 text-dark-400" />
                  <span>
                    {campaign.fecha_inicio?.toDate?.()?.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US') || (locale === 'es' ? 'Sin fecha' : 'No date')}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.leads_count || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('leads')}</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.demos_generadas || 0}
                  </div>
                  <div className="text-xs text-dark-400">Demos</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.mensajes_enviados || 0}
                  </div>
                  <div className="text-xs text-dark-400">{t('sentEs')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">
                {t('newCampaign')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-dark-400 hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
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
                  {t('targetNiche')} *
                </label>
                <select
                  value={formData.rubro_objetivo}
                  onChange={(e) => setFormData({ ...formData, rubro_objetivo: e.target.value })}
                  className="select-field"
                  required
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
                  {t('messageTemplate')}
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

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
    </div>
  )
}
