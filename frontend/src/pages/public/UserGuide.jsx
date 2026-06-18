import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import {
  Zap, ArrowLeft, Package, Target, MessageSquare, BarChart3,
  Users, Settings, CreditCard, ChevronRight, Check
} from 'lucide-react'

const stepsEs = [
  {
    icon: Package,
    title: 'Paso 1: Creá tu producto',
    path: '/dashboard/productos',
    description: 'Andá a Productos → Nuevo Producto. Poné el nombre de tu empresa, la URL de tu propuesta, elegí el rubro y configurá la landing personalizada.',
    details: [
      'Nombre: el nombre de tu empresa o servicio',
      'URL: link a tu app o landing principal',
      'Rubro: a quién le vendés (ej: agencias de marketing)',
      'Landing: título, descripción, color y botón CTA',
    ],
    tip: 'El color de la landing se usa en la propuesta personalizada que ven tus prospectos.',
  },
  {
    icon: Target,
    title: 'Paso 2: Creá una campaña',
    path: '/dashboard/campanias',
    description: 'Andá a Campañas → Nueva Campañas. Elegí el producto, la ciudad y el rubro de los negocios que querés encontrar.',
    details: [
      'Producto: seleccioná el producto que creaste en el paso 1',
      'Ciudad: dónde querés buscar (ej: Buenos Aires)',
      'Rubro: qué tipo de negocio (ej: restaurantes, agencias)',
      'Mensaje: personalizá el mensaje que se enviará',
    ],
    tip: 'Empezá con una ciudad chica para probar, después expandí.',
  },
  {
    icon: BarChart3,
    title: 'Paso 3: Hacé el scraping',
    path: '/dashboard/campanias',
    description: 'Dentro de la campaña, hacé click en "Iniciar Scraping". La app busca negocios en Google Maps automáticamente.',
    details: [
      'El scraping tarda entre 5-30 minutos dependiendo de la cantidad',
      'Encontrás nombre, dirección, teléfono, email, web de cada negocio',
      'Los leads se guardan automáticamente en Firestore',
      'Podés ver el progreso en tiempo real',
    ],
    tip: 'No cierres la página mientras scraping. Podés hacer otras cosas en la app.',
  },
  {
    icon: Zap,
    title: 'Paso 4: Generá propuestas',
    path: '/dashboard/campanias',
    description: 'Una vez que tenés leads, generá las propuestas personalizadas. Cada negocio recibe una landing con su nombre y datos.',
    details: [
      'Click en "Generar Props." dentro de la campaña',
      'Cada lead recibe una URL única tipo /demo/producto/:id',
      'La landing muestra el nombre del negocio, dirección y fotos',
      'Se registra cuando el lead abre la landing',
    ],
    tip: 'Las propuestas se generan en batch. Si tenés 100 leads, las genera todas juntas.',
  },
  {
    icon: MessageSquare,
    title: 'Paso 5: Enviá mensajes',
    path: '/dashboard/campanias',
    description: 'Mandá emails o WhatsApp a los leads con el link a su propuesta personalizada.',
    details: [
      'Email: se envía automáticamente con Resend',
      'WhatsApp: necesitás token de Meta Business (ver paso 6)',
      'Los mensajes se personalizan con el nombre del negocio',
      'Hay rate limiting para evitar baneos',
    ],
    tip: 'Empezá con email. WhatsApp es más efectivo pero requiere configuración.',
  },
  {
    icon: Users,
    title: 'Paso 6: Seguí los leads',
    path: '/dashboard/leads',
    description: 'Andá a Leads para ver quién abrió tu mensaje, quién vio la propuesta y quién está interesado.',
    details: [
      'Score: cada lead tiene un puntaje de 0-100 según su engagement',
      'Temperature: Frío → Tibio → Caliente según el score',
      'Email tracking: sabés quién abrió el email',
      'Landing tracking: sabés cuánto tiempo estuvo en la landing',
    ],
    tip: 'Concentrá tu tiempo en los leads "Calientes" (score > 70).',
  },
  {
    icon: BarChart3,
    title: 'Paso 7: Usá el CRM',
    path: '/dashboard/crm',
    description: 'El CRM te ayuda a organizar tus leads por etapas: Prospecto → Contactado → Interesado → Cerrado.',
    details: [
      'Drag and drop: mové leads entre columnas',
      'Notas: agregá información sobre cada lead',
      'Timeline: historial de actividad',
      'Quick actions: llamar, email, WhatsApp',
    ],
    tip: 'Actualizá el CRM después de cada interacción para no perder el seguimiento.',
  },
  {
    icon: Settings,
    title: 'Paso 8: Configurá tu cuenta',
    path: '/dashboard/settings',
    description: 'Activá las integraciones que necesitás: WhatsApp, Stripe, email.',
    details: [
      'Stripe: para cobrar a tus clientes (ver paso 9)',
      'WhatsApp API: para enviar mensajes automáticos',
      'Email: ya viene configurado con Resend',
      'API Keys: para conectarte con otras herramientas',
    ],
    tip: 'Podés empezar sin WhatsApp. El email funciona perfecto para arrancar.',
  },
  {
    icon: CreditCard,
    title: 'Paso 9: Activá los pagos',
    path: '/dashboard/subscription',
    description: 'Si querés vender Revendr como SaaS, activá Stripe Live para cobrar suscripciones.',
    details: [
      'Andá a Subscription → Cambiar plan',
      'Elegí el plan que mejor se ajuste a vos',
      'Stripe te cobra una comisión por cada transacción',
      'Los pagos se procesan automáticamente',
    ],
    tip: 'Activá Stripe Live solo cuando tengas clientes confirmados.',
  },
]

const stepsEn = [
  {
    icon: Package,
    title: 'Step 1: Create your product',
    path: '/dashboard/productos',
    description: 'Go to Products → New Product. Enter your company name, proposal URL, select the niche and configure the personalized landing.',
    details: [
      'Name: your company or service name',
      'URL: link to your main app or landing',
      'Niche: who you sell to (e.g., marketing agencies)',
      'Landing: title, description, color and CTA button',
    ],
    tip: 'The landing color is used in the personalized proposal your prospects see.',
  },
  {
    icon: Target,
    title: 'Step 2: Create a campaign',
    path: '/dashboard/campanias',
    description: 'Go to Campaigns → New Campaign. Select the product, city and niche of businesses you want to find.',
    details: [
      'Product: select the product you created in step 1',
      'City: where you want to search (e.g., Buenos Aires)',
      'Niche: what type of business (e.g., restaurants, agencies)',
      'Message: customize the message that will be sent',
    ],
    tip: 'Start with a small city to test, then expand.',
  },
  {
    icon: BarChart3,
    title: 'Step 3: Run scraping',
    path: '/dashboard/campanias',
    description: 'Inside the campaign, click "Start Scraping". The app searches for businesses on Google Maps automatically.',
    details: [
      'Scraping takes 5-30 minutes depending on quantity',
      'You get name, address, phone, email, website for each business',
      'Leads are automatically saved to Firestore',
      'You can see progress in real time',
    ],
    tip: "Don't close the page while scraping. You can do other things in the app.",
  },
  {
    icon: Zap,
    title: 'Step 4: Generate proposals',
    path: '/dashboard/campanias',
    description: 'Once you have leads, generate personalized proposals. Each business gets a landing with their name and data.',
    details: [
      'Click "Generate Props." inside the campaign',
      'Each lead gets a unique URL like /demo/producto/:id',
      'The landing shows the business name, address and photos',
      'It records when the lead opens the landing',
    ],
    tip: 'Proposals are generated in batch. If you have 100 leads, they all generate together.',
  },
  {
    icon: MessageSquare,
    title: 'Step 5: Send messages',
    path: '/dashboard/campanias',
    description: 'Send emails or WhatsApp to leads with the link to their personalized proposal.',
    details: [
      'Email: sent automatically with Resend',
      'WhatsApp: requires Meta Business token (see step 6)',
      'Messages are personalized with the business name',
      'There is rate limiting to avoid bans',
    ],
    tip: 'Start with email. WhatsApp is more effective but requires configuration.',
  },
  {
    icon: Users,
    title: 'Step 6: Track leads',
    path: '/dashboard/leads',
    description: 'Go to Leads to see who opened your message, who viewed the proposal and who is interested.',
    details: [
      'Score: each lead has a 0-100 score based on engagement',
      'Temperature: Cold → Warm → Hot based on score',
      'Email tracking: you know who opened the email',
      'Landing tracking: you know how long they stayed on the landing',
    ],
    tip: 'Focus your time on "Hot" leads (score > 70).',
  },
  {
    icon: BarChart3,
    title: 'Step 7: Use the CRM',
    path: '/dashboard/crm',
    description: 'The CRM helps you organize leads by stages: Prospect → Contacted → Interested → Closed.',
    details: [
      'Drag and drop: move leads between columns',
      'Notes: add information about each lead',
      'Timeline: activity history',
      'Quick actions: call, email, WhatsApp',
    ],
    tip: 'Update the CRM after each interaction to not lose track.',
  },
  {
    icon: Settings,
    title: 'Step 8: Configure your account',
    path: '/dashboard/settings',
    description: 'Activate the integrations you need: WhatsApp, Stripe, email.',
    details: [
      'Stripe: to charge your clients (see step 9)',
      'WhatsApp API: to send automatic messages',
      'Email: already configured with Resend',
      'API Keys: to connect with other tools',
    ],
    tip: 'You can start without WhatsApp. Email works perfectly to begin.',
  },
  {
    icon: CreditCard,
    title: 'Step 9: Activate payments',
    path: '/dashboard/subscription',
    description: 'If you want to sell Revendr as SaaS, activate Stripe Live to charge subscriptions.',
    details: [
      'Go to Subscription → Change plan',
      'Choose the plan that best fits you',
      'Stripe charges a fee per transaction',
      'Payments are processed automatically',
    ],
    tip: 'Only activate Stripe Live when you have confirmed clients.',
  },
]

export default function UserGuide() {
  const { locale } = useI18n()
  const steps = locale === 'es' ? stepsEs : stepsEn

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
            {locale === 'es' ? 'Guía de Usuario' : 'User Guide'}
          </h1>
          <p className="text-dark-400 text-lg">
            {locale === 'es'
              ? 'Paso a paso para empezar a usar Revendr.'
              : 'Step by step to start using Revendr.'}
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-dark-100 mb-2">{step.title}</h2>
                    <p className="text-dark-400 mb-4">{step.description}</p>

                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-dark-300">
                          <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-2 p-3 bg-brand-500/5 border border-brand-500/10 rounded-lg">
                      <span className="text-brand-400 text-sm font-medium">
                        {locale === 'es' ? 'Tip:' : 'Tip:'}
                      </span>
                      <span className="text-dark-300 text-sm">{step.tip}</span>
                    </div>

                    <Link
                      to={step.path}
                      className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 text-sm mt-4"
                    >
                      {locale === 'es' ? 'Ir ahora' : 'Go now'}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Link to="/help" className="btn-primary inline-flex items-center gap-2">
            {locale === 'es' ? '¿Necesitás ayuda?' : 'Need help?'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
