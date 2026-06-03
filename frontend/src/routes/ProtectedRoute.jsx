import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children, requiredPermission = null }) {
  const { isAuthenticated, loading, adminData } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-dark-400 text-sm">Cargandopanel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
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
              No tienes permisos para acceder a esta sección.
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
