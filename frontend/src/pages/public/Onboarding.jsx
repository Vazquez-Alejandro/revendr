import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import { Zap, Check, ArrowRight, Building2, Sparkles, Globe, Shield } from 'lucide-react'

const stepsEs = [
  {
    step: 1,
    title: 'Creá tu cuenta',
    description: 'Registrate gratis en menos de 30 segundos. Sin tarjeta de crédito.',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'Configurá tu campaña',
    description: 'Elegí el rubro, la ciudad y el mensaje. El sistema se adapta automáticamente.',
    icon: Building2,
  },
  {
    step: 3,
    title: 'Generá leads y demos',
    description: 'El scraper busca negocios y genera demos personalizadas para cada uno.',
    icon: Globe,
  },
  {
    step: 4,
    title: 'Enviá y cobrá',
    description: 'WhatsApp masivo con delays inteligentes. Cobros con Stripe integrados.',
    icon: Shield,
  },
]

const stepsEn = [
  {
    step: 1,
    title: 'Create your account',
    description: 'Sign up free in under 30 seconds. No credit card required.',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'Set up your campaign',
    description: 'Choose the niche, city and message. The system adapts automatically.',
    icon: Building2,
  },
  {
    step: 3,
    title: 'Generate leads & demos',
    description: 'The scraper finds businesses and generates personalized demos for each.',
    icon: Globe,
  },
  {
    step: 4,
    title: 'Send & collect payments',
    description: 'WhatsApp at scale with smart delays. Stripe payments integrated.',
    icon: Shield,
  },
]

export default function Onboarding() {
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
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-50 mb-4">
            {locale === 'es' ? 'Empezá a revender en 4 pasos' : 'Start reselling in 4 steps'}
          </h1>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto">
            {locale === 'es' 
              ? 'Un pipeline completo que funciona solo. Desde el scraping hasta el cobro.'
              : 'A complete pipeline that works on its own. From scraping to payment collection.'}
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={step.step} className="card-hover flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-6 h-6 text-brand-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
                    {locale === 'es' ? 'PASO' : 'STEP'} {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-dark-100 mb-1">{step.title}</h3>
                <p className="text-dark-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link to="/register" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            {locale === 'es' ? 'Empezar Ahora' : 'Get Started Now'}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-dark-500 text-sm mt-4">
            {locale === 'es' 
              ? '14 días gratis • Sin tarjeta de crédito • Cancelá cuando quieras'
              : '14 days free • No credit card • Cancel anytime'}
          </p>
        </div>
      </div>
    </div>
  )
}
