import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import { 
  Zap, 
  ArrowLeft, 
  Mail, 
  MessageCircle, 
  FileText, 
  ExternalLink,
  BookOpen,
  Video,
  HelpCircle
} from 'lucide-react'

const faqEs = [
  {
    q: '¿Cómo creo mi primera campaña?',
    a: 'Ve a Campañas → Nueva Campaña. Elegí el rubro, la ciudad y el mensaje template. El sistema empezará a buscar leads automáticamente.',
  },
  {
    q: '¿Cómo funciona el scraping de leads?',
    a: 'Usamos Apify para extraer negocios de Google Maps e Instagram. Configurá tu API key en Settings → API Keys.',
  },
  {
    q: '¿Cómo genero demos personalizadas?',
    a: 'Una vez que tenés leads, el sistema genera automáticamente demos personalizadas para cada negocio usando sus datos reales.',
  },
  {
    q: '¿Cómo envío mensajes por WhatsApp?',
    a: 'Configurá tu token de WhatsApp Business en Settings → API Keys. El sistema enviará mensajes con delays automáticos para evitar baneos.',
  },
  {
    q: '¿Cómo cobro a mis clientes?',
    a: 'Configurá tu cuenta de Stripe en Settings → API Keys. Los clientes pagan directamente desde la demo con tarjeta de crédito.',
  },
  {
    q: '¿Puedo probar gratis?',
    a: 'Sí, todos los planes incluyen 14 días de prueba gratis. Sin compromiso, cancelá cuando quieras.',
  },
]

const faqEn = [
  {
    q: 'How do I create my first campaign?',
    a: 'Go to Campaigns → New Campaign. Select the niche, city and message template. The system will start searching for leads automatically.',
  },
  {
    q: 'How does lead scraping work?',
    a: 'We use Apify to extract businesses from Google Maps and Instagram. Set up your API key in Settings → API Keys.',
  },
  {
    q: 'How do I generate personalized demos?',
    a: 'Once you have leads, the system automatically generates personalized demos for each business using their real data.',
  },
  {
    q: 'How do I send WhatsApp messages?',
    a: 'Set up your WhatsApp Business token in Settings → API Keys. The system will send messages with automatic delays to avoid bans.',
  },
  {
    q: 'How do I charge my clients?',
    a: 'Set up your Stripe account in Settings → API Keys. Clients pay directly from the demo with credit card.',
  },
  {
    q: 'Can I try for free?',
    a: 'Yes, all plans include a 14-day free trial. No commitment, cancel anytime.',
  },
]

export default function Help() {
  const { locale } = useI18n()
  const faq = locale === 'es' ? faqEs : faqEn

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-50 mb-4">
            {locale === 'es' ? 'Centro de Ayuda' : 'Help Center'}
          </h1>
          <p className="text-dark-400 text-lg">
            {locale === 'es' 
              ? 'Encontrá respuestas a tus preguntas o contactanos directamente.'
              : 'Find answers to your questions or contact us directly.'}
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <a
            href="mailto:hola@revendr.app"
            className="card-hover flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-dark-100">
                {locale === 'es' ? 'Email' : 'Email'}
              </h3>
              <p className="text-sm text-dark-400">hola@revendr.app</p>
            </div>
          </a>

          <a
            href="https://wa.me/5491112345678"
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-dark-100">
                {locale === 'es' ? 'WhatsApp' : 'WhatsApp'}
              </h3>
              <p className="text-sm text-dark-400">{locale === 'es' ? 'Soporte directo' : 'Direct support'}</p>
            </div>
          </a>

          <a
            href="https://docs.revendr.app"
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-dark-100">
                {locale === 'es' ? 'Documentación' : 'Documentation'}
              </h3>
              <p className="text-sm text-dark-400">docs.revendr.app</p>
            </div>
          </a>
        </div>

        {/* Quick Links */}
        <div className="card mb-12">
          <h2 className="text-xl font-semibold text-dark-100 mb-4">
            {locale === 'es' ? 'Enlaces Rápidos' : 'Quick Links'}
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: locale === 'es' ? 'Guía de inicio rápido' : 'Quick start guide', href: '/docs/quickstart' },
              { label: locale === 'es' ? 'Configurar API keys' : 'Set up API keys', href: '/dashboard/settings' },
              { label: locale === 'es' ? 'Templates de WhatsApp' : 'WhatsApp templates', href: '/docs/whatsapp' },
              { label: locale === 'es' ? 'Integración con Stripe' : 'Stripe integration', href: '/docs/stripe' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-semibold text-dark-100 mb-6">
            {locale === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <details key={i} className="card group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    <h3 className="font-medium text-dark-100">{item.q}</h3>
                  </div>
                  <span className="text-dark-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="text-dark-400 mt-4 pl-8">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
