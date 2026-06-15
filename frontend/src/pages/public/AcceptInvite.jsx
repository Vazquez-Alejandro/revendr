import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const inviteId = searchParams.get('invite')
    if (!inviteId) {
      setStatus('invalid')
      return
    }
    fetch('https://us-central1-revendr-9add8.cloudfunctions.net/api/team/invite/accept-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setEmail(result.data.email)
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="py-12">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-dark-400">Aceptando invitación...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="py-12">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-100 mb-2">Invitación aceptada</h2>
            <p className="text-dark-400 mb-6">{email} ahora es miembro del equipo</p>
            <Link to="/login" className="btn-primary inline-block">Ir a Revendr</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="py-12">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-100 mb-2">Error</h2>
            <p className="text-dark-400 mb-6">Esta invitación no es válida o ya expiró</p>
            <Link to="/" className="btn-primary inline-block">Volver</Link>
          </div>
        )}
        {status === 'invalid' && (
          <div className="py-12">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-100 mb-2">Invitación inválida</h2>
            <p className="text-dark-400 mb-6">No se encontró el código de invitación</p>
            <Link to="/" className="btn-primary inline-block">Volver</Link>
          </div>
        )}
      </div>
    </div>
  )
}