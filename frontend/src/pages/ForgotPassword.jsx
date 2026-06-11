import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, Mail, Check, Zap, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const { locale } = useI18n()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError(locale === 'es' ? 'Ingresá tu email' : 'Enter your email')
      return
    }

    setLoading(true)
    setError('')

    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-dark-950">
        <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 relative">
            <Link to="/" className="inline-flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold text-dark-50">Revendr</span>
            </Link>
            <Link to="/" className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" />
              {locale === 'es' ? 'Inicio' : 'Home'}
            </Link>
          </div>
        </nav>

        <div className="flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md text-center">
            <div className="card">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? 'Email enviado' : 'Email sent'}
              </h1>
              <p className="text-dark-400 mb-6">
                {locale === 'es'
                  ? `Te enviamos un link para restablecer tu contraseña a ${email}. Revisá tu bandeja de entrada y spam.`
                  : `We sent a password reset link to ${email}. Check your inbox and spam folder.`}
              </p>

              <div className="space-y-3">
                <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {locale === 'es' ? 'Ir al login' : 'Go to login'}
                </Link>
                <button onClick={() => setSent(false)} className="btn-secondary w-full">
                  {locale === 'es' ? 'Enviar otro email' : 'Send another email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 relative">
          <Link to="/" className="inline-flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Inicio' : 'Home'}
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-dark-50">
              {locale === 'es' ? 'Recuperar contraseña' : 'Reset password'}
            </h1>
            <p className="text-dark-400 mt-2">
              {locale === 'es' ? 'Ingresá tu email y te enviamos un link para restablecerla' : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-10 w-full"
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {locale === 'es' ? 'Enviar link de recuperación' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-dark-400 hover:text-dark-200 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                {locale === 'es' ? 'Volver al login' : 'Back to login'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
