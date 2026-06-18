import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import {
  Zap,
  Building2,
  Target,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'welcome', icon: Zap },
  { id: 'business', icon: Building2 },
  { id: 'niche', icon: Target },
  { id: 'channels', icon: MessageCircle },
  { id: 'ready', icon: Check },
]

const NICHES = [
  { id: 'inmobiliaria', nameEs: 'Inmobiliarias', nameEn: 'Real Estate', emoji: '🏠' },
  { id: 'estetica', nameEs: 'Estética / Peluquería', nameEn: 'Beauty / Salon', emoji: '💇' },
  { id: 'clinica', nameEs: 'Clínicas Médicas', nameEn: 'Medical Clinics', emoji: '🏥' },
  { id: 'restaurante', nameEs: 'Restaurantes', nameEn: 'Restaurants', emoji: '🍽️' },
  { id: 'gimnasio', nameEs: 'Gimnasios', nameEn: 'Gyms', emoji: '💪' },
  { id: 'tecnologia', nameEs: 'Tecnología / SaaS', nameEn: 'Technology / SaaS', emoji: '💻' },
  { id: 'agencia_marketing', nameEs: 'Agencias de Marketing', nameEn: 'Marketing Agencies', emoji: '📢' },
  { id: 'desarrolladores', nameEs: 'Desarrolladores / Freelancers', nameEn: 'Developers / Freelancers', emoji: '👨‍💻' },
  { id: 'otro', nameEs: 'Otro', nameEn: 'Other', emoji: '🔧' },
]

export default function Onboarding() {
  const { user, adminData, loading: authLoading } = useAuth()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!authLoading && adminData?.onboarding_completed) {
      navigate('/dashboard', { replace: true })
    }
  }, [adminData, authLoading, navigate])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    businessName: '',
    businessCity: '',
    selectedNiches: [],
    channels: { whatsapp: true, email: true },
  })

  const handleNext = () => {
    if (step === 1 && !data.businessName) {
      toast.error(locale === 'es' ? 'Ingresá el nombre de tu empresa' : 'Enter your business name')
      return
    }
    if (step === 2 && data.selectedNiches.length === 0) {
      toast.error(locale === 'es' ? 'Seleccioná al menos un rubro' : 'Select at least one niche')
      return
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const payload = {
        onboarding_completed: true,
        onboarding_data: data,
        fecha_onboarding: new Date(),
      }
      await Promise.allSettled([
        setDoc(doc(db, 'usuarios_admin', user.uid), payload, { merge: true }),
        setDoc(doc(db, 'usuarios', user.uid), payload, { merge: true }),
      ])
      toast.success(locale === 'es' ? '¡Listo! Tu panel está preparado' : 'Done! Your panel is ready')
      navigate('/dashboard')
    } catch (error) {
      toast.error(locale === 'es' ? 'Error al guardar' : 'Error saving')
    } finally {
      setLoading(false)
    }
  }

  const toggleNiche = (nicheId) => {
    setData(prev => ({
      ...prev,
      selectedNiches: prev.selectedNiches.includes(nicheId)
        ? prev.selectedNiches.filter(n => n !== nicheId)
        : [...prev.selectedNiches, nicheId],
    }))
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                i <= step ? 'bg-brand-500 text-white' : 'bg-dark-800 text-dark-400'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-500' : 'bg-dark-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step: Welcome */}
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <Zap className="w-8 h-8 text-brand-400" />
              </div>
              <h1 className="text-2xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? '¡Bienvenido a Revendr!' : 'Welcome to Revendr!'}
              </h1>
              <p className="text-dark-400 mb-6">
                {locale === 'es'
                  ? 'Vamos a configurar tu cuenta en 4 pasos simples. Te tomará menos de 2 minutos.'
                  : 'Let\'s set up your account in 4 simple steps. It will take less than 2 minutes.'}
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: '🔍', text: locale === 'es' ? 'Scraping de leads' : 'Lead scraping' },
                  { icon: '🎯', text: locale === 'es' ? 'Demos personalizadas' : 'Personalized demos' },
                  { icon: '📱', text: locale === 'es' ? 'WhatsApp + Email' : 'WhatsApp + Email' },
                  { icon: '📊', text: locale === 'es' ? 'Analytics en tiempo real' : 'Real-time analytics' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-dark-900 rounded-lg">
                    <span>{item.icon}</span>
                    <span className="text-sm text-dark-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Business Info */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? 'Sobre tu empresa' : 'About your business'}
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                {locale === 'es' ? 'Esto nos ayuda a personalizar tu experiencia.' : 'This helps us personalize your experience.'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Nombre de tu empresa / marca' : 'Your business / brand name'}
                  </label>
                  <input
                    type="text"
                    value={data.businessName}
                    onChange={(e) => setData({...data, businessName: e.target.value})}
                    className="input-field w-full"
                    placeholder={locale === 'es' ? 'Mi Empresa SRL' : 'My Company LLC'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {locale === 'es' ? 'Ciudad principal (opcional)' : 'Main city (optional)'}
                  </label>
                  <input
                    type="text"
                    value={data.businessCity}
                    onChange={(e) => setData({...data, businessCity: e.target.value})}
                    className="input-field w-full"
                    placeholder={locale === 'es' ? 'Buenos Aires' : 'New York'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Niche */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? '¿Qué rubros te interesan?' : 'Which niches interest you?'}
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                {locale === 'es' ? 'Seleccioná uno o más rubros. Podés cambiar esto después.' : 'Select one or more niches. You can change this later.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {NICHES.map((niche) => (
                  <button
                    key={niche.id}
                    onClick={() => toggleNiche(niche.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      data.selectedNiches.includes(niche.id)
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{niche.emoji}</span>
                    <span className="text-sm font-medium text-dark-100">
                      {locale === 'es' ? niche.nameEs : niche.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Channels */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? 'Canales de contacto' : 'Contact channels'}
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                {locale === 'es' ? 'Elegí por dónde querés contactar a tus leads.' : 'Choose how you want to reach your leads.'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setData({...data, channels: {...data.channels, whatsapp: !data.channels.whatsapp}})}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    data.channels.whatsapp ? 'border-emerald-500 bg-emerald-500/10' : 'border-dark-700 bg-dark-800'
                  }`}
                >
                  <span className="text-2xl">💬</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-dark-100">WhatsApp</div>
                    <div className="text-xs text-dark-400">
                      {locale === 'es' ? 'Mensajes directos con demo link' : 'Direct messages with demo link'}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    data.channels.whatsapp ? 'border-emerald-500 bg-emerald-500' : 'border-dark-600'
                  }`}>
                    {data.channels.whatsapp && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setData({...data, channels: {...data.channels, email: !data.channels.email}})}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    data.channels.email ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700 bg-dark-800'
                  }`}
                >
                  <span className="text-2xl">📧</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-dark-100">Email</div>
                    <div className="text-xs text-dark-400">
                      {locale === 'es' ? 'Secuencias automatizadas de nurturing' : 'Automated nurturing sequences'}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    data.channels.email ? 'border-blue-500 bg-blue-500' : 'border-dark-600'
                  }`}>
                    {data.channels.email && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Ready */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-dark-50 mb-2">
                {locale === 'es' ? '¡Todo listo!' : 'All set!'}
              </h1>
              <p className="text-dark-400 mb-6">
                {locale === 'es'
                  ? 'Tu panel está configurado. Podés empezar a crear campañas ahora mismo.'
                  : 'Your panel is set up. You can start creating campaigns right now.'}
              </p>
              <div className="bg-dark-900 rounded-lg p-4 text-left mb-6">
                <h3 className="text-sm font-medium text-dark-300 mb-2">
                  {locale === 'es' ? 'Próximos pasos:' : 'Next steps:'}
                </h3>
                <ul className="space-y-2 text-sm text-dark-200">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-400">1</span>
                    {locale === 'es' ? 'Creá tu primer producto' : 'Create your first product'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-400">2</span>
                    {locale === 'es' ? 'Configurá una campaña de scraping' : 'Set up a scraping campaign'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-400">3</span>
                    {locale === 'es' ? 'Generá demos y enviá WhatsApp' : 'Generate demos and send WhatsApp'}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {locale === 'es' ? 'Atrás' : 'Back'}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {locale === 'es' ? 'Continuar' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {locale === 'es' ? 'Ir al panel' : 'Go to panel'}
              </button>
            )}
          </div>

          {step > 0 && step < STEPS.length - 1 && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-center text-dark-400 hover:text-dark-200 text-sm mt-4"
            >
              {locale === 'es' ? 'Saltar por ahora' : 'Skip for now'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
