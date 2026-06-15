import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import {
  Sparkles,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Loader2,
  Copy,
  Check,
  Send,
  Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CONTENT_TYPES = [
  { id: 'launch', label: 'Lanzamiento', emoji: '🚀', description: 'Anuncio de lanzamiento' },
  { id: 'feature', label: 'Función', emoji: '✨', description: 'Destacar una función' },
  { id: 'testimonial', label: 'Testimonio', emoji: '💬', description: 'Testimonio de cliente' },
  { id: 'promo', label: 'Promoción', emoji: '🎉', description: 'Oferta o descuento' },
]

const PLATFORMS = [
  { id: 'twitter', label: 'Twitter', icon: Twitter, maxChars: 280, color: 'text-sky-400' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, maxChars: 2200, color: 'text-pink-400' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, maxChars: 3000, color: 'text-blue-400' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, maxChars: 63206, color: 'text-indigo-400' },
]

export default function ContentGenerator() {
  const { locale } = useI18n()
  const [contentType, setContentType] = useState('launch')
  const [productName, setProductName] = useState('')

  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('twitter')
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const generate = async () => {
    if (!productName.trim()) {
      toast.error(locale === 'es' ? 'Ingresá el nombre del producto' : 'Enter product name')
      return
    }
    setGenerating(true)
    setGenerated(null)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/content/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: contentType,
            customParams: {
              producto: productName,
              descripcion: description || `${productName} — plataforma SaaS`,
            },
            platform,
          }),
        }
      ).then(r => r.json())
      if (result.success) {
        setGenerated(result.data)
      } else {
        toast.error(locale === 'es' ? 'Error generando' : 'Error generating')
      }
    } catch (error) {
      toast.error(locale === 'es' ? 'Error de red' : 'Network error')
    } finally {
      setGenerating(false)
    }
  }

  const copyText = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
    toast.success(locale === 'es' ? 'Copiado' : 'Copied')
  }

  const getCharCount = (text) => {
    const platformInfo = PLATFORMS.find(p => p.id === platform)
    return `${text.length}/${platformInfo.maxChars}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-brand-400" />
          {locale === 'es' ? 'Generador de Contenido IA' : 'AI Content Generator'}
        </h1>
        <p className="text-dark-400 mt-1">
          {locale === 'es' ? 'Generá contenido para redes sociales automáticamente' : 'Generate social media content automatically'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1">
          <div className="card space-y-4">
            <h3 className="text-sm font-medium text-dark-300">{locale === 'es' ? 'Configuración' : 'Settings'}</h3>

            <div>
              <label className="block text-xs text-dark-400 mb-1">{locale === 'es' ? 'Tipo de contenido' : 'Content type'}</label>
              <div className="space-y-2">
                {CONTENT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-all ${
                      contentType === type.id
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    <span className="mr-2">{type.emoji}</span> {type.label}
                    <span className="block text-xs text-dark-500 mt-0.5 ml-6">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-dark-400 mb-1">{locale === 'es' ? 'Producto' : 'Product'}</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="Ej: Revendr"
              />
            </div>

            <div>
              <label className="block text-xs text-dark-400 mb-1">
                {locale === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full text-sm h-20"
                placeholder={locale === 'es' ? 'Describí el producto o servicio...' : 'Describe the product or service...'}
              />
            </div>

            <div>
              <label className="block text-xs text-dark-400 mb-2">{locale === 'es' ? 'Plataforma' : 'Platform'}</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const Icon = p.icon
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                        platform === p.id
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${p.color}`} /> {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {locale === 'es' ? 'Generar' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {generated ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-dark-300">
                  {locale === 'es' ? 'Variaciones generadas' : 'Generated variations'}
                </h3>
                <span className="text-xs text-dark-500">
                  {generated.variations.length} {locale === 'es' ? 'variantes' : 'variations'}
                </span>
              </div>
              {generated.variations.map((variation, index) => (
                <div key={index} className="card group hover:border-brand-500/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-dark-500">Variante {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${variation.charCount > PLATFORMS.find(p => p.id === platform)?.maxChars ? 'text-red-400' : 'text-emerald-400'}`}>
                        {variation.charCount} chars
                      </span>
                      <button
                        onClick={() => copyText(variation.text, index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-400 hover:text-brand-400"
                      >
                        {copied === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      {editingIndex !== index && (
                        <button
                          onClick={() => { setEditingIndex(index); setEditText(variation.text) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-500 hover:text-dark-300 text-xs"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const newVariations = generated.variations.filter((_, i) => i !== index)
                          setGenerated({ ...generated, variations: newVariations })
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-500 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="input-field w-full text-sm h-20"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1"
                        >
                          {locale === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                          onClick={() => {
                            const newVariations = [...generated.variations]
                            newVariations[index] = { text: editText, charCount: editText.length }
                            setGenerated({ ...generated, variations: newVariations })
                            setEditingIndex(null)
                          }}
                          className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1"
                        >
                          {locale === 'es' ? 'Guardar' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-dark-100 whitespace-pre-wrap leading-relaxed">
                      {variation.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-64 text-center">
              <Sparkles className="w-12 h-12 text-dark-700 mb-3" />
              <p className="text-dark-400 text-sm">
                {locale === 'es' ? 'Seleccioná un tipo de contenido y hacé click en Generar' : 'Select a content type and click Generate'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
