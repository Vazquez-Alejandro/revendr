import { useState, useEffect } from 'react'
import { MessageCircle, Mail, CheckCircle, XCircle, Loader2, Filter, BarChart3 } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function MessageHistory({ leadId = null }) {
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadMessages()
    loadStats()
  }, [leadId, filter])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const params = {}
      if (leadId) params.leadId = leadId
      if (filter !== 'all') params.channel = filter
      const data = await api.whatsapp.messages(params)
      if (data.success) setMessages(data.data)
    } catch (e) {
      console.error('Error loading messages:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await api.whatsapp.messagesStats()
      if (data.success) setStats(data.data)
    } catch (e) {
      console.error('Error loading stats:', e)
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    const d = date?.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  if (!leadId && stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-dark-100">{stats.total}</div>
            <div className="text-xs text-dark-400">Total</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.sent}</div>
            <div className="text-xs text-dark-400">Enviados</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-dark-400">Fallidos</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-sky-400">{stats.whatsapp}</div>
            <div className="text-xs text-dark-400">WhatsApp</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!leadId && (
        <div className="flex gap-2">
          {['all', 'whatsapp', 'email'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-dark-800 text-dark-400 border border-dark-700 hover:bg-dark-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 text-dark-500 text-sm">
          No hay mensajes para mostrar
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="card p-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.channel === 'whatsapp' ? 'bg-emerald-500/20' : 'bg-sky-500/20'
              }`}>
                {msg.channel === 'whatsapp'
                  ? <MessageCircle className="w-4 h-4 text-emerald-400" />
                  : <Mail className="w-4 h-4 text-sky-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-dark-400">{msg.recipient}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    msg.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {msg.status === 'sent' ? 'Enviado' : 'Fallido'}
                  </span>
                </div>
                <p className="text-sm text-dark-200 truncate">{msg.message}</p>
                <p className="text-xs text-dark-500 mt-1">{formatDate(msg.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
