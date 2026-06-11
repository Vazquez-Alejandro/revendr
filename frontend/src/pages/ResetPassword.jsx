import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { isSignInWithEmailLink, signInWithEmailLink, confirmPasswordReset } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, Check, Zap, ArrowLeft, AlertCircle, Lock } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState('reset')
  const [oobCode, setOobCode] = useState('')
  const { locale } = useI18n()

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    const code = searchParams.get('oobCode')
    if (modeParam === 'resetPassword' && code) {
      setMode('reset')
      setOobCode(code)
    } else {
      setError(locale === 'es' ? 'Link inválido o expirado' : 'Invalid or expired link')
    }
  }, [searchParams, locale])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError(locale === 'es' ? 'Completá ambos campos' : 'Fill in both fields')
      return
    }
    if (password !== confirmPassword) {
      setError(locale === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError(locale === 'es' ? 'Mínimo 8 caracteres' : 'Minimum 8 characters')
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setSuccess(true)
    } catch (err) {
      setError(
        locale === 'es'
          ? 'El link expiró o ya fue usado. Pedí uno nuevo.'
          : 'The link expired or was already used. Request a new one.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
                {locale === 'es' ? 'Contraseña actualizada' : 'Password updated'}
              </h1>
              <p className="text-dark-400 mb-6">
                {locale === 'es'
                  ? 'Tu contraseña fue cambiada exitosamente.'
                  : 'Your password was changed successfully.'}
              </p>
              <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {locale === 'es' ? 'Ir al login' : 'Go to login'}
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
              {locale === 'es' ? 'Nueva contraseña' : 'New password'}
            </h1>
            <p className="text-dark-400 mt-2">
              {locale === 'es' ? 'Ingresá tu nueva contraseña' : 'Enter your new password'}
            </p>
          </div>

          <div className="card">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Nueva contraseña' : 'New password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 w-full"
                    placeholder="Mínimo 8 caracteres"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-10 w-full"
                    placeholder="Repití la contraseña"
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {locale === 'es' ? 'Guardar nueva contraseña' : 'Save new password'}
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
