import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../config/firebase'
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Clock,
  CheckCheck,
  Check,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  User
} from 'lucide-react'

const API = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function WhatsAppInbox() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState({ configured: false })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
    loadWhatsAppStatus()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id)
      const interval = setInterval(() => loadMessages(selectedConvo.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedConvo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadWhatsAppStatus = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/config`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setWhatsappStatus(data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/conversations`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setConversations(data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      const res = await fetch(`${API}/whatsapp/conversations/${conversationId}/messages`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setMessages(data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API}/whatsapp/conversations/${selectedConvo.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ message: newMessage }),
      })
      const data = await res.json()
      if (data.success) {
        setNewMessage('')
        loadMessages(selectedConvo.id)
        loadConversations()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_phone?.includes(searchTerm)
  )

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      let date
      if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000)
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp)
      } else {
        return ''
      }
      if (isNaN(date.getTime())) return ''
      const now = new Date()
      const diff = now - date
      if (diff < 86400000) return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      if (diff < 604800000) return date.toLocaleDateString('es-AR', { weekday: 'short' })
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    } catch {
      return ''
    }
  }

  if (!whatsappStatus.configured) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="card max-w-md text-center space-y-4">
          <WifiOff className="w-12 h-12 text-dark-400 mx-auto" />
          <h2 className="text-xl font-bold text-dark-100">WhatsApp no conectado</h2>
          <p className="text-dark-400">
            Conectá tu WhatsApp en Settings para ver las conversaciones aquí.
          </p>
          <a href="/dashboard/settings" className="btn-primary inline-flex items-center gap-2">
            Ir a Settings
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-dark-900 rounded-xl overflow-hidden border border-dark-700">
      {/* Sidebar - Conversations */}
      <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-dark-700`}>
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              WhatsApp Inbox
              {whatsappStatus.provider && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {whatsappStatus.provider === 'baileys' ? 'Free' : 'Meta'}
                </span>
              )}
            </h2>
            <button onClick={loadConversations} className="p-2 hover:bg-dark-800 rounded-lg">
              <RefreshCw className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              placeholder="Buscar contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            filteredConversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-dark-800 transition-colors border-b border-dark-700/50 ${
                  selectedConvo?.id === convo.id ? 'bg-dark-800' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-dark-100 truncate">
                      {convo.contact_name || convo.contact_phone}
                    </span>
                    <span className="text-xs text-dark-500 flex-shrink-0">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-dark-400 truncate">
                      {convo.last_message_preview || convo.contact_phone}
                    </p>
                    {convo.unread_count > 0 && (
                      <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                        {convo.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main - Chat */}
      <div className={`${selectedConvo ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-3">
              <button
                onClick={() => setSelectedConvo(null)}
                className="md:hidden p-2 hover:bg-dark-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-dark-400" />
              </button>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-dark-100">{selectedConvo.contact_name}</h3>
                <p className="text-xs text-dark-400">{selectedConvo.contact_phone}</p>
              </div>
              {selectedConvo.lead_id && (
                <a
                  href={`/dashboard/leads`}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Ver lead
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'outgoing'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-dark-800 text-dark-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outgoing' ? 'justify-end' : ''}`}>
                      <span className="text-xs opacity-60">
                        {(() => {
                          try {
                            let date
                            if (msg.timestamp?.toDate && typeof msg.timestamp.toDate === 'function') {
                              date = msg.timestamp.toDate()
                            } else if (msg.timestamp?.seconds) {
                              date = new Date(msg.timestamp.seconds * 1000)
                            } else {
                              date = new Date(msg.timestamp)
                            }
                            if (isNaN(date.getTime())) return ''
                            return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          } catch {
                            return ''
                          }
                        })()}
                      </span>
                      {msg.direction === 'outgoing' && (
                        msg.status === 'read' ? <CheckCheck className="w-3 h-3 opacity-60" /> :
                        msg.status === 'delivered' ? <CheckCheck className="w-3 h-3 opacity-60" /> :
                        <Check className="w-3 h-3 opacity-60" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-dark-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Escribí un mensaje..."
                  className="input-field flex-1"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary px-4"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-500">Seleccioná una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
