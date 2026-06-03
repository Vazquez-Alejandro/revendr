import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { Loader2, AlertCircle } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email || !password || !nombre) {
      setError('Completa todos los campos')
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
      const errorMessages = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido',
      }
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
          <h1 className="text-2xl font-bold text-dark-50">Crear Cuenta</h1>
          <p className="text-dark-400 mt-2">Registrate para acceder al panel</p>
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-field"
                placeholder="Tu nombre"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Correo Electrónico</label>
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
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
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
