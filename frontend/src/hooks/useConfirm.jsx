import { useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export function useConfirm() {
  const [state, setState] = useState({ resolve: null, message: '', confirmText: 'Eliminar', title: '' })

  const confirm = useCallback((message, confirmText, title) => {
    return new Promise((resolve) => {
      setState({ resolve, message, confirmText: confirmText || 'Eliminar', title: title || '' })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve(true)
    setState({ resolve: null, message: '', confirmText: 'Eliminar', title: '' })
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve(false)
    setState({ resolve: null, message: '', confirmText: 'Eliminar', title: '' })
  }, [state])

  const ConfirmDialog = state.resolve ? (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={handleCancel}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-dark-100">{state.title || 'Confirmar'}</h3>
          </div>
          <button onClick={handleCancel} className="text-dark-500 hover:text-dark-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-dark-300 mb-6">{state.message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="px-3 py-1.5 text-sm text-dark-400 hover:text-dark-200 rounded-lg">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20">
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialog }
}
