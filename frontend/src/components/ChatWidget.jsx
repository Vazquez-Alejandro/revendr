import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, X, Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatWidget({ productName = 'Revendr', productId = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: `¡Hola! ¿Cómo podemos ayudarte con ${productName}?` },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailData, setEmailData] = useState({ name: '', email: '', message: '' })
  const messagesEnd = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setSending(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/chat/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName,
            productId,
            visitorEmail: null,
            message: userMsg,
          }),
        }
      ).then(r => r.json())
      if (result.success) {
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: '¡Recibimos tu mensaje! Te responderemos pronto por email. 📧' },
        ])
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: 'Disculpá, hubo un error. Intentá de nuevo.' },
      ])
    } finally {
      setSending(false)
    }
  }

  const sendEmailForm = async (e) => {
    e.preventDefault()
    if (!emailData.name || !emailData.email || !emailData.message) return
    setSending(true)
    try {
      await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/chat/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName,
            productId,
            visitorEmail: emailData.email,
            visitorName: emailData.name,
            message: emailData.message,
          }),
        }
      )
      setMessages(prev => [...prev, { role: 'user', text: `📧 ${emailData.message}` }])
      setMessages(prev => [...prev, { role: 'bot', text: '¡Mensaje enviado! Te responderemos a tu email. ✅' }])
      setShowEmailForm(false)
      setEmailData({ name: '', email: '', message: '' })
    } catch (error) {
      toast.error('Error al enviar')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-500 hover:bg-brand-600 rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center text-white transition-all hover:scale-110 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[450px] bg-dark-900 rounded-2xl shadow-2xl shadow-brand-500/10 border border-dark-700 flex flex-col z-50 animate-slide-up">
      {/* Header */}
      <div className="bg-brand-500 rounded-t-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">{productName}</div>
            <div className="text-xs text-white/70">En línea</div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-brand-500 text-white rounded-br-md'
                : 'bg-dark-800 text-dark-100 rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-dark-800 px-3 py-2 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 text-dark-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-dark-700">
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="text-xs text-brand-400 hover:text-brand-300 mb-2 flex items-center gap-1"
        >
          <Mail className="w-3 h-3" /> Enviar por email
        </button>
        {showEmailForm ? (
          <form onSubmit={sendEmailForm} className="space-y-2">
            <input
              type="text"
              value={emailData.name}
              onChange={(e) => setEmailData({...emailData, name: e.target.value})}
              className="input-field w-full text-xs"
              placeholder="Tu nombre"
              required
            />
            <input
              type="email"
              value={emailData.email}
              onChange={(e) => setEmailData({...emailData, email: e.target.value})}
              className="input-field w-full text-xs"
              placeholder="Tu email"
              required
            />
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData({...emailData, message: e.target.value})}
              className="input-field w-full text-xs h-16"
              placeholder="Tu mensaje"
              required
            />
            <button type="submit" className="btn-primary w-full text-xs py-1.5">
              Enviar mensaje
            </button>
          </form>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="input-field flex-1 text-sm"
              placeholder="Escribí tu mensaje..."
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="btn-primary p-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
