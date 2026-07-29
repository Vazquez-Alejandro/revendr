import { useState } from 'react'
import { Loader2, Sparkles, Send, RefreshCw, Copy, Check } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function AIMessageGenerator({ leads, onSendMessage, onBulkSend }) {
  const [productContext, setProductContext] = useState('')
  const [generatedMessages, setGeneratedMessages] = useState([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const generateMessages = async () => {
    if (!leads || leads.length === 0) {
      toast.error('Seleccioná al menos un lead')
      return
    }

    setGenerating(true)
    try {
      const leadIds = leads.map(l => l.id)
      const data = await api.whatsapp.generateMessage({ leadIds, productContext })
      if (data.success) {
        setGeneratedMessages(data.data)
        toast.success(`${data.data.length} mensajes generados`)
      } else {
        toast.error(data.error?.message || 'Error generating messages')
      }
    } catch (e) {
      toast.error('Error generating messages')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = (leadId, message) => {
    navigator.clipboard.writeText(message)
    setCopiedId(leadId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSendSingle = async (leadId, message) => {
    setSending(true)
    try {
      const lead = leads.find(l => l.id === leadId)
      if (lead?.telefono_whatsapp) {
        await onSendMessage(lead.telefono_whatsapp, message)
        toast.success('Mensaje enviado')
      }
    } catch (e) {
      toast.error('Error sending')
    } finally {
      setSending(false)
    }
  }

  const handleSendAll = async () => {
    if (generatedMessages.length === 0) return
    setSending(true)
    try {
      const toSend = generatedMessages
        .filter(m => {
          const lead = leads.find(l => l.id === m.leadId)
          return lead?.telefono_whatsapp
        })
        .map(m => {
          const lead = leads.find(l => l.id === m.leadId)
          return { ...lead, message: m.message }
        })

      await onBulkSend(toSend)
      toast.success(`${toSend.length} mensajes enviados`)
    } catch (e) {
      toast.error('Error sending bulk')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-brand-400" />
        <h3 className="text-lg font-semibold text-dark-100">
          Generador de Mensajes con IA
        </h3>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-2">
          ¿Qué estás vendiendo? (contexto para la IA)
        </label>
        <textarea
          value={productContext}
          onChange={(e) => setProductContext(e.target.value)}
          placeholder="Ej: Software de agenda online para turnos. Los clientes pueden reservar 24/7 desde el celular."
          className="input-field w-full h-24 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={generateMessages}
          disabled={generating || leads.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? 'Generando...' : `Generar ${leads.length} mensajes`}
        </button>

        {generatedMessages.length > 0 && (
          <button
            onClick={handleSendAll}
            disabled={sending}
            className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar todos ({generatedMessages.length})
          </button>
        )}
      </div>

      {generatedMessages.length > 0 && (
        <div className="space-y-3 mt-6">
          <p className="text-sm text-dark-400">
            Revisá los mensajes antes de enviar. Podés editarlos o copiarlos.
          </p>
          {generatedMessages.map((item) => {
            const lead = leads.find(l => l.id === item.leadId)
            return (
              <div key={item.leadId} className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-dark-200">
                      {lead?.nombre_negocio || 'Lead'}
                    </span>
                    <span className="text-xs text-dark-500 ml-2">
                      {lead?.telefono_whatsapp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(item.leadId, item.message)}
                      className="text-dark-400 hover:text-dark-200 transition-colors"
                      title="Copiar"
                    >
                      {copiedId === item.leadId ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSendSingle(item.leadId, item.message)}
                      disabled={sending || !lead?.telefono_whatsapp}
                      className="text-brand-400 hover:text-brand-300 transition-colors"
                      title="Enviar"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-dark-100 whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
