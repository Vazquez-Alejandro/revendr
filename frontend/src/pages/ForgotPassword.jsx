import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, Mail, ArrowLeft, Check, Zap } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
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
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err) {
      const errorsEs = {
        'auth/user-not-found': 'No existe una cuenta con este email',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos',
      }
      const errorsEn = {
        'auth/user-not-found': 'No account found with this email',
        'auth/invalid-email': 'Invalid email',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes',
      }
      setError((locale === 'es' ? errorsEs : errorsEn)[err.code] || err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
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
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {locale === 'es' ? 'Volver al login' : 'Back to login'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-dark-50">Revendr</span>
          </Link>
          <div>
            <Link to="/" className="text-dark-400 hover:text-dark-200 text-sm inline-flex items-center gap-1 mb-4">
              ← {locale === 'es' ? 'Volver al inicio' : 'Back to home'}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-dark-50">
            {locale === 'es' ? 'Recuperar contraseña' : 'Reset password'}
          </h1>
          <p className="text-dark-400 mt-2">
            {locale === 'es' ? 'Ingresá tu email y te enviamos un link para restablecerla' : 'Enter your email and we\'ll send you a reset link'}
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
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {locale === 'es' ? 'Email' : 'Email'}
              </label>
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
  )
}
