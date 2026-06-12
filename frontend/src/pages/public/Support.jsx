import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import {
  Zap, ArrowLeft, Mail, MessageCircle, Send, Check, AlertCircle,
  Clock, HelpCircle, Bug, Lightbulb, CreditCard
} from 'lucide-react'

const categoriesEs = [
  { id: 'general', label: 'Consulta general', icon: HelpCircle },
  { id: 'bug', label: 'Reportar un error', icon: Bug },
  { id: 'feature', label: 'Sugerir una función', icon: Lightbulb },
  { id: 'billing', label: 'Facturación y pagos', icon: CreditCard },
]

const categoriesEn = [
  { id: 'general', label: 'General inquiry', icon: HelpCircle },
  { id: 'bug', label: 'Report a bug', icon: Bug },
  { id: 'feature', label: 'Suggest a feature', icon: Lightbulb },
  { id: 'billing', label: 'Billing & payments', icon: CreditCard },
]

export default function Support() {
  const { locale } = useI18n()
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const categories = locale === 'es' ? categoriesEs : categoriesEn

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!category || !subject || !message || !email) {
      setError(locale === 'es' ? 'Completá todos los campos' : 'Fill in all fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('https://us-central1-revendr-9add8.cloudfunctions.net/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message, email }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(locale === 'es' ? 'Error al enviar. Intentá de nuevo.' : 'Error sending. Try again.')
      }
    } catch (err) {
      setError(locale === 'es' ? 'Error al enviar. Intentá de nuevo.' : 'Error sending. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
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
              {locale === 'es' ? 'Volver al inicio' : 'Back to home'}
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-dark-50 mb-2">
              {locale === 'es' ? 'Mensaje enviado' : 'Message sent'}
            </h1>
            <p className="text-dark-400 mb-6">
              {locale === 'es'
                ? 'Te responderemos a la brevedad. Revisá tu bandeja de entrada.'
                : 'We will respond shortly. Check your inbox.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/help" className="btn-secondary">
                {locale === 'es' ? 'Volver a Ayuda' : 'Back to Help'}
              </Link>
              <Link to="/" className="btn-primary">
                {locale === 'es' ? 'Ir al inicio' : 'Go home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            {locale === 'es' ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-50 mb-4">
            {locale === 'es' ? 'Soporte' : 'Support'}
          </h1>
          <p className="text-dark-400 text-lg">
            {locale === 'es'
              ? '¿Tenés un problema o sugerencia? Escribinos.'
              : 'Have a problem or suggestion? Write to us.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-dark-100 mb-4">
              {locale === 'es' ? 'Contacto directo' : 'Direct contact'}
            </h2>

            <a
              href="mailto:hola@revendr.app"
              className="card-hover flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-100">Email</h3>
                <p className="text-sm text-dark-400">hola@revendr.app</p>
              </div>
            </a>

            <a
              href="https://wa.me/5491112345678"
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-100">WhatsApp</h3>
                <p className="text-sm text-dark-400">{locale === 'es' ? 'Respuesta rápida' : 'Quick response'}</p>
              </div>
            </a>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-brand-400" />
                <h3 className="font-semibold text-dark-100">
                  {locale === 'es' ? 'Horario de atención' : 'Support hours'}
                </h3>
              </div>
              <p className="text-dark-400 text-sm">
                {locale === 'es'
                  ? 'Lunes a viernes, 9:00 - 18:00 (GMT-3)'
                  : 'Monday to Friday, 9:00 AM - 6:00 PM (GMT-3)'}
              </p>
              <p className="text-dark-500 text-sm mt-1">
                {locale === 'es'
                  ? 'Respondemos en menos de 24 horas hábiles'
                  : 'We respond within 24 business hours'}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-semibold text-dark-100 mb-4">
              {locale === 'es' ? 'Envianos un mensaje' : 'Send us a message'}
            </h2>

            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Categoría' : 'Category'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                            category === cat.id
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                              : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field w-full"
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Asunto' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-field w-full"
                    placeholder={locale === 'es' ? 'Resumen del problema' : 'Problem summary'}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Mensaje' : 'Message'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-field w-full h-32 resize-none"
                    placeholder={locale === 'es' ? 'Describe tu problema o sugerencia...' : 'Describe your problem or suggestion...'}
                    disabled={loading}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {locale === 'es' ? 'Enviar mensaje' : 'Send message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
