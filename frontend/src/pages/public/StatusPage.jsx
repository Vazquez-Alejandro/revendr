import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  ArrowLeft,
  Check,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react'

const STATUS_LABELS = {
  operational: { label: 'Operativo', color: 'text-emerald-400', bg: 'bg-emerald-500', icon: Check },
  degraded: { label: 'Degradado', color: 'text-amber-400', bg: 'bg-amber-500', icon: AlertTriangle },
  major_outage: { label: 'Caído', color: 'text-red-400', bg: 'bg-red-500', icon: XCircle },
}

export default function StatusPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/status'
      ).then(r => r.json())
      setStatus(result)
    } catch (e) {
      setStatus({ status: 'major_outage', checks: {} })
    } finally {
      setLoading(false)
    }
  }

  const overallStatus = STATUS_LABELS[status?.status] || STATUS_LABELS.operational
  const OverallIcon = overallStatus.icon

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
        ) : (
          <>
            {/* Overall Status */}
            <div className="text-center mb-12">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${overallStatus.bg}/10 flex items-center justify-center`}>
                <OverallIcon className={`w-8 h-8 ${overallStatus.color}`} />
              </div>
              <h1 className="text-3xl font-bold text-dark-50 mb-2">
                {status?.status === 'operational' ? 'Todos los sistemas operativos' :
                 status?.status === 'degraded' ? 'Algunos sistemas con problemas' :
                 'Problemas detectados'}
              </h1>
              <p className="text-dark-400">
                Última actualización: {new Date(status?.updated).toLocaleString('es-AR')}
              </p>
            </div>

            {/* Services */}
            <div className="space-y-3">
              {status?.checks && Object.entries(status.checks).map(([service, check]) => {
                const serviceStatus = STATUS_LABELS[check.status] || STATUS_LABELS.operational
                const ServiceIcon = serviceStatus.icon
                const serviceNames = {
                  api: 'API Principal',
                  database: 'Base de Datos',
                  scraping: 'Scraping (Apify)',
                  whatsapp: 'WhatsApp API',
                  email: 'Email (Resend)',
                  stripe: 'Pagos (Stripe)',
                }
                return (
                  <div key={service} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ServiceIcon className={`w-5 h-5 ${serviceStatus.color}`} />
                      <span className="text-dark-100 font-medium">{serviceNames[service] || service}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {check.latency > 0 && (
                        <span className="text-xs text-dark-500">{check.latency}ms</span>
                      )}
                      <span className={`text-sm ${serviceStatus.color}`}>{serviceStatus.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="text-center mt-12">
              <p className="text-dark-500 text-sm">
                ¿Problemas? Contactá soporte:{' '}
                <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">hola@revendr.app</a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
