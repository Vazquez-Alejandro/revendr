import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db, auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { 
  Megaphone, 
  Users, 
  TrendingUp, 
  MessageCircle,
  Package,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    leadsHoy: 0,
    conversionRate: 0,
    demosGeneradas: 0,
    totalProducts: 0,
    mensajesEnviados: 0,
  })
  const [recentLeads, setRecentLeads] = useState([])
  const [chartData, setChartData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [rubroData, setRubroData] = useState([])
  const [productStats, setProductStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const userId = auth.currentUser?.uid
      const campaignsRef = query(collection(db, 'campanias'), where('user_id', '==', userId || ''))
      const campaignsSnapshot = await getDocs(campaignsRef)

      const leadsRef = collection(db, 'leads')
      const leadsQuery = query(leadsRef, where('user_id', '==', userId || ''), orderBy('fecha_creacion', 'desc'), limit(5))
      const leadsSnapshot = await getDocs(leadsQuery)

      const allLeadsSnapshot = await getDocs(query(leadsRef, where('user_id', '==', userId || '')))

      let activeCampaigns = 0
      let leadsHoy = 0
      let demosGeneradas = 0
      let clientesActivos = 0
      let mensajesEnviados = 0
      const today = new Date().toDateString()
      
      const leadsByDate = {}
      const leadsByStatus = {}
      const leadsByRubro = {}

      campaignsSnapshot.docs.forEach(doc => {
        const c = doc.data()
        if (c.estado === 'activa') activeCampaigns++
        mensajesEnviados += c.mensajes_enviados || 0
      })

      allLeadsSnapshot.docs.forEach(doc => {
        const lead = doc.data()
        if (lead.fecha_creacion?.toDate?.()?.toDateString() === today) leadsHoy++
        if (lead.estado_proceso === 'demo_generada') demosGeneradas++
        if (lead.estado_proceso === 'cliente_activo') clientesActivos++

        const date = lead.fecha_creacion?.toDate?.()
        if (date) {
          const dateKey = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
          leadsByDate[dateKey] = (leadsByDate[dateKey] || 0) + 1
        }

        leadsByStatus[lead.estado_proceso] = (leadsByStatus[lead.estado_proceso] || 0) + 1
        leadsByRubro[lead.rubro] = (leadsByRubro[lead.rubro] || 0) + 1
      })

      let totalProducts = 0
      if (userId) {
        const productsQuery = query(collection(db, 'productos'), where('user_id', '==', userId))
        const productsSnapshot = await getDocs(productsQuery)
        totalProducts = productsSnapshot.size
      }

      // Load product stats
      try {
        const productStatsRes = await fetch(
          'https://us-central1-revendr-9add8.cloudfunctions.net/api/stats/products'
        ).then(r => r.json())
        if (productStatsRes.success) {
          setProductStats(productStatsRes.data)
        }
      } catch (err) {
        console.error('Error loading product stats:', err)
      }

      const chartDataArr = Object.entries(leadsByDate)
        .slice(-7)
        .map(([date, count]) => ({ date, leads: count }))

      const statusDataArr = Object.entries(leadsByStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }))

      const rubroDataArr = Object.entries(leadsByRubro).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))

      const leadsData = []
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
        totalProducts,
        mensajesEnviados,
      })

      setRecentLeads(leadsData)
      setChartData(chartDataArr)
      setStatusData(statusDataArr)
      setRubroData(rubroDataArr)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: locale === 'es' ? 'Productos' : 'Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'violet',
      change: locale === 'es' ? 'registrados' : 'registered',
      positive: true,
    },
    {
      title: t('activeCampaigns'),
      value: stats.activeCampaigns,
      total: stats.totalCampaigns,
      icon: Megaphone,
      color: 'brand',
      change: locale === 'es' ? 'activas' : 'active',
      positive: true,
    },
    {
      title: t('totalLeads'),
      value: stats.totalLeads,
      icon: Users,
      color: 'emerald',
      change: `+${stats.leadsHoy} ${locale === 'es' ? 'hoy' : 'today'}`,
      positive: true,
    },
    {
      title: locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent',
      value: stats.mensajesEnviados,
      icon: MessageCircle,
      color: 'amber',
      change: `${stats.demosGeneradas} ${locale === 'es' ? 'demos' : 'demos'}`,
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
    const labelsEs = {
      scraped: 'Scrapeado',
      demo_generada: 'Demo Generada',
      mensaje_enviado: 'Mensaje Enviado',
      interesado: 'Interesado',
      cliente_activo: 'Cliente Activo',
    }
    const labelsEn = {
      scraped: 'Scraped',
      demo_generada: 'Demo Generated',
      mensaje_enviado: 'Message Sent',
      interesado: 'Interested',
      cliente_activo: 'Active Client',
    }
    const labels = locale === 'es' ? labelsEs : labelsEn
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-3 shadow-lg">
          <p className="text-dark-300 text-sm">{label}</p>
          <p className="text-brand-400 font-bold">{payload[0].value} leads</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-400">{locale === 'es' ? 'Cargando datos del dashboard...' : 'Loading dashboard...'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">{t('dashboard')}</h1>
        <p className="text-dark-400 mt-1">{locale === 'es' ? 'Vista general de tu plataforma SaaS' : 'Overview of your SaaS platform'}</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('leadsPerDay')}</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-500">
              {locale === 'es' ? 'Sin datos para mostrar' : 'No data to show'}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('leadsByStatus')}</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-500">
              {locale === 'es' ? 'Sin datos para mostrar' : 'No data to show'}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs text-dark-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('leadsByNiche')}</h2>
          {rubroData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rubroData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-dark-500">
              {locale === 'es' ? 'Sin datos para mostrar' : 'No data to show'}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">{t('recentLeads')}</h2>
            <a href="/dashboard/leads" className="text-brand-400 hover:text-brand-300 text-sm font-medium">
              {t('viewAll')}
            </a>
          </div>
          <div className="space-y-3">
            {recentLeads.length === 0 ? (
              <div className="py-8 text-center text-dark-400">
                {t('noLeadsYet')}
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-dark-100">{lead.nombre_negocio}</div>
                    <div className="text-xs text-dark-400">{lead.rubro}</div>
                  </div>
                  {getStatusBadge(lead.estado_proceso)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Product Stats */}
      {Object.keys(productStats).length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">
            {locale === 'es' ? 'Rendimiento por Producto' : 'Performance by Product'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Producto' : 'Product'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Campañas' : 'Campaigns'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Leads' : 'Leads'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Calificados' : 'Qualified'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Mensajes' : 'Messages'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Clientes' : 'Clients'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 uppercase">
                    {locale === 'es' ? 'Ingresos' : 'Revenue'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {Object.entries(productStats).map(([id, stats]) => (
                  <tr key={id} className="hover:bg-dark-700/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-dark-100">{stats.nombre}</div>
                      <div className="text-xs text-dark-400">{stats.nicho}</div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-dark-200">{stats.totalCampaigns}</td>
                    <td className="py-3 px-4 text-center text-sm text-dark-200">{stats.totalLeads}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-medium ${
                        stats.qualifiedLeads > 0 ? 'text-emerald-400' : 'text-dark-400'
                      }`}>
                        {stats.qualifiedLeads}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-dark-200">{stats.messagesSent}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-medium ${
                        stats.clients > 0 ? 'text-emerald-400' : 'text-dark-400'
                      }`}>
                        {stats.clients}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-medium ${
                        stats.totalRevenue > 0 ? 'text-emerald-400' : 'text-dark-400'
                      }`}>
                        ${stats.totalRevenue || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
