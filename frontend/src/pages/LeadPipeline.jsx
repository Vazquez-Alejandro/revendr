import { useState } from 'react'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import { ExternalLink, MessageCircle, ArrowRight, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'

const COLUMNAS = [
  { id: 'scraped', color: 'border-cyan-500', bgColor: 'bg-cyan-500/10' },
  { id: 'demo_generada', color: 'border-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'mensaje_enviado', color: 'border-violet-500', bgColor: 'bg-violet-500/10' },
  { id: 'interesado', color: 'border-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'cliente_activo', color: 'border-green-500', bgColor: 'bg-green-500/10' },
]

const LABELS_ES = {
  scraped: 'Scrapeados',
  demo_generada: 'Demo Generada',
  mensaje_enviado: 'Mensaje Enviado',
  interesado: 'Interesado',
  cliente_activo: 'Cliente',
}

const LABELS_EN = {
  scraped: 'Scraped',
  demo_generada: 'Demo Generated',
  mensaje_enviado: 'Message Sent',
  interesado: 'Interested',
  cliente_activo: 'Client',
}

export default function LeadPipeline({ leads, onRefresh }) {
  const { locale } = useI18n()
  const [draggedLead, setDraggedLead] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const labels = locale === 'es' ? LABELS_ES : LABELS_EN

  const leadsByColumn = COLUMNAS.map(col => ({
    ...col,
    leads: leads.filter(l => l.estado_proceso === col.id),
  }))

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedLead(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e, columnId) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!draggedLead || draggedLead.estado_proceso === columnId) return

    try {
      await updateDoc(doc(db, 'leads', draggedLead.id), {
        estado_proceso: columnId,
        fecha_actualizacion: new Date(),
      })
      toast.success(locale === 'es' ? 'Lead movido' : 'Lead moved')
      if (onRefresh) onRefresh()
    } catch (error) {
      toast.error(locale === 'es' ? 'Error al mover' : 'Error moving')
    }
    setDraggedLead(null)
  }

  const getTempEmoji = (t) => {
    if (t === 'hot') return '🔥'
    if (t === 'warm') return '🟡'
    if (t === 'cold') return '❄️'
    return ''
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {leadsByColumn.map(col => (
        <div
          key={col.id}
          className={`flex-shrink-0 w-72 rounded-xl border-t-2 ${col.color} ${
            dragOverColumn === col.id ? 'ring-2 ring-brand-500' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className={`px-4 py-3 ${col.bgColor} rounded-t-xl`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-dark-100 text-sm">
                {labels[col.id]}
              </h3>
              <span className="text-xs font-bold text-dark-400 bg-dark-900 px-2 py-0.5 rounded-full">
                {col.leads.length}
              </span>
            </div>
          </div>

          <div className="p-2 space-y-2 min-h-[400px] bg-dark-900/30 rounded-b-xl">
            {col.leads.length === 0 && (
              <div className="text-center py-8 text-dark-600 text-xs">
                {locale === 'es' ? 'Arrastrá leads aquí' : 'Drag leads here'}
              </div>
            )}
            {col.leads.map(lead => (
              <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead)}
                onDragEnd={handleDragEnd}
                className="bg-dark-800 border border-dark-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-dark-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-dark-100 leading-tight">
                    {lead.nombre_negocio}
                  </span>
                  <GripVertical className="w-4 h-4 text-dark-600 group-hover:text-dark-400 shrink-0" />
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-dark-500 capitalize">{lead.rubro}</span>
                  {lead.temperatura && (
                    <span className="text-xs">{getTempEmoji(lead.temperatura)}</span>
                  )}
                  {lead.lead_score > 0 && (
                    <span className={`text-xs font-bold ${
                      lead.lead_score >= 6 ? 'text-red-400' :
                      lead.lead_score >= 3 ? 'text-amber-400' :
                      'text-dark-500'
                    }`}>
                      {lead.lead_score}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {lead.url_demo && (
                    <a
                      href={lead.url_demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {lead.telefono_whatsapp && (
                    <a
                      href={`https://wa.me/${lead.telefono_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${lead.nombre_negocio}, mirá tu demo: ${lead.url_demo || ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {lead.cta_clicks > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                    <ArrowRight className="w-3 h-3" />
                    {lead.cta_clicks} CTA click{lead.cta_clicks > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
