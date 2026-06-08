import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Loader2, MessageCircle, ArrowRight, Shield } from 'lucide-react'

export default function DemoProductLanding() {
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const negocio = searchParams.get('negocio') || 'Tu negocio'
  const telefono = searchParams.get('telefono') || ''

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      const docRef = doc(db, 'productos', productId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() })
        // Track view
        fetch('https://us-central1-revendr-9add8.cloudfunctions.net/api/landing/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        }).catch(() => {})
      } else {
        setError('Producto no encontrado')
      }
    } catch (err) {
      setError('Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  const whatsappUrl = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hola, me interesa ${product.nombre} para mi negocio.`
  )}`

  const productUrl = product.url_producto || product.url_demo

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Hero limpio */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center">
          {/* Badge personalizado */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border"
               style={{ 
                 backgroundColor: `${product.landing_color || '#6366f1'}15`,
                 borderColor: `${product.landing_color || '#6366f1'}30`
               }}>
            <span className="text-sm" style={{ color: product.landing_color || '#6366f1' }}>
              Propuesta para {negocio}
            </span>
          </div>

          {/* Título */}
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            {product.landing_titulo || product.nombre}
          </h1>

          {/* Descripción */}
          {(product.landing_descripcion || product.descripcion) && (
            <p className="text-lg text-gray-400 mb-10 leading-relaxed">
              {product.landing_descripcion || product.descripcion}
            </p>
          )}

          {/* CTA principal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-semibold rounded-xl transition-all"
              style={{ backgroundColor: product.landing_color || '#6366f1' }}
            >
              {product.landing_cta || 'Ver Demo'}
              <ArrowRight className="w-5 h-5" />
            </a>

            {telefono && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer minimalista - genera confianza */}
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
