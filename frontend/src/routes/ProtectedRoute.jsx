import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Mail } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../config/firebase'

export function ProtectedRoute({ children, requiredPermission = null }) {
  const { isAuthenticated, loading, adminData, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-dark-400 text-sm">Cargando panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">
            Verificá tu email
          </h2>
          <p className="text-dark-400 mb-4">
            Te enviamos un link de verificación a <strong>{user.email}</strong>. Revisá tu bandeja de entrada.
          </p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                await sendEmailVerification(user)
                alert('Email de verificación reenviado')
              }}
              className="btn-primary w-full"
            >
              Reenviar email de verificación
            </button>
            <button
              onClick={async () => {
                const cu = auth.currentUser
                if (cu) { await cu.reload(); if (cu.emailVerified) navigate('/dashboard'); else window.location.reload() }
              }}
              className="btn-secondary w-full"
            >
              Ya verifiqué mi email
            </button>
            <a href="/login" className="block text-sm text-dark-400 hover:text-dark-200">
              Volver al login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (requiredPermission && adminData?.role !== 'super_admin') {
    const hasPermission = adminData?.permissions?.includes(requiredPermission)
    if (!hasPermission) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center">
          <div className="card max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-2xl">🚫</span>
            </div>
            <h2 className="text-xl font-semibold text-dark-100 mb-2">
              Acceso Denegado
            </h2>
            <p className="text-dark-400 mb-4">
              No tenés permisos para acceder a esta sección.
            </p>
            <a href="/dashboard" className="btn-primary inline-block">
              Volver al Dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  return children
}
