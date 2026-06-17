import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useNavigate } from 'react-router-dom'
import { Bell, Loader2, Check, Zap, Users, MessageCircle, TrendingUp, AlertTriangle } from 'lucide-react'

const TYPE_ICONS = {
  new_lead: Users,
  demo_generated: Zap,
  message_sent: MessageCircle,
  lead_converted: TrendingUp,
  scraping_error: AlertTriangle,
}

const timeAgo = (date) => {
  const diff = Date.now() - date
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return date.toLocaleDateString()
}

export function NotificationDropdown() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAsRead = async (id) => {
    await updateDoc(doc(db, 'notificaciones', id), { read: true })
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => markAsRead(n.id)))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
            <h3 className="text-sm font-semibold text-dark-100">
              {locale === 'es' ? 'Notificaciones' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {locale === 'es' ? 'Leer todas' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-dark-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-dark-500 text-sm">
                {locale === 'es' ? 'Sin notificaciones' : 'No notifications'}
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => { markAsRead(n.id); n.link && navigate(n.link) }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-dark-800 transition-colors border-b border-dark-800/50 last:border-0 ${!n.read ? 'bg-brand-500/5' : ''}`}
                  >
                    <div className={`p-1.5 rounded-lg mt-0.5 ${n.type === 'scraping_error' ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
                      <Icon className={`w-4 h-4 ${n.type === 'scraping_error' ? 'text-red-400' : 'text-brand-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'text-dark-100 font-medium' : 'text-dark-300'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-dark-400 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-[10px] text-dark-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          <button
            onClick={() => { setOpen(false); navigate('/dashboard/settings') }}
            className="w-full text-center text-xs text-dark-400 hover:text-dark-200 py-2.5 border-t border-dark-700 hover:bg-dark-800 transition-colors"
          >
            {locale === 'es' ? 'Configurar notificaciones' : 'Notification settings'}
          </button>
        </div>
      )}
    </div>
  )
}
