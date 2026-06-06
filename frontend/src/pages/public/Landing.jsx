import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import { 
  Zap, 
  Bot, 
  MessageCircle, 
  CreditCard, 
  BarChart3, 
  Shield,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react'

const featuresEs = [
  {
    icon: Bot,
    title: 'Scraping Automatizado',
    description: 'Conectá con Google Maps e Instagram para obtener cientos de leads calificados por rubro y ciudad.',
  },
  {
    icon: Sparkles,
    title: 'Demos Personalizadas',
    description: 'Generá demos únicas para cada lead usando datos reales de su negocio. Sin hacer nada manual.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Masivo',
    description: 'Enviá mensajes personalizados con la demo incluida. Respetamos delays para evitar baneos.',
  },
  {
    icon: CreditCard,
    title: 'Cobros con Stripe',
    description: 'El cliente paga directo desde la demo. Setup automático de su cuenta al confirmar pago.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard en Tiempo Real',
    description: 'Visualizá todo el pipeline: leads → demos → envíos → conversiones. Todo en un solo lugar.',
  },
  {
    icon: Shield,
    title: 'Multi-Rubro',
    description: 'Inmobiliarias, peluquerías, clínicas, restaurantes. Un solo sistema para revender múltiples apps.',
  },
]

const featuresEn = [
  {
    icon: Bot,
    title: 'Automated Scraping',
    description: 'Connect with Google Maps and Instagram to get hundreds of qualified leads per niche and city.',
  },
  {
    icon: Sparkles,
    title: 'Personalized Demos',
    description: 'Generate unique demos for each lead using real business data. Zero manual work.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp at Scale',
    description: 'Send personalized messages with the demo included. Delays to avoid bans.',
  },
  {
    icon: CreditCard,
    title: 'Stripe Payments',
    description: 'Clients pay directly from the demo. Automatic account setup on payment confirmation.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    description: 'Visualize the full pipeline: leads → demos → sends → conversions. All in one place.',
  },
  {
    icon: Shield,
    title: 'Multi-Niche',
    description: 'Real estate, salons, clinics, restaurants. One system to resell multiple apps.',
  },
]

const niches = [
  { nameEs: 'Inmobiliarias', nameEn: 'Real Estate', apps: 'Inmoxil', color: 'from-blue-500 to-blue-700' },
  { nameEs: 'Estética / Peluquería', nameEn: 'Beauty / Salon', apps: 'TurnosPro', color: 'from-pink-500 to-pink-700' },
  { nameEs: 'Clínicas Médicas', nameEn: 'Medical Clinics', apps: 'MediCita', color: 'from-emerald-500 to-emerald-700' },
  { nameEs: 'Restaurantes', nameEn: 'Restaurants', apps: 'MenuDigital', color: 'from-amber-500 to-amber-700' },
  { nameEs: 'Gimnasios', nameEn: 'Gyms', apps: 'FitGym', color: 'from-violet-500 to-violet-700' },
]

const statsEs = [
  { value: '10,000+', label: 'Leads procesados' },
  { value: '500+', label: 'Demos generadas' },
  { value: '95%', label: 'Tasa de entrega' },
  { value: '3x', label: 'Más conversiones' },
]

const statsEn = [
  { value: '10,000+', label: 'Leads processed' },
  { value: '500+', label: 'Demos generated' },
  { value: '95%', label: 'Delivery rate' },
  { value: '3x', label: 'More conversions' },
]

export default function Landing() {
  const { t, locale } = useI18n()
  const features = locale === 'es' ? featuresEs : featuresEn
  const stats = locale === 'es' ? statsEs : statsEn

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navbar */}
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-dark-50">Revendr</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-dark-400 hover:text-dark-200 transition-colors">
              {t('login')}
            </Link>
            <Link to="/register" className="btn-primary">
              {t('landing.getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-600/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {locale === 'es' ? 'Automatización B2B Inteligente' : 'Smart B2B Automation'}
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-dark-50 leading-tight mb-6">
              {t('landing.title')}
            </h1>
            <p className="text-xl text-dark-400 mb-8 max-w-2xl mx-auto">
              {t('landing.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-lg px-8 py-3 flex items-center gap-2">
                {t('landing.getStarted')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="btn-secondary text-lg px-8 py-3">
                {t('landing.seeFeatures')}
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-dark-50">{stat.value}</div>
                <div className="text-sm text-dark-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
              {t('landing.features')}
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              {t('landing.featuresDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="card-hover group">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Niches */}
      <section className="py-24 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
              {t('landing.multiNiche')}
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              {t('landing.multiNicheDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {niches.map((niche) => (
              <div key={niche.nameEs} className="card-hover text-center group">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${niche.color} flex items-center justify-center mb-4`}>
                  <span className="text-2xl font-bold text-white">{(locale === 'es' ? niche.nameEs : niche.nameEn)[0]}</span>
                </div>
                <h3 className="font-semibold text-dark-100 mb-1">{locale === 'es' ? niche.nameEs : niche.nameEn}</h3>
                <p className="text-xs text-dark-400">{niche.apps}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-dark-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-6">
            {t('landing.cta')}
          </h2>
          <p className="text-dark-400 text-lg mb-8">
            {t('landing.ctaDesc')}
          </p>
          <Link to="/register" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            {t('landing.getStarted')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-dark-100">Revendr</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-dark-400">
              <Link to="/help" className="hover:text-dark-200 transition-colors">
                {locale === 'es' ? 'Ayuda' : 'Help'}
              </Link>
              <Link to="/privacy" className="hover:text-dark-200 transition-colors">
                {locale === 'es' ? 'Privacidad' : 'Privacy'}
              </Link>
              <Link to="/terms" className="hover:text-dark-200 transition-colors">
                {locale === 'es' ? 'Términos' : 'Terms'}
              </Link>
            </div>
            <p className="text-dark-500 text-sm">
              © 2024 Revendr. {locale === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
