import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Loader2 } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function Blacklist() {
  const [blacklist, setBlacklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadBlacklist()
  }, [])

  const loadBlacklist = async () => {
    setLoading(true)
    try {
      const data = await api.whatsapp.blacklist()
      if (data.success) setBlacklist(data.data)
    } catch (e) {
      console.error('Error loading blacklist:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!phone.trim()) return
    setAdding(true)
    try {
      const data = await api.whatsapp.addToBlacklist({ phone, reason })
      if (data.success) {
        toast.success('Número agregado a blacklist')
        setPhone('')
        setReason('')
        loadBlacklist()
      } else {
        toast.error(data.error?.message || 'Error al agregar')
      }
    } catch (e) {
      toast.error('Error al agregar')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (phone) => {
    try {
      const data = await api.whatsapp.removeFromBlacklist(phone)
      if (data.success) {
        toast.success('Número removido de blacklist')
        loadBlacklist()
      }
    } catch (e) {
      toast.error('Error al remover')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-dark-400" />
        <span className="text-sm text-dark-300">Números bloqueados</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Número (ej: 5491155551234)"
          className="flex-1 input-field text-sm"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="flex-1 input-field text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!phone.trim() || adding}
          className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : blacklist.length === 0 ? (
        <p className="text-xs text-dark-500 text-center py-4">
          No hay números bloqueados
        </p>
      ) : (
        <div className="space-y-2">
          {blacklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-dark-900 rounded-lg p-3">
              <div>
                <p className="text-sm text-dark-200 font-mono">{item.phone}</p>
                {item.reason && <p className="text-xs text-dark-500">{item.reason}</p>}
              </div>
              <button
                onClick={() => handleRemove(item.phone)}
                className="text-dark-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
