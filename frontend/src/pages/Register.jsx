import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, AlertCircle, Check, Mail, Zap, ArrowLeft } from 'lucide-react'

const PLANS = {
  starter: { name: 'Starter', price: 49, leads: 100, rubros: 1, demos: 50, msgs: 1000 },
  growth: { name: 'Growth', price: 149, leads: 1000, rubros: 3, demos: 500, msgs: 10000 },
  enterprise: { name: 'Enterprise', price: 399, leads: -1, rubros: -1, demos: -1, msgs: -1 },
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const initialPlan = searchParams.get('plan') || 'starter'
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [plan, setPlan] = useState(initialPlan)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const { locale } = useI18n()
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (step === 1) {
      if (!nombre || !email || !password || !confirmPassword) {
        setError(locale === 'es' ? 'Completa todos los campos' : 'Fill in all fields')
        return
      }
      if (password !== confirmPassword) {
        setError(locale === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')
        return
      }
      if (password.length < 8) {
        setError(locale === 'es' ? 'La contraseña debe tener al menos 8 caracteres' : 'Password must be at least 8 characters')
        return
      }
      if (!acceptTerms) {
        setError(locale === 'es' ? 'Debés aceptar los Términos y Condiciones' : 'You must accept the Terms and Conditions')
        return
      }
      setStep(2)
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: nombre })

      await setDoc(doc(db, 'usuarios', user.uid), {
        email,
        nombre,
        empresa: empresa || '',
        role: 'client',
        plan: plan,
        plan_limits: PLANS[plan],
        permissions: ['campaigns', 'leads', 'products'],
        acceptTerms: true,
        acceptMarketing,
        termsVersion: '1.0',
        termsAcceptedAt: serverTimestamp(),
        emailVerified: false,
        fecha_creacion: serverTimestamp(),
        activo: true,
        onboarding_completed: false,
      })

      await sendEmailVerification(user)

      setCreatedUser(user)
      setVerificationSent(true)
    } catch (err) {
      const errorsEs = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/operation-not-allowed': 'El registro no está habilitado',
      }
      const errorsEn = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password must be at least 8 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Registration is not enabled',
      }
      setError((locale === 'es' ? errorsEs : errorsEn)[err.code] || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!createdUser) return
    setLoading(true)
    try {
      await sendEmailVerification(createdUser)
      setError('')
      alert(locale === 'es' ? 'Email de verificación reenviado' : 'Verification email resent')
    } catch (err) {
      setError(locale === 'es' ? 'Error al reenviar' : 'Error resending')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!createdUser) return
    setLoading(true)
    try {
      await createdUser.reload()
      if (createdUser.emailVerified) {
        await import('firebase/firestore').then(({ updateDoc, doc: d }) =>
          updateDoc(d(db, 'usuarios', createdUser.uid), { emailVerified: true })
        )
        navigate('/onboarding')
      } else {
        setError(locale === 'es' ? 'Tu email aún no fue verificado. Revisá tu bandeja de entrada.' : 'Your email is not verified yet. Check your inbox.')
      }
    } catch (err) {
      setError(locale === 'es' ? 'Error al verificar' : 'Error checking verification')
    } finally {
      setLoading(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-dark-50 mb-2">
              {locale === 'es' ? 'Verificá tu email' : 'Verify your email'}
            </h1>
            <p className="text-dark-400 mb-6">
              {locale === 'es'
                ? `Te enviamos un link de verificación a ${email}. Hacé click en el link para activar tu cuenta.`
                : `We sent a verification link to ${email}. Click the link to activate your account.`}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCheckVerification}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {locale === 'es' ? 'Ya verifiqué mi email' : 'I already verified my email'}
              </button>

              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="btn-secondary w-full"
              >
                {locale === 'es' ? 'Reenviar email de verificación' : 'Resend verification email'}
              </button>

              <Link to="/login" className="block text-sm text-dark-400 hover:text-dark-200 mt-4">
                {locale === 'es' ? 'Volver al login' : 'Back to login'}
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Inicio' : 'Home'}
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-dark-50">
              {locale === 'es' ? 'Creá tu cuenta' : 'Create your account'}
            </h1>
          <p className="text-dark-400 mt-2">
            {locale === 'es' ? '14 días gratis. Sin tarjeta de crédito.' : '14 days free. No credit card required.'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-brand-500 text-white' : 'bg-dark-800 text-dark-400'
          }`}>1</div>
          <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-brand-500' : 'bg-dark-700'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-brand-500 text-white' : 'bg-dark-800 text-dark-400'
          }`}>2</div>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Nombre completo' : 'Full name'}
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="input-field"
                    placeholder={locale === 'es' ? 'Juan Pérez' : 'John Doe'}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Email' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="tu@email.com"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Empresa (opcional)' : 'Company (optional)'}
                  </label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="input-field"
                    placeholder={locale === 'es' ? 'Mi empresa SRL' : 'My Company LLC'}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Contraseña' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="Mínimo 8 caracteres"
                    disabled={loading}
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Repití la contraseña"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Terms acceptance */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-800 text-brand-500 focus:ring-brand-500"
                      required
                    />
                    <span className="text-sm text-dark-300 group-hover:text-dark-200">
                      {locale === 'es' ? 'Acepto los ' : 'I accept the '}
                      <Link to="/terms" target="_blank" className="text-brand-400 hover:text-brand-300 underline">
                        {locale === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
                      </Link>
                      {locale === 'es' ? ' y la ' : ' and the '}
                      <Link to="/privacy" target="_blank" className="text-brand-400 hover:text-brand-300 underline">
                        {locale === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
                      </Link>
                      *
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptMarketing}
                      onChange={(e) => setAcceptMarketing(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-dark-400 group-hover:text-dark-300">
                      {locale === 'es' ? 'Recibir novedades y tips de marketing por email' : 'Receive news and marketing tips by email'}
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {locale === 'es' ? 'Continuar' : 'Continue'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-3">
                    {locale === 'es' ? 'Elegí tu plan' : 'Choose your plan'}
                  </label>
                  <div className="space-y-3">
                    {Object.entries(PLANS).map(([key, p]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPlan(key)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          plan === key
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-dark-100">{p.name}</span>
                              {key === 'growth' && (
                                <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                                  {locale === 'es' ? 'Popular' : 'Popular'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-dark-400 mt-1">
                              {p.leads === -1 ? (locale === 'es' ? 'Leads ilimitados' : 'Unlimited leads') : `${p.leads} leads/mes`}
                              {' · '}
                              {p.rubros === -1 ? (locale === 'es' ? 'Rubros ilimitados' : 'Unlimited niches') : `${p.rubros} rubro${p.rubros > 1 ? 's' : ''}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-dark-100">${p.price}</div>
                            <div className="text-xs text-dark-400">/mes</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    {locale === 'es' ? 'Atrás' : 'Back'}
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {locale === 'es' ? 'Crear cuenta' : 'Create account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              {locale === 'es' ? '¿Ya tenés cuenta?' : 'Already have an account?'}{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                {locale === 'es' ? 'Iniciar sesión' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
