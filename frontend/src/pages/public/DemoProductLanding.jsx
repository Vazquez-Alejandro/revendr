import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Loader2, MessageCircle, ArrowRight, Shield, Star, MapPin, Globe } from 'lucide-react'

const API_BASE = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

export default function DemoProductLanding() {
  const { productId, demoId: routeDemoId, rubro } = useParams()
  const id = productId || routeDemoId
  const [searchParams] = useSearchParams()
  const [product, setProduct] = useState(null)
  const [demo, setDemo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const startTimeRef = useRef(Date.now())
  const hasTrackedView = useRef(false)

  const negocio = searchParams.get('negocio') || demo?.nombre_negocio || 'Tu negocio'
  const telefono = searchParams.get('telefono') || demo?.telefono_whatsapp || ''
  const leadId = searchParams.get('leadId') || ''

  const trackEngagement = (eventType, data = {}) => {
    fetch(`${API_BASE}/landing/engagement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id, leadId, eventType, data }),
    }).catch(() => {})
  }

  useEffect(() => {
    loadContent()

    const handleBeforeUnload = () => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (seconds > 0) {
        navigator.sendBeacon(`${API_BASE}/landing/engagement`, new Blob([
          JSON.stringify({ productId: id, leadId, eventType: 'time_on_page', data: { seconds } })
        ], { type: 'application/json' }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [id])

  const loadContent = async () => {
    try {
      const productRef = doc(db, 'productos', id)
      const productSnap = await getDoc(productRef)
      if (productSnap.exists()) {
        setProduct({ id: productSnap.id, ...productSnap.data() })
        if (!hasTrackedView.current) {
          hasTrackedView.current = true
          trackEngagement('page_view')
        }
        setLoading(false)
        return
      }

      const demoRef = doc(db, 'demos', id)
      const demoSnap = await getDoc(demoRef)
      if (demoSnap.exists()) {
        setDemo({ id: demoSnap.id, ...demoSnap.data() })
        setLoading(false)
        return
      }

      setError('No encontrado')
    } catch (err) {
      setError('Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  const handleCTAClick = () => {
    trackEngagement('cta_click')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (error || (!product && !demo)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{error || 'No encontrado'}</p>
      </div>
    )
  }

  if (demo) {
    const whatsappUrl = telefono
      ? `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${negocio}, vi tu propuesta en Revendr y me interesa.`)}`
      : '#'

    const rating = demo.calificacion || demo.datos_personalizados?.rating
    const website = demo.datos_personalizados?.website || demo.website
    const address = demo.direccion || demo.datos_personalizados?.address
    const reviewsCount = demo.datos_personalizados?.reviewsCount

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
          <div className="max-w-xl w-full text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-brand-500/30 bg-brand-500/15">
              <span className="text-sm text-brand-400">
                {demo.rubro || 'Propuesta personalizada'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              {negocio}
            </h1>

            <p className="text-lg text-gray-400 mb-8">
              Te preparamos una propuesta especial para potenciar tu negocio
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {rating && (
                <div className="flex items-center gap-1 text-amber-400 text-sm bg-amber-400/10 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {rating}
                  {reviewsCount && <span className="text-amber-400/60">({reviewsCount})</span>}
                </div>
              )}
              {address && (
                <div className="flex items-center gap-1 text-gray-400 text-sm bg-gray-800/50 px-3 py-1.5 rounded-full">
                  <MapPin className="w-4 h-4" />
                  {address}
                </div>
              )}
              {website && (
                <div className="flex items-center gap-1 text-gray-400 text-sm bg-gray-800/50 px-3 py-1.5 rounded-full">
                  <Globe className="w-4 h-4" />
                  {website}
                </div>
              )}
            </div>

            {demo.descripcion_propuesta && (
              <div className="mb-10 text-left bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <p className="text-gray-300 leading-relaxed">
                  {demo.descripcion_propuesta}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {telefono && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEngagement('whatsapp_click')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  Quiero saber más
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/50 py-6 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Generado con Revendr — {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    )
  }

  const whatsappUrl = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hola, me interesa ${product.nombre} para mi negocio.`
  )}`
  const productUrl = product.url_producto || product.url_demo

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border"
               style={{ 
                 backgroundColor: `${product.landing_color || '#6366f1'}15`,
                 borderColor: `${product.landing_color || '#6366f1'}30`
               }}>
            <span className="text-sm" style={{ color: product.landing_color || '#6366f1' }}>
              Propuesta para {negocio}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            {product.landing_titulo || product.nombre}
          </h1>

          {(product.landing_descripcion || product.descripcion) && (
            <p className="text-lg text-gray-400 mb-10 leading-relaxed">
              {product.landing_descripcion || product.descripcion}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCTAClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-semibold rounded-xl transition-all"
                style={{ backgroundColor: product.landing_color || '#6366f1' }}
              >
                {product.landing_cta || 'Ver Demo'}
                <ArrowRight className="w-5 h-5" />
              </a>
            ) : null}

            {telefono && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEngagement('whatsapp_click')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800/50 py-6 px-4">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Producto verificado</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" target="_blank" className="hover:text-gray-300 transition-colors">
              Privacidad
            </a>
            <a href="/terms" target="_blank" className="hover:text-gray-300 transition-colors">
              Términos
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
