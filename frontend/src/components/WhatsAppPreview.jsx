import { useState } from 'react'
import { MessageCircle, Eye, Send, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WhatsAppPreview({ lead, onSend, onClose }) {
  const [message, setMessage] = useState(
    `Hola ${lead.nombre_negocio}, mirá tu propuesta: ${lead.url_propuesta || ''}`
  )
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Escribí un mensaje')
      return
    }
    setSending(true)
    try {
      await onSend(lead.telefono_whatsapp, message)
      toast.success('Mensaje enviado')
      onClose()
    } catch (e) {
      toast.error('Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-100">
            Enviar WhatsApp
          </h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead info */}
        <div className="bg-dark-900 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-dark-100">{lead.nombre_negocio}</div>
              <div className="text-xs text-dark-400">{lead.telefono_whatsapp}</div>
            </div>
          </div>
        </div>

        {/* Message input */}
        <div className="mb-4">
          <label className="block text-sm text-dark-400 mb-2">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field w-full h-32 resize-none text-sm"
            placeholder="Escribí tu mensaje..."
          />
          <div className="text-xs text-dark-500 mt-1">
            {message.length} caracteres
          </div>
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-dark-800 text-dark-300 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-all"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Ocultar preview' : 'Ver cómo se ve en WhatsApp'}
        </button>

        {/* WhatsApp preview */}
        {showPreview && (
          <div className="mb-4">
            <div className="bg-[#0b141a] rounded-xl p-4 max-w-[280px] mx-auto">
              <div className="bg-[#005c4b] rounded-lg p-3 relative">
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#005c4b] rotate-45" />
                <p className="text-[#e9edef] text-sm whitespace-pre-wrap leading-relaxed">
                  {message}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[#8696a0] text-[10px]">12:00</span>
                  <span className="text-[#53bdeb] text-[10px]">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-800 text-dark-300 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
