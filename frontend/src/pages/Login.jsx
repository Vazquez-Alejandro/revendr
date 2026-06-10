import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, AlertCircle, Mail, Check, Zap, ArrowLeft } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResend, setShowResend] = useState(false)
  const { signIn, user, isAuthenticated, loading: authLoading } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.emailVerified) {
        setShowResend(true)
        return
      }
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError(locale === 'es' ? 'Por favor completa todos los campos' : 'Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')
    setShowResend(false)

    try {
      const result = await signIn(email, password)
      if (result && !result.emailVerified) {
        setShowResend(true)
        setLoading(false)
        return
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user) return
    setLoading(true)
    try {
      await sendEmailVerification(user)
      alert(locale === 'es' ? 'Email de verificación reenviado' : 'Verification email resent')
    } catch (err) {
      setError(locale === 'es' ? 'Error al reenviar' : 'Error resending')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError(locale === 'es' ? 'Ingresá tu email primero' : 'Enter your email first')
      return
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth')
      const { auth } = await import('../config/firebase')
      await sendPasswordResetEmail(auth, email)
      alert(locale === 'es' ? 'Te enviamos un link para restablecer tu contraseña' : 'We sent you a password reset link')
    } catch (err) {
      setError(locale === 'es' ? 'Error al enviar email' : 'Error sending email')
    }
  }

  if (showResend && user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-dark-50 mb-2">
              {locale === 'es' ? 'Verificá tu email' : 'Verify your email'}
            </h1>
            <p className="text-dark-400 mb-6">
              {locale === 'es'
                ? 'Necesitás verificar tu email antes de acceder al panel.'
                : 'You need to verify your email before accessing the panel.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {locale === 'es' ? 'Ya verifiqué mi email' : 'I already verified my email'}
              </button>

              <button onClick={handleResendVerification} disabled={loading} className="btn-secondary w-full">
                {locale === 'es' ? 'Reenviar email de verificación' : 'Resend verification email'}
              </button>

              <button onClick={() => setShowResend(false)} className="text-sm text-dark-400 hover:text-dark-200 mt-2">
                {locale === 'es' ? 'Volver al login' : 'Back to login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center">
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm flex-shrink-0 ml-auto">
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Inicio' : 'Home'}
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-dark-50">{t('login')}</h1>
            <p className="text-dark-400 mt-2">{locale === 'es' ? 'Ingresá a tu panel de control' : 'Access your control panel'}</p>
          </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
                {locale === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === 'es' ? 'Ingresando...' : 'Signing in...'}
                </>
              ) : (
                t('login')
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              {locale === 'es' ? '¿No tenés cuenta?' : "Don't have an account?"}{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                {locale === 'es' ? 'Registrate gratis' : 'Sign up free'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
