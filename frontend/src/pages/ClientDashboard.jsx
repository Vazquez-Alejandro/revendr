import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import {
  BarChart3, TrendingUp, Users, Megaphone, Eye, MessageCircle,
  DollarSign, Loader2, Zap, Target, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-850 border border-dark-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-dark-200 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/client/dashboard/${user.uid}`
      ).then(r => r.json())
      if (result.success) setData(result.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  const d = data?.stats || {}
  const usage = data?.usage || {}
  const limits = data?.limits || {}

  const calcPct = (used, limit) => limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const t = (es, en) => locale === 'es' ? es : en

  const conversionData = [
    { name: t('Leads', 'Leads'), value: d.totalLeads || 0, fill: '#0ea5e9' },
    { name: t('Calificados', 'Qualified'), value: d.qualifiedLeads || 0, fill: '#8b5cf6' },
    { name: t('Propuestas', 'Proposals'), value: d.totalPropuestas || 0, fill: '#f59e0b' },
    { name: t('Mensajes', 'Messages'), value: d.messagesSent || 0, fill: '#22c55e' },
  ]

  const funnelData = [
    { stage: t('Leads', 'Leads'), total: d.totalLeads || 0, converted: d.qualifiedLeads || 0 },
    { stage: t('Calificados', 'Qualified'), total: d.qualifiedLeads || 0, converted: d.totalPropuestas || 0 },
    { stage: t('Propuestas', 'Proposals'), total: d.totalPropuestas || 0, converted: d.messagesSent || 0 },
    { stage: t('Mensajes', 'Messages'), total: d.messagesSent || 0, converted: 0 },
  ].filter(s => s.total > 0)

  const planUsageData = [
    { name: t('Leads', 'Leads'), usado: usage.leads || 0, limite: limits.leads === -1 ? 999999 : limits.leads },
    { name: t('Propuestas', 'Proposals'), usado: usage.propuestas || 0, limite: limits.propuestas === -1 ? 999999 : limits.propuestas },
    { name: t('Mensajes', 'Messages'), usado: usage.messages || 0, limite: limits.messages === -1 ? 999999 : limits.messages },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-50">
          {t('Mi Dashboard', 'My Dashboard')}
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 rounded-full">
          <Zap className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-400 capitalize">{data?.plan || 'starter'}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Campañas', 'Campaigns'), value: d.totalCampaigns || 0, sub: `${d.activeCampaigns || 0} ${t('activas', 'active')}`, icon: Megaphone, color: 'text-brand-400' },
          { label: t('Leads', 'Leads'), value: d.totalLeads || 0, sub: `${d.qualifiedLeads || 0} ${t('calificados', 'qualified')}`, icon: Users, color: 'text-blue-400' },
          { label: t('Propuestas', 'Proposals'), value: d.totalPropuestas || 0, icon: Eye, color: 'text-violet-400' },
          { label: t('Mensajes', 'Messages'), value: d.messagesSent || 0, icon: MessageCircle, color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-dark-100">{item.value.toLocaleString()}</div>
                <div className="text-xs text-dark-400">{item.label}</div>
                {item.sub && <div className="text-xs text-dark-500">{item.sub}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue KPI */}
      {(d.totalRevenue || 0) > 0 && (
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-400">${(d.totalRevenue || 0).toLocaleString()}</div>
              <div className="text-xs text-dark-400">{t('Ingresos Totales', 'Total Revenue')}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-dark-500">
            {t('Tasa de conversión', 'Conversion Rate')}: {d.conversionRate || 0}%
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel AreaChart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-400" />
            <h2 className="text-sm font-medium text-dark-300">{t('Embudo de Conversión', 'Conversion Funnel')}</h2>
          </div>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={funnelData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="funnelConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#funnelTotal)" name={t('Totales', 'Total')} />
                <Area type="monotone" dataKey="converted" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#funnelConverted)" name={t('Convertidos', 'Converted')} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-dark-500">
              {t('Sin datos para mostrar', 'No data to show')}
            </div>
          )}
        </div>

        {/* Lead Distribution PieChart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-violet-400" />
            <h2 className="text-sm font-medium text-dark-300">{t('Distribución de Leads', 'Lead Distribution')}</h2>
          </div>
          {d.totalLeads > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={conversionData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {conversionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-dark-500">
              {t('Sin datos', 'No data')}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {conversionData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-dark-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                {entry.name}: {entry.value.toLocaleString()}
              </div>
            ))}
          </div>
        </div>

        {/* Plan Usage BarChart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-medium text-dark-300">{t('Uso del Plan', 'Plan Usage')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={planUsageData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="usado" fill="#0ea5e9" radius={[4, 4, 0, 0]} name={t('Usado', 'Used')} />
              <Bar dataKey="limite" fill="#334155" radius={[4, 4, 0, 0]} name={t('Límite', 'Limit')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Usage Progress Bars */}
      <div className="card">
        <h2 className="text-sm font-medium text-dark-300 mb-4">
          {t('Progreso del Plan', 'Plan Progress')}
        </h2>
        <div className="space-y-4">
          {[
            { key: 'leads', label: t('Leads Procesados', 'Leads Processed'), used: usage.leads || 0, limit: limits.leads },
            { key: 'propuestas', label: t('Propuestas Generadas', 'Proposals Generated'), used: usage.propuestas || 0, limit: limits.propuestas },
            { key: 'messages', label: t('Mensajes Enviados', 'Messages Sent'), used: usage.messages || 0, limit: limits.messages },
          ].map(item => {
            const pct = calcPct(item.used, item.limit)
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-dark-200">{item.label}</span>
                  <span className="text-dark-400">{item.used.toLocaleString()} / {item.limit === -1 ? '∞' : item.limit.toLocaleString()}{item.limit !== -1 && ` (${pct}%)`}</span>
                </div>
                {item.limit !== -1 && (
                  <div className="w-full bg-dark-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
