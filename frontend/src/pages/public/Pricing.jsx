import { useState } from 'react'
import { Check, Zap, Building2, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { createCheckoutSession, PRICES } from '../../services/stripe'

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Para empezar a revender',
    features: [
      '100 leads/mes',
      '1 rubro activo',
      '50 demos generadas',
      '1,000 mensajes WhatsApp',
      'Soporte por email',
    ],
    icon: Zap,
    popular: false,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 149,
    description: 'Para escalar rápido',
    features: [
      '1,000 leads/mes',
      '3 rubros activos',
      '500 demos generadas',
      '10,000 mensajes WhatsApp',
      'Integración con Stripe',
      'Soporte prioritario',
    ],
    icon: Building2,
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 399,
    description: 'Para operaciones grandes',
    features: [
      'Leads ilimitados',
      'Rubros ilimitados',
      'Demos ilimitadas',
      'Mensajes ilimitados',
      'API completa',
      'Soporte dedicado',
      'Custom branding',
    ],
    icon: Sparkles,
    popular: false,
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handleCheckout = async (planKey) => {
    setLoadingPlan(planKey)
    try {
      const priceId = annual ? PRICES[planKey].annual : PRICES[planKey].monthly
      await createCheckoutSession(priceId)
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Error al procesar el pago. Intentá de nuevo.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-50 mb-4">
            Planes que crecen con vos
          </h1>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto mb-8">
            Elegí el plan que mejor se adapte a tu operación. Todos incluyen 14 días gratis.
          </p>

          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${!annual ? 'text-dark-100' : 'text-dark-400'}`}>Mensual</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-brand-600' : 'bg-dark-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-dark-100' : 'text-dark-400'}`}>
              Anual <span className="text-emerald-400 font-medium">-20%</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative card flex flex-col ${plan.popular ? 'border-brand-500 bg-dark-800/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MÁS POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-12 h-12 mx-auto rounded-xl ${plan.popular ? 'bg-brand-500/20' : 'bg-dark-700'} flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-brand-400' : 'text-dark-300'}`} />
                </div>
                <h3 className="text-xl font-bold text-dark-100">{plan.name}</h3>
                <p className="text-dark-400 text-sm mt-1">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-dark-50">
                  ${annual ? Math.round(plan.price * 0.8) : plan.price}
                </span>
                <span className="text-dark-400 text-sm">/mes</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-dark-300">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-brand-400' : 'text-dark-500'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-dark-100 border border-dark-600'
                } disabled:opacity-50`}
              >
                {loadingPlan === plan.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Empezar Ahora
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-dark-400 text-sm">
            ¿Necesitás un plan personalizado? {' '}
            <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">
              Contactanos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
