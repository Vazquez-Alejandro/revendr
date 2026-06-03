import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx('text-brand-500 animate-spin', sizes[size])} />
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-dark-400 text-sm">Cargando...</p>
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-dark-700 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-dark-700 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-dark-700 rounded w-2/3"></div>
    </div>
  )
}
