import { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { 
  Users, 
  Filter, 
  Download, 
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const RUBROS = [
  { value: 'todos', label: 'Todos los Rubros' },
  { value: 'inmobiliaria', label: 'Inmobiliarias' },
  { value: 'estetica', label: 'Estética / Peluquería' },
  { value: 'clinica', label: 'Clínicas Médicas' },
  { value: 'restaurante', label: 'Restaurantes' },
  { value: 'gimnasio', label: 'Gimnasios' },
]

const ESTADOS = {
  scraped: { label: 'Scrapeado', class: 'badge-info' },
  demo_generada: { label: 'Demo Generada', class: 'badge-warning' },
  mensaje_enviado: { label: 'Mensaje Enviado', class: 'badge-info' },
  interesado: { label: 'Interesado', class: 'badge-success' },
  cliente_activo: { label: 'Cliente Activo', class: 'badge-success' },
}

const PAGE_SIZE = 20

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRubro, setFilterRubro] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
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

  useEffect(() => {
    loadLeads(true)
  }, [filterRubro, filterEstado])

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
      return (
        lead.nombre_negocio?.toLowerCase().includes(search) ||
        lead.telefono_whatsapp?.includes(search) ||
        lead.email?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const exportToCSV = () => {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Rubro', 'Estado', 'URL Origen', 'Fecha']
    const rows = filteredLeads.map(lead => [
      lead.nombre_negocio,
      lead.telefono_whatsapp,
      lead.email,
      lead.rubro,
      lead.estado_proceso,
      lead.url_origen,
      lead.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR'),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Leads</h1>
          <p className="text-dark-400 mt-1">Gestiona y filtra todos tus leads</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-dark-100' },
          { label: 'Scrapeados', value: stats.scraped, color: 'text-brand-400' },
          { label: 'Demos', value: stats.demo_generada, color: 'text-amber-400' },
          { label: 'Enviados', value: stats.mensaje_enviado, color: 'text-violet-400' },
          { label: 'Clientes', value: stats.cliente_activo, color: 'text-emerald-400' },
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
              placeholder="Buscar por nombre, teléfono o email..."
            />
          </div>
          <select
            value={filterRubro}
            onChange={(e) => setFilterRubro(e.target.value)}
            className="select-field w-full md:w-48"
          >
            {RUBROS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select-field w-full md:w-48"
          >
            <option value="todos">Todos los Estados</option>
            {Object.entries(ESTADOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-dark-500 mb-4" />
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              No se encontraron leads
            </h3>
            <p className="text-dark-400">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Los leads aparecerán aquí cuando crees campañas'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Negocio
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Rubro
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Fuente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-dark-700/50 transition-colors">
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
                          {ESTADOS[lead.estado_proceso]?.label || lead.estado_proceso}
                        </span>
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
                        {lead.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
              <p className="text-sm text-dark-400">
                Mostrando {filteredLeads.length} leads
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
    </div>
  )
}
