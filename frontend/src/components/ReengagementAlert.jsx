import { useState, useEffect } from 'react'
import { Bell, X, ArrowRight } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { api } from '../services/api'

export default function ReengagementAlert() {
  const [alerts, setAlerts] = useState([])
  const [dismissed, setDismissed] = useState([])
  const { locale } = useI18n()

  useEffect(() => {
    checkReengaged()
    const interval = setInterval(checkReengaged, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const checkReengaged = async () => {
    try {
      const data = await api.request('/whatsapp/reengaged')
      if (data.success && data.data.length > 0) {
        setAlerts(data.data)
      }
    } catch (e) {
      console.error('Error checking re-engaged:', e)
    }
  }

  const visible = alerts.filter(a => !dismissed.includes(a.id))

  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map(alert => (
        <div key={alert.id} className="card p-3 bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-dark-200">
              <strong>{alert.nombre_negocio}</strong>{' '}
              {locale === 'es' ? 'volvió a visitar tu propuesta' : 'came back to view your proposal'}
            </p>
            <p className="text-xs text-dark-400">
              {alert.engagement.level === 'engaged'
                ? `${alert.engagement.views} ${locale === 'es' ? 'visitas' : 'views'} · ${alert.engagement.clicks} ${locale === 'es' ? 'cliques' : 'clicks'}`
                : `${alert.engagement.views} ${locale === 'es' ? 'visitas' : 'views'}`}
            </p>
          </div>
          <button
            onClick={() => setDismissed([...dismissed, alert.id])}
            className="text-dark-500 hover:text-dark-300 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
