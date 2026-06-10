import { useEffect, useState, useRef } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  doc,
  query, 
  where, 
  orderBy,
  limit,
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { 
  Users, 
  Download, 
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Upload,
  X,
  Eye,
  Phone,
  Mail,
  MapPin,
  Star,
  Calendar,
  MessageCircle,
  LayoutGrid,
  List,
  Megaphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import LeadPipeline from './LeadPipeline'

const RUBROS = [
  { value: 'todos', labelEs: 'Todos los Rubros', labelEn: 'All Niches' },
  { value: 'inmobiliaria', labelEs: 'Inmobiliarias', labelEn: 'Real Estate' },
  { value: 'estetica', labelEs: 'Estética / Peluquería', labelEn: 'Beauty / Salon' },
  { value: 'clinica', labelEs: 'Clínicas Médicas', labelEn: 'Medical Clinics' },
  { value: 'restaurante', labelEs: 'Restaurantes', labelEn: 'Restaurants' },
  { value: 'gimnasio', labelEs: 'Gimnasios', labelEn: 'Gyms' },
]

const ESTADOS = {
  scraped: { class: 'badge-info' },
  demo_generada: { class: 'badge-warning' },
  mensaje_enviado: { class: 'badge-info' },
  interesado: { class: 'badge-success' },
  cliente_activo: { class: 'badge-success' },
}

const ESTADOS_LABELS_ES = {
  scraped: 'Scrapeado',
  demo_generada: 'Demo Generada',
  mensaje_enviado: 'Mensaje Enviado',
  interesado: 'Interesado',
  cliente_activo: 'Cliente Activo',
}

const ESTADOS_LABELS_EN = {
  scraped: 'Scraped',
  demo_generada: 'Demo Generated',
  mensaje_enviado: 'Message Sent',
  interesado: 'Interested',
  cliente_activo: 'Active Client',
}

const PAGE_SIZE = 20

export default function Leads() {
  const { t, locale } = useI18n()
  const [leads, setLeads] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRubro, setFilterRubro] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterCampania, setFilterCampania] = useState('todas')
  const [filterScore, setFilterScore] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)
  const [lastVisible, setLastVisible] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    scraped: 0,
    demo_generada: 0,
    mensaje_enviado: 0,
    interesado: 0,
    cliente_activo: 0,
  })
  const [viewMode, setViewMode] = useState('table')

  useEffect(() => {
    loadLeads(true)
    loadCampaigns()
  }, [filterRubro, filterEstado, filterCampania])

  const loadCampaigns = async () => {
    try {
      const q = query(collection(db, 'campanias'), orderBy('fecha_inicio', 'desc'))
      const snapshot = await getDocs(q)
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const loadLeads = async (reset = false) => {
    setLoading(true)
    try {
      let q = query(collection(db, 'leads'), orderBy('fecha_creacion', 'desc'))

      if (filterRubro !== 'todos') {
        q = query(q, where('rubro', '==', filterRubro))
      }
      if (filterEstado !== 'todos') {
        q = query(q, where('estado_proceso', '==', filterEstado))
      }
      if (filterCampania !== 'todas') {
        q = query(q, where('id_campania', '==', filterCampania))
      }

      q = query(q, limit(PAGE_SIZE))

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      setLeads(data)
      setLastVisible(snapshot.docs[snapshot.docs.length - 1])
      setHasMore(data.length === PAGE_SIZE)

      const allSnapshot = await getDocs(query(collection(db, 'leads')))
      const statsData = {
        total: allSnapshot.size,
        scraped: 0,
        demo_generada: 0,
        mensaje_enviado: 0,
        interesado: 0,
        cliente_activo: 0,
      }
      allSnapshot.docs.forEach(doc => {
        const estado = doc.data().estado_proceso
        if (statsData[estado] !== undefined) {
          statsData[estado]++
        }
      })
      setStats(statsData)
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = (
        lead.nombre_negocio?.toLowerCase().includes(search) ||
        lead.telefono_whatsapp?.includes(search) ||
        lead.email?.toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }

    if (filterScore !== 'todos') {
      const score = lead.lead_score || 0
      if (filterScore === 'excellent' && score < 80) return false
      if (filterScore === 'good' && (score < 60 || score >= 80)) return false
      if (filterScore === 'regular' && (score < 40 || score >= 60)) return false
      if (filterScore === 'low' && (score < 20 || score >= 40)) return false
      if (filterScore === 'veryLow' && score >= 20) return false
    }

    return true
  })

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        estado_proceso: newStatus,
        fecha_actualizacion: new Date(),
      })
      toast.success(locale === 'es' ? 'Estado actualizado' : 'Status updated')
      setSelectedLead({ ...selectedLead, estado_proceso: newStatus })
      loadLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error(locale === 'es' ? 'Error al actualizar' : 'Error updating')
    }
  }

  const updateLeadTemperature = async (leadId, temp) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        temperatura: temp,
        fecha_actualizacion: new Date(),
      })
      setSelectedLead({ ...selectedLead, temperatura: temp })
      toast.success(locale === 'es' ? 'Temperatura actualizada' : 'Temperature updated')
    } catch (error) {
      console.error('Error updating temperature:', error)
    }
  }

  const updateLeadNotes = async (leadId, notes) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        notas: notes,
        fecha_actualizacion: new Date(),
      })
      setSelectedLead({ ...selectedLead, notas: notes })
      toast.success(locale === 'es' ? 'Nota guardada' : 'Note saved')
    } catch (error) {
      console.error('Error updating notes:', error)
    }
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const nombreIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'))
      const telefonoIdx = headers.findIndex(h => h.includes('telefono') || h.includes('phone') || h.includes('whatsapp'))
      const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('correo'))
      const direccionIdx = headers.findIndex(h => h.includes('direccion') || h.includes('address'))
      const rubroIdx = headers.findIndex(h => h.includes('rubro') || h.includes('niche') || h.includes('category'))

      if (nombreIdx === -1) {
        toast.error(locale === 'es' ? 'El CSV debe tener columna "nombre"' : 'CSV must have "name" column')
        return
      }

      let imported = 0
      const userId = auth.currentUser?.uid

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        if (!cols[nombreIdx]) continue

        await addDoc(collection(db, 'leads'), {
          nombre_negocio: cols[nombreIdx] || '',
          telefono_whatsapp: cols[telefonoIdx] || '',
          email: cols[emailIdx] || '',
          direccion: cols[direccionIdx] || '',
          rubro: cols[rubroIdx] || 'otro',
          estado_proceso: 'scraped',
          id_campania: null,
          fecha_creacion: new Date(),
          user_id: userId,
          source: 'csv_import',
        })
        imported++
      }

      toast.success(
        locale === 'es' ? `${imported} leads importados` : `${imported} leads imported`
      )
      loadLeads()
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error(locale === 'es' ? 'Error al importar' : 'Error importing')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportToCSV = () => {
    const headers = locale === 'es' 
      ? ['Nombre', 'Teléfono', 'Email', 'Rubro', 'Estado', 'Temperatura', 'Notas', 'URL Origen', 'Fecha']
      : ['Name', 'Phone', 'Email', 'Niche', 'Status', 'Temperature', 'Notes', 'Source URL', 'Date']
    const rows = filteredLeads.map(lead => [
      lead.nombre_negocio,
      lead.telefono_whatsapp,
      lead.email,
      lead.rubro,
      lead.estado_proceso,
      lead.temperatura || '',
      lead.notas || '',
      lead.url_origen,
      lead.fecha_creacion?.toDate?.()?.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US'),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const ESTADOS_LABELS = locale === 'es' ? ESTADOS_LABELS_ES : ESTADOS_LABELS_EN

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">{t('leads')}</h1>
          <p className="text-dark-400 mt-1">{t('leadsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary flex items-center gap-2"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {locale === 'es' ? 'Importar CSV' : 'Import CSV'}
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('exportCSV')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('total'), value: stats.total, color: 'text-dark-100' },
          { label: t('scrapedEs'), value: stats.scraped, color: 'text-brand-400' },
          { label: t('demosEs'), value: stats.demo_generada, color: 'text-amber-400' },
          { label: t('sentEs'), value: stats.mensaje_enviado, color: 'text-violet-400' },
          { label: t('clientsEs'), value: stats.cliente_activo, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="card text-center py-3">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-dark-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
              placeholder={t('searchPlaceholder')}
            />
          </div>
          <select
            value={filterRubro}
            onChange={(e) => setFilterRubro(e.target.value)}
            className="select-field w-full md:w-48"
          >
            {RUBROS.map(r => (
              <option key={r.value} value={r.value}>{locale === 'es' ? r.labelEs : r.labelEn}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select-field w-full md:w-48"
          >
            <option value="todos">{t('allStatuses')}</option>
            {Object.entries(ESTADOS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterCampania}
            onChange={(e) => setFilterCampania(e.target.value)}
            className="select-field w-full md:w-48"
          >
            <option value="todas">{locale === 'es' ? 'Todas las campañas' : 'All campaigns'}</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value)}
            className="select-field w-full md:w-48"
          >
            <option value="todos">{locale === 'es' ? 'Todos los scores' : 'All scores'}</option>
            <option value="excellent">{locale === 'es' ? 'Excelente (80+)' : 'Excellent (80+)'}</option>
            <option value="good">{locale === 'es' ? 'Bueno (60-79)' : 'Good (60-79)'}</option>
            <option value="regular">{locale === 'es' ? 'Regular (40-59)' : 'Regular (40-59)'}</option>
            <option value="low">{locale === 'es' ? 'Bajo (20-39)' : 'Low (20-39)'}</option>
            <option value="veryLow">{locale === 'es' ? 'Muy Bajo (<20)' : 'Very Low (<20)'}</option>
          </select>
          <div className="flex border border-dark-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-dark-500 mb-4" />
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              {t('noLeadsFound')}
            </h3>
            <p className="text-dark-400">
              {searchTerm ? t('tryOtherSearch') : t('leadsWillAppear')}
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          <LeadPipeline leads={filteredLeads} onRefresh={() => loadLeads(true)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('business')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('contact')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('niche')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {locale === 'es' ? 'Temp.' : 'Temp.'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {locale === 'es' ? 'Score' : 'Score'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {locale === 'es' ? 'Demo' : 'Demo'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('source')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      {t('date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-dark-700/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-dark-100">
                          {lead.nombre_negocio}
                        </div>
                        {lead.datos_personalizados?.logo && (
                          <img 
                            src={lead.datos_personalizados.logo} 
                            alt="" 
                            className="w-6 h-6 rounded mt-1"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-dark-200">{lead.telefono_whatsapp}</div>
                        <div className="text-xs text-dark-400">{lead.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-dark-300 capitalize">{lead.rubro}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${ESTADOS[lead.estado_proceso]?.class || 'badge-info'}`}>
                          {ESTADOS_LABELS[lead.estado_proceso] || lead.estado_proceso}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          lead.temperatura === 'hot' ? 'bg-red-500/20 text-red-400' :
                          lead.temperatura === 'warm' ? 'bg-amber-500/20 text-amber-400' :
                          lead.temperatura === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-dark-800 text-dark-500'
                        }`}>
                          {lead.temperatura === 'hot' ? '🔥' : lead.temperatura === 'warm' ? '🟡' : lead.temperatura === 'cold' ? '❄️' : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          (lead.lead_score || 0) >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                          (lead.lead_score || 0) >= 60 ? 'bg-brand-500/20 text-brand-400' :
                          (lead.lead_score || 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                          (lead.lead_score || 0) >= 20 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {lead.lead_score || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lead.url_demo ? (
                          <a 
                            href={lead.url_demo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-lg text-xs font-medium hover:bg-brand-500/20 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {locale === 'es' ? 'Ver' : 'View'}
                          </a>
                        ) : lead.estado_proceso === 'scraped' ? (
                          <span className="text-xs text-dark-500">{locale === 'es' ? 'Pendiente' : 'Pending'}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <a 
                          href={lead.url_origen} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-brand-400 hover:text-brand-300 truncate max-w-[100px] block"
                        >
                          {lead.url_origen || 'N/A'}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-sm text-dark-400">
                        {lead.fecha_creacion?.toDate?.()?.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
              <p className="text-sm text-dark-400">
                {t('showing')} {filteredLeads.length} {t('leadsUnit')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!hasMore}
                  className="btn-secondary p-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={!hasMore}
                  className="btn-secondary p-2 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">
                {selectedLead.nombre_negocio}
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-dark-400 hover:text-dark-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Contact Info */}
              <div className="bg-dark-900 rounded-lg p-4 space-y-3">
                {selectedLead.telefono_whatsapp && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-200">{selectedLead.telefono_whatsapp}</span>
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-200">{selectedLead.email}</span>
                  </div>
                )}
                {selectedLead.direccion && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-200">{selectedLead.direccion}</span>
                  </div>
                )}
                {selectedLead.calificacion && (
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-dark-200">{selectedLead.calificacion} ⭐</span>
                  </div>
                )}
                {selectedLead.fecha_creacion && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-200">
                      {selectedLead.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Estado' : 'Status'}
                </label>
                <select
                  value={selectedLead.estado_proceso}
                  onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                  className="select-field"
                >
                  <option value="scraped">{ESTADOS_LABELS_ES.scraped}</option>
                  <option value="demo_generada">{ESTADOS_LABELS_ES.demo_generada}</option>
                  <option value="mensaje_enviado">{ESTADOS_LABELS_ES.mensaje_enviado}</option>
                  <option value="interesado">{ESTADOS_LABELS_ES.interesado}</option>
                  <option value="cliente_activo">{ESTADOS_LABELS_ES.cliente_activo}</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Temperatura' : 'Temperature'}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'hot', emoji: '🔥', label: 'Hot', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                    { value: 'warm', emoji: '🟡', label: 'Warm', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                    { value: 'cold', emoji: '❄️', label: 'Cold', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateLeadTemperature(selectedLead.id, t.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selectedLead.temperatura === t.value
                          ? t.color
                          : 'bg-dark-900 text-dark-400 border-dark-700 hover:border-dark-500'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Engagement Stats */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Calificación del Lead' : 'Lead Score'}
                </label>
                <div className="bg-dark-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-3xl font-bold ${(selectedLead.lead_score || 0) >= 60 ? 'text-emerald-400' : (selectedLead.lead_score || 0) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {selectedLead.lead_score || 0}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedLead.temperatura === 'hot' ? 'bg-red-500/20 text-red-400' :
                      selectedLead.temperatura === 'warm' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {selectedLead.temperatura === 'hot' ? '🔥 Hot' : selectedLead.temperatura === 'warm' ? '🟡 Warm' : '❄️ Cold'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-dark-400">
                    {selectedLead.calificacion && <div>⭐ Rating: {selectedLead.calificacion}</div>}
                    {selectedLead.reviews_count > 0 && <div>📋 Reviews: {selectedLead.reviews_count}</div>}
                    {selectedLead.datos_personalizados?.website && <div>🌐 Tiene website</div>}
                    {selectedLead.email && <div>📧 Tiene email</div>}
                    {selectedLead.direccion && <div>📍 Tiene dirección</div>}
                  </div>
                  {(selectedLead.cta_clicks > 0 || selectedLead.landing_views > 0 || selectedLead.tiempo_total_landing > 0) && (
                    <div className="mt-3 pt-3 border-t border-dark-700">
                      <div className="text-xs font-medium text-dark-400 mb-2">{locale === 'es' ? 'Actividad en Landing' : 'Landing Activity'}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-lg font-bold text-brand-400">{selectedLead.landing_views || 0}</div>
                          <div className="text-xs text-dark-500">{locale === 'es' ? 'Visitas' : 'Views'}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400">{selectedLead.cta_clicks || 0}</div>
                          <div className="text-xs text-dark-500">{locale === 'es' ? 'Clicks' : 'Clicks'}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-400">{selectedLead.tiempo_total_landing || 0}s</div>
                          <div className="text-xs text-dark-500">{locale === 'es' ? 'Tiempo' : 'Time'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Link */}
              {selectedLead.url_demo && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Demo' : 'Demo'}
                  </label>
                  <a
                    href={selectedLead.url_demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-lg text-sm font-medium hover:bg-brand-500/20 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {locale === 'es' ? 'Ver Landing' : 'View Landing'}
                  </a>
                </div>
              )}

              {/* AI Generated Message */}
              {selectedLead.mensaje_personalizado && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Mensaje Personalizado (IA)' : 'Personalized Message (AI)'}
                  </label>
                  <div className="bg-dark-900 rounded-lg p-4 border border-emerald-500/20">
                    <p className="text-sm text-dark-200 whitespace-pre-line leading-relaxed">
                      {selectedLead.mensaje_personalizado}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-dark-500">
                        {locale === 'es' ? 'Generado:' : 'Generated:'} {selectedLead.fecha_generacion_mensaje?.toDate?.()?.toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp - Quick Send */}
              {selectedLead.telefono_whatsapp && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    WhatsApp
                  </label>
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${selectedLead.telefono_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selectedLead.nombre_negocio}, mirá tu demo: ${selectedLead.url_demo || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {locale === 'es' ? 'Enviar WhatsApp' : 'Send WhatsApp'}
                    </a>
                  </div>
                </div>
              )}

              {/* Email - Quick Send */}
              {selectedLead.email && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await fetch(
                            `https://us-central1-revendr-9add8.cloudfunctions.net/api/leads/${selectedLead.id}/send-email`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ messageType: 'initial' }),
                            }
                          )
                          toast.success(locale === 'es' ? 'Email enviado' : 'Email sent')
                        } catch (error) {
                          toast.error(locale === 'es' ? 'Error' : 'Error')
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-lg text-sm font-medium hover:bg-brand-500/20 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      {locale === 'es' ? 'Enviar Email' : 'Send Email'}
                    </button>
                  </div>
                  {selectedLead.ultimo_email_enviado && (
                    <p className="text-xs text-dark-500 mt-1">
                      {locale === 'es' ? 'Último email:' : 'Last email:'} {selectedLead.ultimo_email_enviado}
                      {selectedLead.fecha_ultimo_email?.toDate?.()?.toLocaleDateString('es-AR') && 
                        ` (${selectedLead.fecha_ultimo_email.toDate().toLocaleDateString('es-AR')})`
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Message Engagement */}
              {(selectedLead.mensajes_entregados > 0 || selectedLead.mensajes_leidos > 0 || selectedLead.mensajes_clickeados > 0) && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Engagement de Mensajes' : 'Message Engagement'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-dark-900 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-emerald-400">{selectedLead.mensajes_entregados || 0}</div>
                      <div className="text-xs text-dark-500">{locale === 'es' ? 'Entregados' : 'Delivered'}</div>
                    </div>
                    <div className="bg-dark-900 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-brand-400">{selectedLead.mensajes_leidos || 0}</div>
                      <div className="text-xs text-dark-500">{locale === 'es' ? 'Leídos' : 'Read'}</div>
                    </div>
                    <div className="bg-dark-900 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-amber-400">{selectedLead.mensajes_clickeados || 0}</div>
                      <div className="text-xs text-dark-500">{locale === 'es' ? 'Clicks' : 'Clicks'}</div>
                    </div>
                  </div>
                  {selectedLead.engagement_score > 0 && (
                    <div className="mt-2 text-center">
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        selectedLead.engagement_score >= 5 ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedLead.engagement_score >= 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-dark-800 text-dark-500'
                      }`}>
                        Engagement: {selectedLead.engagement_score}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes - Editable */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Notas' : 'Notes'}
                </label>
                <textarea
                  value={selectedLead.notas || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, notas: e.target.value })}
                  onBlur={(e) => updateLeadNotes(selectedLead.id, e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder={locale === 'es' ? 'Ej: Interesado en descuento 20%...' : 'E.g.: Interested in 20% discount...'}
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es' ? 'Se guarda automáticamente al salir del campo' : 'Auto-saves on blur'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
