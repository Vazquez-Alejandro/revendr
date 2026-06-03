import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../config/firebase'
import { 
  Megaphone, 
  Users, 
  TrendingUp, 
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    leadsHoy: 0,
    conversionRate: 0,
    demosGeneradas: 0,
  })
  const [recentLeads, setRecentLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const campaignsRef = collection(db, 'campanias')
      const campaignsSnapshot = await getDocs(campaignsRef)
      
      const leadsRef = collection(db, 'leads')
      const leadsQuery = query(leadsRef, orderBy('fecha_creacion', 'desc'), limit(5))
      const leadsSnapshot = await getDocs(leadsQuery)

      const allLeadsSnapshot = await getDocs(leadsRef)

      let activeCampaigns = 0
      let leadsHoy = 0
      let demosGeneradas = 0
      let clientesActivos = 0
      const today = new Date().toDateString()

      campaignsSnapshot.docs.forEach(doc => {
        if (doc.data().estado === 'activa') activeCampaigns++
      })

      const leadsData = []
      allLeadsSnapshot.docs.forEach(doc => {
        const lead = doc.data()
        if (lead.fecha_creacion?.toDate?.()?.toDateString() === today) leadsHoy++
        if (lead.estado_proceso === 'demo_generada') demosGeneradas++
        if (lead.estado_proceso === 'cliente_activo') clientesActivos++
      })

      leadsSnapshot.docs.forEach(doc => {
        leadsData.push({ id: doc.id, ...doc.data() })
      })

      setStats({
        totalCampaigns: campaignsSnapshot.size,
        activeCampaigns,
        totalLeads: allLeadsSnapshot.size,
        leadsHoy,
        conversionRate: allLeadsSnapshot.size > 0 
          ? ((clientesActivos / allLeadsSnapshot.size) * 100).toFixed(1)
          : 0,
        demosGeneradas,
      })

      setRecentLeads(leadsData)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Campañas Activas',
      value: stats.activeCampaigns,
      total: stats.totalCampaigns,
      icon: Megaphone,
      color: 'brand',
      change: '+2 esta semana',
      positive: true,
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'emerald',
      change: `+${stats.leadsHoy} hoy`,
      positive: true,
    },
    {
      title: 'Demos Generadas',
      value: stats.demosGeneradas,
      icon: TrendingUp,
      color: 'violet',
      change: '+12%',
      positive: true,
    },
    {
      title: 'Tasa Conversión',
      value: `${stats.conversionRate}%`,
      icon: MessageCircle,
      color: 'amber',
      change: '+2.3%',
      positive: true,
    },
  ]

  const colorClasses = {
    brand: 'bg-brand-500/10 text-brand-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
  }

  const getStatusBadge = (status) => {
    const badges = {
      scraped: 'badge-info',
      demo_generada: 'badge-warning',
      mensaje_enviado: 'badge-info',
      interesado: 'badge-success',
      cliente_activo: 'badge-success',
    }
    const labels = {
      scraped: 'Scrapeado',
      demo_generada: 'Demo Generada',
      mensaje_enviado: 'Mensaje Enviado',
      interesado: 'Interesado',
      cliente_activo: 'Cliente Activo',
    }
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-400">Cargando datos del dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Dashboard</h1>
        <p className="text-dark-400 mt-1">Vista general de tu plataforma SaaS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-lg ${colorClasses[stat.color]} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change && (
                <span className={`stat-change ${stat.positive ? 'stat-change-positive' : 'stat-change-negative'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.title}</div>
            </div>
            {stat.total !== undefined && (
              <div className="text-xs text-dark-500 mt-1">
                Total: {stat.total}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">Leads Recientes</h2>
            <a href="/dashboard/leads" className="text-brand-400 hover:text-brand-300 text-sm font-medium">
              Ver todos →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Rubro
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-dark-400">
                      No hay leads aún. Crea una campaña para empezar.
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-dark-100">
                          {lead.nombre_negocio}
                        </div>
                        <div className="text-xs text-dark-400">{lead.telefono_whatsapp}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-dark-300 capitalize">{lead.rubro}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(lead.estado_proceso)}
                      </td>
                      <td className="py-3 px-4 text-sm text-dark-400">
                        {lead.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR') || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Pipeline por Rubro</h2>
          <div className="space-y-4">
            {[
              { name: 'Inmobiliarias', count: 45, color: 'bg-brand-500' },
              { name: 'Estética/Peluquería', count: 32, color: 'bg-violet-500' },
              { name: 'Clínicas Médicas', count: 28, color: 'bg-emerald-500' },
              { name: 'Restaurantes', count: 15, color: 'bg-amber-500' },
            ].map((niche) => (
              <div key={niche.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-300">{niche.name}</span>
                  <span className="text-sm font-medium text-dark-200">{niche.count}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${niche.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(niche.count / 45) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
