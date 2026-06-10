import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import {
  BarChart3,
  TrendingUp,
  Users,
  Megaphone,
  Eye,
  MessageCircle,
  DollarSign,
  Loader2,
  Zap,
} from 'lucide-react'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-50">
          {locale === 'es' ? 'Mi Dashboard' : 'My Dashboard'}
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 rounded-full">
          <Zap className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-400 capitalize">{data?.plan || 'starter'}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: locale === 'es' ? 'Campañas' : 'Campaigns', value: d.totalCampaigns || 0, icon: Megaphone, color: 'text-brand-400' },
          { label: locale === 'es' ? 'Leads' : 'Leads', value: d.totalLeads || 0, icon: Users, color: 'text-blue-400' },
          { label: locale === 'es' ? 'Demos' : 'Demos', value: d.totalDemos || 0, icon: Eye, color: 'text-violet-400' },
          { label: locale === 'es' ? 'Mensajes' : 'Messages', value: d.messagesSent || 0, icon: MessageCircle, color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-dark-100">{item.value}</div>
                <div className="text-xs text-dark-400">{item.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage vs Limits */}
      <div className="card">
        <h2 className="text-sm font-medium text-dark-300 mb-4">
          {locale === 'es' ? 'Uso del Plan' : 'Plan Usage'}
        </h2>
        <div className="space-y-4">
          {[
            { key: 'leads', label: locale === 'es' ? 'Leads Procesados' : 'Leads Processed', used: usage.leads || 0, limit: limits.leads },
            { key: 'demos', label: locale === 'es' ? 'Demos Generadas' : 'Demos Generated', used: usage.demos || 0, limit: limits.demos },
            { key: 'messages', label: locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent', used: usage.messages || 0, limit: limits.messages },
          ].map(item => {
            const pct = calcPct(item.used, item.limit)
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-dark-200">{item.label}</span>
                  <span className="text-dark-400">
                    {item.used} / {item.limit === -1 ? '∞' : item.limit}
                    {item.limit !== -1 && ` (${pct}%)`}
                  </span>
                </div>
                {item.limit !== -1 && (
                  <div className="w-full bg-dark-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="card">
        <h2 className="text-sm font-medium text-dark-300 mb-4">
          {locale === 'es' ? 'Embudo de Conversión' : 'Conversion Funnel'}
        </h2>
        <div className="space-y-3">
          {[
            { label: locale === 'es' ? 'Leads Totales' : 'Total Leads', value: d.totalLeads || 0, color: 'bg-blue-500' },
            { label: locale === 'es' ? 'Calificados' : 'Qualified', value: d.qualifiedLeads || 0, color: 'bg-violet-500' },
            { label: locale === 'es' ? 'Demos Generadas' : 'Demos Generated', value: d.totalDemos || 0, color: 'bg-amber-500' },
            { label: locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent', value: d.messagesSent || 0, color: 'bg-emerald-500' },
          ].map((step, i) => {
            const maxVal = Math.max(d.totalLeads || 1, d.qualifiedLeads || 1, d.totalDemos || 1, d.messagesSent || 1)
            const pct = (step.value / maxVal) * 100
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-dark-300">{step.label}</span>
                  <span className="text-dark-200 font-medium">{step.value}</span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-2">
                  <div className={`${step.color} h-2 rounded-full transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
