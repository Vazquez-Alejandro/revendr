import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, MessageCircle, Eye, MousePointer, Loader2 } from 'lucide-react'
import { auth } from '../config/firebase'

const API = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function CampaignMetrics({ campaignId = null }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [campaignId])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const url = campaignId
        ? `${API}/whatsapp/campaigns/${campaignId}/metrics`
        : `${API}/whatsapp/campaigns/metrics`
      const res = await fetch(url, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setMetrics(data.data)
    } catch (e) {
      console.error('Error loading metrics:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-dark-500 text-sm">
        No hay métricas disponibles
      </div>
    )
  }

  const data = campaignId ? metrics : metrics
  const m = campaignId ? data.metrics : null
  const r = campaignId ? data.rates : null

  if (campaignId) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-dark-300">{data.campaign?.name || 'Campaña'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Users} label="Leads" value={m.totalLeads} color="brand" />
          <StatCard icon={MessageCircle} label="Enviados" value={m.sent} color="emerald" />
          <StatCard icon={Eye} label="Visitas" value={m.landingViews} color="sky" />
          <StatCard icon={MousePointer} label="Clics" value={m.ctaClicks} color="amber" />
          <StatCard icon={TrendingUp} label="Engaged" value={m.engaged} color="violet" />
          <StatCard icon={BarChart3} label="Convertidos" value={m.converted} color="emerald" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <RateCard label="Tasa vista" value={`${r.viewRate}%`} />
          <RateCard label="Tasa clics" value={`${r.clickRate}%`} />
          <RateCard label="Tasa engagement" value={`${r.engagementRate}%`} />
          <RateCard label="Tasa conversión" value={`${r.conversionRate}%`} />
          <RateCard label="Tasa respuesta" value={`${r.responseRate}%`} />
          <RateCard label="Tasa entrega" value={`${r.deliveryRate}%`} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-4">No hay campañas con métricas</p>
      ) : (
        data.map((campaign) => (
          <div key={campaign.campaign.id} className="card p-4">
            <h4 className="text-sm font-medium text-dark-200 mb-3">{campaign.campaign.name}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-dark-100">{campaign.metrics.totalLeads}</div>
                <div className="text-xs text-dark-500">Leads</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">{campaign.rates.viewRate}%</div>
                <div className="text-xs text-dark-500">Visitas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-sky-400">{campaign.rates.conversionRate}%</div>
                <div className="text-xs text-dark-500">Conversión</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    brand: 'bg-brand-500/10 text-brand-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    sky: 'bg-sky-500/10 text-sky-400',
    amber: 'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
  }

  return (
    <div className="bg-dark-900 rounded-lg p-3 text-center">
      <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-lg font-bold text-dark-100">{value}</div>
      <div className="text-xs text-dark-500">{label}</div>
    </div>
  )
}

function RateCard({ label, value }) {
  return (
    <div className="bg-dark-900 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-dark-100">{value}</div>
      <div className="text-xs text-dark-500">{label}</div>
    </div>
  )
}
