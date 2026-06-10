import { useState, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import {
  Users,
  Phone,
  Calendar,
  FileText,
  ArrowRight,
  Loader2,
  Clock,
  Star,
  MessageCircle,
  Mail,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STAGES = [
  { id: 'nuevo', label: 'Nuevo', color: 'bg-blue-500', lightColor: 'bg-blue-500/10 text-blue-400' },
  { id: 'contactado', label: 'Contactado', color: 'bg-amber-500', lightColor: 'bg-amber-500/10 text-amber-400' },
  { id: 'interesado', label: 'Interesado', color: 'bg-violet-500', lightColor: 'bg-violet-500/10 text-violet-400' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-orange-500', lightColor: 'bg-orange-500/10 text-orange-400' },
  { id: 'cerrado', label: 'Cerrado', color: 'bg-emerald-500', lightColor: 'bg-emerald-500/10 text-emerald-400' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-500', lightColor: 'bg-red-500/10 text-red-400' },
]

export default function CRM() {
  const { locale } = useI18n()
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [newNote, setNewNote] = useState('')
  const [draggedLead, setDraggedLead] = useState(null)

  useEffect(() => {
    loadPipeline()
  }, [])

  const loadPipeline = async () => {
    setLoading(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/crm/pipeline'
      ).then(r => r.json())
      if (result.success) {
        setPipeline(result.data.pipeline)
      }
    } catch (error) {
      console.error('Error loading pipeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTimeline = async (leadId) => {
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/crm/leads/${leadId}/timeline`
      ).then(r => r.json())
      if (result.success) {
        setTimeline(result.data)
      }
    } catch (error) {
      console.error('Error loading timeline:', error)
    }
  }

  const moveLead = async (leadId, newStage) => {
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/crm/leads/${leadId}/stage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newStage }),
        }
      )
      toast.success(locale === 'es' ? 'Lead movido' : 'Lead moved')
      loadPipeline()
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, crm_stage: newStage })
      }
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error')
    }
  }

  const addActivity = async (type) => {
    if (!selectedLead) return
    const description = type === 'note' ? newNote : `${type === 'call' ? 'Llamada' : 'Reunión'} registrada`
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/crm/leads/${selectedLead.id}/activity`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, description }),
        }
      )
      toast.success(locale === 'es' ? 'Actividad registrada' : 'Activity recorded')
      setNewNote('')
      loadTimeline(selectedLead.id)
    } catch (error) {
      toast.error(locale === 'es' ? 'Error' : 'Error')
    }
  }

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, stage) => {
    e.preventDefault()
    if (draggedLead) {
      moveLead(draggedLead.id, stage)
      setDraggedLead(null)
    }
  }

  const openLeadDetail = (lead) => {
    setSelectedLead(lead)
    loadTimeline(lead.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">
          {locale === 'es' ? 'CRM — Pipeline de Ventas' : 'CRM — Sales Pipeline'}
        </h1>
        <p className="text-dark-400 mt-1">
          {locale === 'es' ? 'Arrastrá los leads entre columnas para moverlos de etapa' : 'Drag leads between columns to move them'}
        </p>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.map((stage) => {
          const stageInfo = STAGES.find(s => s.id === stage.stage)
          return (
            <div
              key={stage.stage}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.stage)}
            >
              <div className={`rounded-t-lg p-3 ${stageInfo?.lightColor || 'bg-dark-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-dark-100">{stage.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-900/50 text-dark-300">
                    {stage.count}
                  </span>
                </div>
              </div>
              <div className="bg-dark-900 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {stage.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onClick={() => openLeadDetail(lead)}
                    className="bg-dark-800 rounded-lg p-3 cursor-pointer hover:bg-dark-700 transition-colors border border-dark-700 hover:border-dark-500"
                  >
                    <div className="text-sm font-medium text-dark-100 mb-1 truncate">
                      {lead.nombre_negocio}
                    </div>
                    <div className="text-xs text-dark-400 mb-2 truncate">
                      {lead.telefono_whatsapp || lead.email || 'Sin contacto'}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        (lead.lead_score || 0) >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                        (lead.lead_score || 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-dark-700 text-dark-400'
                      }`}>
                        Score: {lead.lead_score || 0}
                      </span>
                      {lead.llamadas_count > 0 && (
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lead.llamadas_count}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {stage.leads.length === 0 && (
                  <div className="text-center py-8 text-dark-500 text-xs">
                    {locale === 'es' ? 'Sin leads' : 'No leads'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lead Detail Sidebar */}
      {selectedLead && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-end z-50 p-4">
          <div className="card w-full max-w-md h-full overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">{selectedLead.nombre_negocio}</h2>
              <button onClick={() => setSelectedLead(null)} className="text-dark-400 hover:text-dark-200">✕</button>
            </div>

            {/* Contact */}
            <div className="bg-dark-900 rounded-lg p-4 mb-4 space-y-2">
              {selectedLead.telefono_whatsapp && (
                <div className="flex items-center gap-2 text-sm text-dark-200">
                  <Phone className="w-4 h-4 text-dark-400" /> {selectedLead.telefono_whatsapp}
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-2 text-sm text-dark-200">
                  <Mail className="w-4 h-4 text-dark-400" /> {selectedLead.email}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-dark-200">Score: {selectedLead.lead_score || 0}</span>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {locale === 'es' ? 'Etapa' : 'Stage'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => moveLead(selectedLead.id, s.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedLead.crm_stage === s.id
                        ? s.lightColor + ' border border-current'
                        : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => addActivity('call')} className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20">
                <Phone className="w-3 h-3 inline mr-1" /> {locale === 'es' ? 'Llamar' : 'Call'}
              </button>
              <button onClick={() => addActivity('meeting')} className="flex-1 py-2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-medium hover:bg-violet-500/20">
                <Calendar className="w-3 h-3 inline mr-1" /> {locale === 'es' ? 'Reunión' : 'Meeting'}
              </button>
            </div>

            {/* Add Note */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="input-field flex-1 text-sm"
                  placeholder={locale === 'es' ? 'Agregar nota...' : 'Add note...'}
                  onKeyDown={(e) => e.key === 'Enter' && addActivity('note')}
                />
                <button onClick={() => addActivity('note')} className="btn-primary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium text-dark-300 mb-3">
                {locale === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
              </h3>
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <p className="text-xs text-dark-500 text-center py-4">
                    {locale === 'es' ? 'Sin actividad aún' : 'No activity yet'}
                  </p>
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        event.event_type === 'call' ? 'bg-emerald-500/20' :
                        event.event_type === 'meeting' ? 'bg-violet-500/20' :
                        event.event_type === 'stage_change' ? 'bg-amber-500/20' :
                        'bg-brand-500/20'
                      }`}>
                        {event.event_type === 'call' ? <Phone className="w-4 h-4 text-emerald-400" /> :
                         event.event_type === 'meeting' ? <Calendar className="w-4 h-4 text-violet-400" /> :
                         event.event_type === 'stage_change' ? <ArrowRight className="w-4 h-4 text-amber-400" /> :
                         <FileText className="w-4 h-4 text-brand-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-200">{event.description}</p>
                        <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {event.timestamp?.toDate?.()?.toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
