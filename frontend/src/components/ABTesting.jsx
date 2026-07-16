import { useState, useEffect } from 'react'
import { FlaskConical, Plus, Trophy, Loader2, X } from 'lucide-react'
import { auth } from '../config/firebase'
import toast from 'react-hot-toast'

const API = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ABTesting() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/whatsapp/ab-tests`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setTests(data.data)
    } catch (e) {
      console.error('Error loading tests:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-300">A/B Testing</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Crear test
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : tests.length === 0 ? (
        <p className="text-xs text-dark-500 text-center py-4">
          No hay tests A/B creados
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <ABTestCard key={test.id} test={test} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateABTest onClose={() => setShowCreate(false)} onCreated={loadTests} />
      )}
    </div>
  )
}

function ABTestCard({ test }) {
  const [winner, setWinner] = useState(null)

  useEffect(() => {
    loadWinner()
  }, [])

  const loadWinner = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/ab-tests/${test.id}/winner`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setWinner(data.data)
    } catch (e) {}
  }

  return (
    <div className="bg-dark-900 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-dark-200">{test.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${test.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
          {test.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="bg-dark-800 rounded p-2">
          <p className="text-dark-400 mb-1">Mensaje A:</p>
          <p className="text-dark-200 truncate">{test.message_a}</p>
          <p className="text-dark-500 mt-1">{test.results?.a?.views || 0} vistas</p>
        </div>
        <div className="bg-dark-800 rounded p-2">
          <p className="text-dark-400 mb-1">Mensaje B:</p>
          <p className="text-dark-200 truncate">{test.message_b}</p>
          <p className="text-dark-500 mt-1">{test.results?.b?.views || 0} vistas</p>
        </div>
      </div>
      {winner && winner.winner && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Trophy className="w-3 h-3" />
          Ganador: Mensaje {winner.winner.toUpperCase()} ({winner.confidence}% diferencia)
        </div>
      )}
    </div>
  )
}

function CreateABTest({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [messageA, setMessageA] = useState('')
  const [messageB, setMessageB] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name || !messageA || !messageB) {
      toast.error('Completá todos los campos')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${API}/whatsapp/ab-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ name, messageA, messageB }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Test creado')
        onCreated()
        onClose()
      } else {
        toast.error('Error al crear test')
      }
    } catch (e) {
      toast.error('Error al crear test')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-100">Crear test A/B</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1">Nombre del test</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Test saludo vs directo"
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Mensaje A (control)</label>
            <textarea
              value={messageA}
              onChange={(e) => setMessageA(e.target.value)}
              className="input-field w-full h-20 resize-none text-sm"
              placeholder="Primer mensaje a probar..."
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Mensaje B (variante)</label>
            <textarea
              value={messageB}
              onChange={(e) => setMessageB(e.target.value)}
              className="input-field w-full h-20 resize-none text-sm"
              placeholder="Segundo mensaje a probar..."
            />
          </div>
        </div>

        <p className="text-xs text-dark-500 mt-3">
          Se enviará 50% a cada versión. El ganador se determina por tasa de conversión.
        </p>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-800 text-dark-300 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !messageA || !messageB || creating}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}
