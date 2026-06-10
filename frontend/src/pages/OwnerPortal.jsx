import { useState, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  MessageCircle,
  Loader2,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export default function OwnerPortal() {
  const { locale } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/owner/dashboard/revendr'
      ).then(r => r.json())
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading owner stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  const data = stats || {
    totalCampaigns: 0,
    totalLeads: 0,
    qualifiedLeads: 0,
    totalMessages: 0,
    landingViews: 0,
    ctaClicks: 0,
    conversionRate: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-brand-400" />
          {locale === 'es' ? 'Portal del Propietario' : 'Owner Portal'}
        </h1>
        <p className="text-dark-400 mt-1">
          {locale === 'es' ? 'Métricas completas de tu producto' : 'Complete product metrics'}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={locale === 'es' ? 'Campañas' : 'Campaigns'}
          value={data.totalCampaigns}
          icon={BarChart3}
          color="text-brand-400"
        />
        <StatCard
          label={locale === 'es' ? 'Leads Totales' : 'Total Leads'}
          value={data.totalLeads}
          icon={Users}
          color="text-blue-400"
        />
        <StatCard
          label={locale === 'es' ? 'Leads Calificados' : 'Qualified Leads'}
          value={data.qualifiedLeads}
          icon={TrendingUp}
          color="text-emerald-400"
        />
        <StatCard
          label={locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent'}
          value={data.totalMessages}
          icon={MessageCircle}
          color="text-violet-400"
        />
        <StatCard
          label={locale === 'es' ? 'Visitas Landing' : 'Landing Views'}
          value={data.landingViews}
          icon={Eye}
          color="text-amber-400"
        />
        <StatCard
          label={locale === 'es' ? 'Clics CTA' : 'CTA Clicks'}
          value={data.ctaClicks}
          icon={MousePointerClick}
          color="text-rose-400"
        />
        <StatCard
          label={locale === 'es' ? 'Tasa Conversión' : 'Conversion Rate'}
          value={`${(data.conversionRate || 0).toFixed(1)}%`}
          icon={data.conversionRate > 5 ? ArrowUpRight : ArrowDownRight}
          color={data.conversionRate > 5 ? 'text-emerald-400' : 'text-dark-400'}
        />
        <StatCard
          label={locale === 'es' ? 'Leads Calificados %' : 'Qualified %'}
          value={data.totalLeads > 0 ? `${((data.qualifiedLeads / data.totalLeads) * 100).toFixed(1)}%` : '0%'}
          icon={TrendingUp}
          color="text-cyan-400"
        />
      </div>

      {/* Funnel */}
      <div className="card">
        <h3 className="text-sm font-medium text-dark-300 mb-4">
          {locale === 'es' ? 'Embudo de Conversión' : 'Conversion Funnel'}
        </h3>
        <div className="space-y-3">
          {[
            { label: locale === 'es' ? 'Leads Totales' : 'Total Leads', value: data.totalLeads, color: 'bg-blue-500' },
            { label: locale === 'es' ? 'Leads Calificados' : 'Qualified Leads', value: data.qualifiedLeads, color: 'bg-violet-500' },
            { label: locale === 'es' ? 'Mensajes Enviados' : 'Messages Sent', value: data.totalMessages, color: 'bg-amber-500' },
            { label: locale === 'es' ? 'Visitas Landing' : 'Landing Views', value: data.landingViews, color: 'bg-emerald-500' },
            { label: locale === 'es' ? 'Clics CTA' : 'CTA Clicks', value: data.ctaClicks, color: 'bg-rose-500' },
          ].map((step, i) => {
            const maxVal = Math.max(...[data.totalLeads, data.qualifiedLeads, data.totalMessages, data.landingViews, data.ctaClicks], 1)
            const pct = (step.value / maxVal) * 100
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-dark-300">{step.label}</span>
                  <span className="text-dark-200 font-medium">{step.value}</span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-2">
                  <div
                    className={`${step.color} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <div className="text-lg font-semibold text-dark-100">{value}</div>
          <div className="text-xs text-dark-400">{label}</div>
        </div>
      </div>
    </div>
  )
}
