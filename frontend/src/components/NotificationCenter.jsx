import { useState, useEffect } from 'react'
import { Bell, Check, MessageCircle, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await api.whatsapp.notifications()
      if (data.success) setNotifications(data.data)
    } catch (e) {
      console.error('Error loading notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (id) => {
    try {
      await api.request(`/whatsapp/notifications/${id}/read`, { method: 'PUT' })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' } : n)
      )
    } catch (e) {}
  }

  const unread = notifications.filter(n => n.status !== 'read').length

  const getIcon = (type) => {
    switch (type) {
      case 'conversion': return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'response': return <MessageCircle className="w-4 h-4 text-sky-400" />
      case 'low_quality': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      default: return <Bell className="w-4 h-4 text-dark-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-300">Notificaciones</span>
        </div>
        {unread > 0 && (
          <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
            {unread} nuevas
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-dark-500 text-center py-4">
          No hay notificaciones
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-dark-900 rounded-lg p-3 flex items-start gap-3 transition-all ${
                notif.status !== 'read' ? 'border border-brand-500/20' : ''
              }`}
            >
              <div className="mt-0.5">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-200">{notif.subject}</p>
                <p className="text-xs text-dark-500 mt-1">{notif.body}</p>
                <p className="text-xs text-dark-600 mt-1">
                  {notif.created_at?.toDate?.()?.toLocaleString?.('es-AR') || ''}
                </p>
              </div>
              {notif.status !== 'read' && (
                <button
                  onClick={() => markRead(notif.id)}
                  className="text-dark-500 hover:text-emerald-400 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
