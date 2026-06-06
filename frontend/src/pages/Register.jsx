import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { Loader2, AlertCircle } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email || !password || !nombre) {
      setError(locale === 'es' ? 'Completa todos los campos' : 'Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await setDoc(doc(db, 'usuarios_admin', user.uid), {
        email: email,
        nombre: nombre,
        role: 'super_admin',
        permissions: ['campaigns', 'leads', 'settings', 'billing'],
        api_credits: {
          apify: 1000,
          whatsapp: 500,
          inmoxil: 500,
        },
        plan: 'enterprise',
        fecha_creacion: new Date(),
        activo: true,
      })

      navigate('/dashboard')
    } catch (err) {
      const errorMessagesEs = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido',
      }
      const errorMessagesEn = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
      }
      const errorMessages = locale === 'es' ? errorMessagesEs : errorMessagesEn
      setError(errorMessages[err.code] || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-dark-50">{t('register')}</h1>
          <p className="text-dark-400 mt-2">{locale === 'es' ? 'Registrate para acceder al panel' : 'Sign up to access the panel'}</p>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">{t('name')}</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-field"
                placeholder={locale === 'es' ? 'Tu nombre' : 'Your name'}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@revendr.app"
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
                placeholder={locale === 'es' ? 'Mínimo 6 caracteres' : 'Minimum 6 characters'}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === 'es' ? 'Creando cuenta...' : 'Creating account...'}
                </>
              ) : (
                t('register')
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              {locale === 'es' ? '¿Ya tenés cuenta?' : 'Already have an account?'}{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                {t('login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
