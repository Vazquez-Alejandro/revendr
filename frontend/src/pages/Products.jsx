import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'
import { useI18n } from '../contexts/I18nContext'
import {
  Plus,
  Loader2,
  Package,
  Trash2,
  Edit3,
  ExternalLink,
  Globe,
  MessageCircle,
  Target,
} from 'lucide-react'
import toast from 'react-hot-toast'

const NICHOES = [
  { value: 'inmobiliaria', labelEs: 'Inmobiliarias', labelEn: 'Real Estate' },
  { value: 'estetica', labelEs: 'Estética / Peluquería', labelEn: 'Beauty / Salon' },
  { value: 'clinica', labelEs: 'Clínicas Médicas', labelEn: 'Medical Clinics' },
  { value: 'restaurante', labelEs: 'Restaurantes', labelEn: 'Restaurants' },
  { value: 'gimnasio', labelEs: 'Gimnasios', labelEn: 'Gyms' },
  { value: 'otro', labelEs: 'Otro', labelEn: 'Other' },
]

export default function Products() {
  const { t, locale } = useI18n()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    url_demo: '',
    url_producto: '',
    mensaje_whatsapp: '',
    nicho: '',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) return

      const q = query(
        collection(db, 'productos'),
        where('user_id', '==', userId)
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.fecha_creacion?.seconds || 0) - (a.fecha_creacion?.seconds || 0))
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error(locale === 'es' ? 'Error al cargar productos' : 'Error loading products')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      url_demo: '',
      url_producto: '',
      mensaje_whatsapp: '',
      nicho: '',
      landing_titulo: '',
      landing_descripcion: '',
      landing_color: '#6366f1',
      landing_cta: 'Ver Demo',
    })
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.nombre || !formData.url_demo || !formData.nicho) {
      toast.error(locale === 'es' ? 'Completa nombre, demo y nicho' : 'Fill in name, demo and niche')
      return
    }

    setSaving(true)
    try {
      const userId = auth.currentUser?.uid
      const productData = {
        ...formData,
        user_id: userId,
        fecha_actualizacion: new Date(),
      }

      if (editingId) {
        await updateDoc(doc(db, 'productos', editingId), productData)
        toast.success(locale === 'es' ? 'Producto actualizado' : 'Product updated')
      } else {
        productData.fecha_creacion = new Date()
        await addDoc(collection(db, 'productos'), productData)
        toast.success(locale === 'es' ? 'Producto creado' : 'Product created')
      }

      setShowModal(false)
      resetForm()
      loadProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error(locale === 'es' ? 'Error al guardar' : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product) => {
    setFormData({
      nombre: product.nombre || '',
      descripcion: product.descripcion || '',
      url_demo: product.url_demo || '',
      url_producto: product.url_producto || '',
      mensaje_whatsapp: product.mensaje_whatsapp || '',
      nicho: product.nicho || '',
      landing_titulo: product.landing_titulo || '',
      landing_descripcion: product.landing_descripcion || '',
      landing_color: product.landing_color || '#6366f1',
      landing_cta: product.landing_cta || 'Ver Demo',
    })
    setEditingId(product.id)
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    if (!confirm(locale === 'es' ? '¿Eliminar este producto?' : 'Delete this product?')) return
    try {
      await deleteDoc(doc(db, 'productos', productId))
      toast.success(locale === 'es' ? 'Producto eliminado' : 'Product deleted')
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(locale === 'es' ? 'Error al eliminar' : 'Error deleting')
    }
  }

  const NICHO_LABELS = {
    inmobiliaria: locale === 'es' ? 'Inmobiliarias' : 'Real Estate',
    estetica: locale === 'es' ? 'Estética / Peluquería' : 'Beauty / Salon',
    clinica: locale === 'es' ? 'Clínicas Médicas' : 'Medical Clinics',
    restaurante: locale === 'es' ? 'Restaurantes' : 'Restaurants',
    gimnasio: locale === 'es' ? 'Gimnasios' : 'Gyms',
    otro: locale === 'es' ? 'Otro' : 'Other',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">
            {locale === 'es' ? 'Mis Productos' : 'My Products'}
          </h1>
          <p className="text-dark-400 mt-1">
            {locale === 'es'
              ? 'Cargá tus productos para ofrecerlos automáticamente'
              : 'Add your products to offer them automatically'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {locale === 'es' ? 'Nuevo Producto' : 'New Product'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 mx-auto text-dark-500 mb-4" />
          <h3 className="text-lg font-medium text-dark-200 mb-2">
            {locale === 'es' ? 'No tenés productos cargados' : 'No products yet'}
          </h3>
          <p className="text-dark-400 mb-4">
            {locale === 'es'
              ? 'Cargá tu primer producto para empezar a vender'
              : 'Add your first product to start selling'}
          </p>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="btn-primary"
          >
            {locale === 'es' ? 'Crear Producto' : 'Create Product'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map((product) => (
            <div key={product.id} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-100 mb-1">
                    {product.nombre}
                  </h3>
                  <span className="badge badge-info">
                    {NICHO_LABELS[product.nicho] || product.nicho}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-all"
                    title={locale === 'es' ? 'Editar' : 'Edit'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title={locale === 'es' ? 'Eliminar' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {product.descripcion && (
                <p className="text-sm text-dark-300 mb-3 line-clamp-2">
                  {product.descripcion}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-dark-400 shrink-0" />
                  <a
                    href={product.url_demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 truncate flex items-center gap-1"
                  >
                    {product.url_demo}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                {product.url_producto && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-dark-400 shrink-0" />
                    <a
                      href={product.url_producto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-300 hover:text-dark-200 truncate flex items-center gap-1"
                    >
                      {product.url_producto}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {product.mensaje_whatsapp && (
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-medium text-dark-400">
                      {locale === 'es' ? 'Mensaje de WhatsApp' : 'WhatsApp Message'}
                    </span>
                  </div>
                  <p className="text-xs text-dark-300 line-clamp-3">
                    {product.mensaje_whatsapp}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-100">
                {editingId
                  ? (locale === 'es' ? 'Editar Producto' : 'Edit Product')
                  : (locale === 'es' ? 'Nuevo Producto' : 'New Product')}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="text-dark-400 hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Nombre del Producto' : 'Product Name'} *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Inmoxil, TurnosOnline..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder={locale === 'es' ? 'Qué hace tu producto...' : 'What your product does...'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'URL de la Demo' : 'Demo URL'} *
                </label>
                <input
                  type="url"
                  value={formData.url_demo}
                  onChange={(e) => setFormData({ ...formData, url_demo: e.target.value })}
                  className="input-field"
                  placeholder="https://tu-demo.vercel.app"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es'
                    ? 'Link que verá el lead cuando reciba el mensaje'
                    : 'Link the lead will see when they receive the message'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'URL del Producto (opcional)' : 'Product URL (optional)'}
                </label>
                <input
                  type="url"
                  value={formData.url_producto}
                  onChange={(e) => setFormData({ ...formData, url_producto: e.target.value })}
                  className="input-field"
                  placeholder="https://tu-app.vercel.app"
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es'
                    ? 'Link a tu app o landing page principal'
                    : 'Link to your main app or landing page'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Nicho Objetivo' : 'Target Niche'} *
                </label>
                <select
                  value={formData.nicho}
                  onChange={(e) => setFormData({ ...formData, nicho: e.target.value })}
                  className="select-field"
                  required
                >
                  <option value="">{locale === 'es' ? 'Seleccionar nicho' : 'Select niche'}</option>
                  {NICHOES.map(n => (
                    <option key={n.value} value={n.value}>{locale === 'es' ? n.labelEs : n.labelEn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Mensaje de WhatsApp' : 'WhatsApp Message'}
                </label>
                <textarea
                  value={formData.mensaje_whatsapp}
                  onChange={(e) => setFormData({ ...formData, mensaje_whatsapp: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder={locale === 'es'
                    ? 'Hola {nombre_negocio}, te propongo algo especial para tu negocio. Mirá tu demo personalizada: {url_demo}'
                    : 'Hello {nombre_negocio}, I have something special for your business. Check your personalized demo: {url_demo}'}
                />
                <p className="text-xs text-dark-500 mt-1">
                  {locale === 'es' ? 'Variables:' : 'Variables:'} {'{nombre_negocio}'}, {'{url_demo}'}, {'{rubro}'}
                </p>
              </div>

              {/* Landing Configuration */}
              <div className="border-t border-dark-700 pt-4">
                <h3 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-2">
                  🎨 {locale === 'es' ? 'Configuración de Landing' : 'Landing Configuration'}
                </h3>
                <p className="text-xs text-dark-500 mb-4">
                  {locale === 'es'
                    ? 'Esto es lo que verá el lead cuando haga click en el link'
                    : 'This is what the lead will see when they click the link'}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1">
                      {locale === 'es' ? 'Título de la Landing' : 'Landing Title'}
                    </label>
                    <input
                      type="text"
                      value={formData.landing_titulo}
                      onChange={(e) => setFormData({ ...formData, landing_titulo: e.target.value })}
                      className="input-field"
                      placeholder={locale === 'es' ? 'Ej: Automatizá tu inmobiliaria' : 'E.g.: Automate your real estate'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1">
                      {locale === 'es' ? 'Descripción de la Landing' : 'Landing Description'}
                    </label>
                    <textarea
                      value={formData.landing_descripcion}
                      onChange={(e) => setFormData({ ...formData, landing_descripcion: e.target.value })}
                      className="input-field min-h-[60px]"
                      placeholder={locale === 'es' ? '¿Qué resuelve tu producto?' : 'What does your product solve?'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-dark-400 mb-1">
                        {locale === 'es' ? 'Color Principal' : 'Primary Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.landing_color}
                          onChange={(e) => setFormData({ ...formData, landing_color: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-dark-600 cursor-pointer"
                        />
                        <span className="text-xs text-dark-400">{formData.landing_color}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-dark-400 mb-1">
                        {locale === 'es' ? 'Texto del CTA' : 'CTA Text'}
                      </label>
                      <input
                        type="text"
                        value={formData.landing_cta}
                        onChange={(e) => setFormData({ ...formData, landing_cta: e.target.value })}
                        className="input-field"
                        placeholder="Ver Demo"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {locale === 'es' ? 'Guardando...' : 'Saving...'}
                    </>
                  ) : (
                    t('save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
