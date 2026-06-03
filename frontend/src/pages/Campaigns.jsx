import { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { db } from '../config/firebase'
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
  { value: 'inmobiliaria', label: 'Inmobiliarias' },
  { value: 'estetica', label: 'Estética / Peluquería' },
  { value: 'clinica', label: 'Clínicas Médicas' },
  { value: 'restaurante', label: 'Restaurantes' },
  { value: 'gimnasio', label: 'Gimnasios' },
  { value: 'otro', label: 'Otro' },
]

const ESTADOS = {
  activa: { label: 'Activa', class: 'badge-success' },
  pausada: { label: 'Pausada', class: 'badge-warning' },
  terminada: { label: 'Terminada', class: 'badge-danger' },
}

export default function Campaigns() {
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
      toast.error('Error al cargar campañas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!formData.nombre || !formData.rubro_objetivo) {
      toast.error('Completa todos los campos obligatorios')
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
      toast.success('Campaña creada exitosamente')
      setShowCreateModal(false)
      setFormData({ nombre: '', rubro_objetivo: '', mensaje_template: '', ciudad: '' })
      loadCampaigns()
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Error al crear la campaña')
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
      toast.success(`Campaña ${newStatus === 'activa' ? 'activada' : 'pausada'}`)
      loadCampaigns()
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error('Error al actualizar la campaña')
    }
  }

  const terminateCampaign = async (campaignId) => {
    if (!confirm('¿Estás seguro de terminar esta campaña?')) return
    
    try {
      await updateDoc(doc(db, 'campanias', campaignId), {
        estado: 'terminada',
        fecha_fin: new Date(),
      })
      toast.success('Campaña terminada')
      loadCampaigns()
    } catch (error) {
      console.error('Error terminating campaign:', error)
      toast.error('Error al terminar la campaña')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Campañas</h1>
          <p className="text-dark-400 mt-1">Gestiona tus campañas de prospección</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Campaña
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
            No hay campañas creadas
          </h3>
          <p className="text-dark-400 mb-4">
            Crea tu primera campaña para empezar a generar leads
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Crear Primera Campaña
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
                    title={campaign.estado === 'activa' ? 'Pausar' : 'Activar'}
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
                    title="Terminar"
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
                    {campaign.fecha_inicio?.toDate?.()?.toLocaleDateString('es-AR') || 'Sin fecha'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-dark-100">
                    {campaign.leads_count || 0}
                  </div>
                  <div className="text-xs text-dark-400">Leads</div>
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
                  <div className="text-xs text-dark-400">Enviados</div>
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
                Nueva Campaña
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
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Inmobiliarias Buenos Aires Q1 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Rubro Objetivo *
                </label>
                <select
                  value={formData.rubro_objetivo}
                  onChange={(e) => setFormData({ ...formData, rubro_objetivo: e.target.value })}
                  className="select-field"
                  required
                >
                  <option value="">Seleccionar rubro</option>
                  {RUBROS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Ciudad / Zona
                </label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Buenos Aires, Córdoba, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Mensaje Template (WhatsApp)
                </label>
                <textarea
                  value={formData.mensaje_template}
                  onChange={(e) => setFormData({ ...formData, mensaje_template: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder="Hola {nombre_negocio}, te propuso algo interesante... &#10;&#10;Usa {url_demo} para insertar el link de la demo"
                />
                <p className="text-xs text-dark-500 mt-1">
                  Variables disponibles: {'{nombre_negocio}'}, {'{url_demo}'}, {'{rubro}'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Campaña'
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
