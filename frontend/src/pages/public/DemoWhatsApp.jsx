import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Zap, Calendar, Clock, MapPin, Phone, Star, Check, ArrowRight } from 'lucide-react'

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

export default function DemoWhatsApp() {
  const { demoId } = useParams()
  const [demo, setDemo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    loadDemo()
  }, [demoId])

  const loadDemo = async () => {
    try {
      const docRef = doc(db, 'demos', demoId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setDemo({ id: docSnap.id, ...docSnap.data() })
      }
    } catch (error) {
      console.error('Error loading demo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactWhatsApp = () => {
    if (demo?.telefono_whatsapp) {
      const phone = demo.telefono_whatsapp.replace(/\D/g, '')
      const message = encodeURIComponent(
        `Hola ${demo.nombre_negocio}, me interesa el servicio de ${demo.rubro}. ¿Podemos agendar una visita?`
      )
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-dark-400">Cargando demo...</div>
      </div>
    )
  }

  if (!demo) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-50 mb-2">Demo no encontrada</h1>
          <p className="text-dark-400">Esta demo no existe o fue eliminada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Revendr</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{demo.nombre_negocio}</h1>
          <p className="text-white/80">{demo.rubro} • {demo.ciudad || 'Argentina'}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Business Info */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Información del Negocio</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-dark-300">
              <MapPin className="w-5 h-5 text-dark-400" />
              <span>{demo.direccion || 'Buenos Aires, Argentina'}</span>
            </div>
            <div className="flex items-center gap-3 text-dark-300">
              <Phone className="w-5 h-5 text-dark-400" />
              <span>{demo.telefono_whatsapp || '+54 11 1234-5678'}</span>
            </div>
            <div className="flex items-center gap-3 text-dark-300">
              <Clock className="w-5 h-5 text-dark-400" />
              <span>Lun - Vie: 9:00 - 18:00</span>
            </div>
            <div className="flex items-center gap-3 text-dark-300">
              <Star className="w-5 h-5 text-amber-400" />
              <span>4.8 / 5.0 (120 reseñas)</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card bg-gradient-to-br from-brand-500/10 to-brand-600/10 border-brand-500/20">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-dark-50 mb-4">
              ¿Te interesa nuestro servicio?
            </h2>
            <p className="text-dark-400 mb-6 max-w-md mx-auto">
              Contactanos por WhatsApp y agendá una visita sin compromiso.
            </p>
            <button
              onClick={handleContactWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 inline-flex items-center gap-3 text-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Consultar por WhatsApp
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-dark-500 text-sm">
          <p>Powered by <span className="text-brand-400 font-medium">Revendr</span></p>
        </div>
      </div>
    </div>
  )
}
