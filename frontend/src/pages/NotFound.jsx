import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const { locale } = useI18n()

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-gradient mb-4">404</div>
        <h1 className="text-2xl font-bold text-dark-50 mb-2">
          {locale === 'es' ? 'Página no encontrada' : 'Page not found'}
        </h1>
        <p className="text-dark-400 mb-8">
          {locale === 'es' 
            ? 'La página que buscás no existe o fue movida.'
            : 'The page you are looking for does not exist or has been moved.'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Volver' : 'Go back'}
          </button>
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home className="w-4 h-4" />
            {locale === 'es' ? 'Inicio' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
