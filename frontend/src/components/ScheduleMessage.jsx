import { useState } from 'react'
import { Calendar, Clock, X, Loader2 } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function ScheduleMessage({ lead, onClose }) {
  const [message, setMessage] = useState(`Hola ${lead.nombre_negocio}, mirá tu propuesta: ${lead.url_propuesta || ''}`)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [scheduling, setScheduling] = useState(false)

  const handleSchedule = async () => {
    if (!date || !time || !message.trim()) {
      toast.error('Completá fecha, hora y mensaje')
      return
    }

    const scheduledFor = new Date(`${date}T${time}:00`)
    if (scheduledFor <= new Date()) {
      toast.error('La fecha debe ser en el futuro')
      return
    }

    setScheduling(true)
    try {
      const data = await api.whatsapp.schedule({
        leadId: lead.id,
        phone: lead.telefono_whatsapp,
        message,
        scheduledFor: scheduledFor.toISOString(),
      })
      if (data.success) {
        toast.success('Mensaje programado')
        onClose()
      } else {
        toast.error(data.error?.message || 'Error al programar')
      }
    } catch (e) {
      toast.error('Error al programar')
    } finally {
      setScheduling(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-100">Programar mensaje</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-dark-900 rounded-lg p-3 mb-4">
          <p className="text-sm text-dark-200">{lead.nombre_negocio}</p>
          <p className="text-xs text-dark-400">{lead.telefono_whatsapp}</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-dark-400 mb-1">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field w-full h-24 resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-dark-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">
              <Clock className="w-3 h-3 inline mr-1" />
              Hora
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field w-full text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-dark-500 mb-4">
          Se enviará automáticamente en la fecha y hora seleccionada (horario laboral: 9am-8pm)
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-800 text-dark-300 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSchedule}
            disabled={!date || !time || !message.trim() || scheduling}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Programar
          </button>
        </div>
      </div>
    </div>
  )
}
