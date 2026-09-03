import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { api } from '../services/api'
import {
  CreditCard,
  Loader2,
  Check,
  AlertTriangle,
  Zap,
  Building2,
  Clock,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../hooks/useConfirm'

const PLANS = [
  { id: 'starter', name: 'Starter', price: 29, annualPrice: 278.40, icon: Zap, limits: { leads: 100, rubros: 1, propuestas: 50, messages: 900 } },
  { id: 'growth', name: 'Growth', price: 79, annualPrice: 758.40, icon: Building2, popular: true, limits: { leads: 1000, rubros: 3, propuestas: 500, messages: 3000 } },
]

export default function Subscription() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const [whatsappStatus, setWhatsappStatus] = useState({ configured: false, status: 'not_configured' })
  const [billing, setBilling] = useState('monthly')

  useEffect(() => {
    const mpStatus = searchParams.get('mp_status')
    if (mpStatus === 'approved') {
      toast.success(locale === 'es' ? 'Pago aprobado. ¡Tu plan está activo!' : 'Payment approved. Your plan is now active!')
    } else if (mpStatus === 'failure') {
      toast.error(locale === 'es' ? 'El pago no pudo completarse' : 'Payment could not be completed')
    } else if (mpStatus && mpStatus !== 'success') {
      toast(locale === 'es' ? 'Pago pendiente. Se acreditará al confirmarse.' : 'Payment pending. It will be applied once confirmed.')
    }
    loadSubscription()
    loadWhatsAppStatus()
  }, [])

  const loadSubscription = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await api.mercadopago.subscriptionStatus(user.uid)
      if (result.success) setSubscription(result.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadWhatsAppStatus = async () => {
    try {
      const data = await api.whatsapp.config()
      if (data.success) setWhatsappStatus(data.data)
    } catch (e) {
      console.error('Error loading WhatsApp status:', e)
    }
  }

  const handleMpSubscribe = async (planId) => {
    setSubscribing(true)
    try {
      const data = await api.mercadopago.createSubscription({ plan: planId, billing })
      if (data.success && data.data?.init_point) {
        window.location.href = data.data.init_point
      } else {
        throw new Error(data.error?.message || 'Error')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubscribing(false)
    }
  }

  const changePlan = async (newPlan) => {
    if (!user || subscription?.plan === newPlan) return
    if (!(await confirm(locale === 'es' ? `¿Cambiar al plan ${newPlan}?` : `Change to ${newPlan} plan?`, 'Cambiar'))) return
    setChanging(true)
    try {
      const result = await api.mercadopago.createSubscription({ plan: newPlan, billing: subscription.billing, userId: user.uid })
      if (result.success && result.data?.init_point) {
        window.location.href = result.data.init_point
      } else {
        throw new Error(result.error?.message || 'Error')
      }
    } catch (e) {
      toast.error('Error')
    } finally {
      setChanging(false)
    }
  }

  const reactivateSubscription = async () => {
    setChanging(true)
    try {
      const result = await api.mercadopago.createSubscription({ plan: subscription.plan, billing: subscription.billing, userId: user.uid })
      if (result.success && result.data?.init_point) {
        window.location.href = result.data.init_point
      } else {
        throw new Error(result.error?.message || 'Error')
      }
    } catch (e) {
      toast.error('Error')
    } finally {
      setChanging(false)
    }
  }

  const cancelSubscription = async () => {
    if (!(await confirm(locale === 'es' ? '¿Cancelar suscripción? Seguirás usando Revendr hasta fin del período.' : 'Cancel subscription? You can use Revendr until the period ends.', 'Cancelar suscripción'))) return
    setChanging(true)
    try {
      await api.mercadopago.cancelSubscription({ userId: user.uid })
      toast.success(locale === 'es' ? 'Suscripción cancelada' : 'Subscription cancelled')
      loadSubscription()
    } catch (e) {
      toast.error('Error')
    } finally {
      setChanging(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  const sub = subscription || {
    plan: 'starter', status: 'active',
    usage: { leads: 0, propuestas: 0, messages: 0 },
    limits: { leads: 100, rubros: 1, propuestas: 50, messages: 900 },
    hasSubscription: false, trialDaysRemaining: 14, trialEnd: null,
  }

  const trialExpired = !sub.hasSubscription && sub.trialDaysRemaining === 0
  const trialEnding = !sub.hasSubscription && sub.trialDaysRemaining > 0 && sub.trialDaysRemaining <= 3

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
        <CreditCard className="w-7 h-7 text-brand-400" />
        {locale === 'es' ? 'Mi Suscripción' : 'My Subscription'}
      </h1>

      {!sub.hasSubscription && (
        <div className={`card border ${trialExpired ? 'border-red-500/30 bg-red-500/5' : trialEnding ? 'border-amber-500/30 bg-amber-500/5' : 'border-brand-500/30 bg-brand-500/5'}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${trialExpired ? 'bg-red-500/10' : trialEnding ? 'bg-amber-500/10' : 'bg-brand-500/10'}`}>
              {trialExpired ? (
                <AlertTriangle className={`w-5 h-5 text-red-400`} />
              ) : (
                <Clock className={`w-5 h-5 ${trialEnding ? 'text-amber-400' : 'text-brand-400'}`} />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${trialExpired ? 'text-red-300' : trialEnding ? 'text-amber-300' : 'text-brand-300'}`}>
                {trialExpired
                  ? (locale === 'es' ? 'Período de prueba terminado' : 'Free trial ended')
                  : (locale === 'es' ? 'Período de prueba gratuito' : 'Free trial')}
              </p>
              <p className={`text-sm mt-1 ${trialExpired ? 'text-red-400/70' : trialEnding ? 'text-amber-400/70' : 'text-dark-400'}`}>
                {trialExpired
                  ? (locale === 'es'
                    ? 'Tu prueba gratuita finalizó. Suscribite para seguir usando Revendr.'
                    : 'Your free trial ended. Subscribe to continue using Revendr.')
                  : (locale === 'es'
                    ? `Te quedan ${sub.trialDaysRemaining} día${sub.trialDaysRemaining !== 1 ? 's' : ''} de prueba gratuita.`
                    : `You have ${sub.trialDaysRemaining} day${sub.trialDaysRemaining !== 1 ? 's' : ''} left in your free trial.`)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Status */}
      {!whatsappStatus.configured && (
        <div className="card border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-300">
                {locale === 'es' ? 'WhatsApp no conectado' : 'WhatsApp not connected'}
              </p>
              <p className="text-sm mt-1 text-dark-400">
                {locale === 'es'
                  ? 'Para enviar mensajes, conectá tu WhatsApp Business en Settings > API Keys.'
                  : 'To send messages, connect your WhatsApp Business in Settings > API Keys.'}
              </p>
              <a href="/dashboard/settings" className="text-sm text-brand-400 hover:text-brand-300 mt-2 inline-block">
                {locale === 'es' ? 'Ir a Settings →' : 'Go to Settings →'}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">
              {locale === 'es' ? 'Plan Actual' : 'Current Plan'}: <span className="capitalize text-brand-400">{sub.plan}</span>
            </h2>
            <p className="text-sm text-dark-400">
              {!sub.hasSubscription
                ? (locale === 'es' ? 'Prueba gratuita' : 'Free trial')
                : sub.status === 'active'
                  ? (locale === 'es' ? 'Activo' : 'Active')
                  : sub.status}
              {sub.cancelAtPeriodEnd && ` · ${locale === 'es' ? 'Se cancela al final del período' : 'Cancels at period end'}`}
            </p>
          </div>
          {sub.cancelAtPeriodEnd && (
            <button onClick={reactivateSubscription} disabled={changing} className="btn-primary text-sm">
              {changing ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null}
              {locale === 'es' ? 'Reactivar' : 'Reactivate'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { key: 'leads', label: 'Leads', used: sub.usage.leads, limit: sub.limits.leads },
            { key: 'propuestas', label: 'Props.', used: sub.usage.propuestas, limit: sub.limits.propuestas },
            { key: 'messages', label: 'Mensajes', used: sub.usage.messages, limit: sub.limits.messages },
          ].map(item => {
            const pct = item.limit === -1 ? 0 : Math.min(100, (item.used / item.limit) * 100)
            return (
              <div key={item.key} className="bg-dark-900 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-dark-400">{item.label}</span>
                  <span className="text-dark-200">
                    {item.used}/{item.limit === -1 ? '∞' : item.limit}
                  </span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {!sub.hasSubscription && (
          <div className="border-t border-dark-800 pt-4 mt-4">
            <p className="text-sm text-dark-400 mb-3">
              {locale === 'es'
                ? 'Elegí un plan para suscribirte con tarjeta de crédito:'
                : 'Choose a plan to subscribe with credit card:'}
            </p>
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billing === 'monthly'
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                }`}
              >
                {locale === 'es' ? 'Mensual' : 'Monthly'}
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billing === 'annual'
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                }`}
              >
                {locale === 'es' ? 'Anual' : 'Annual'}
                <span className="ml-1 text-xs text-emerald-400">-20%</span>
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {PLANS.map(plan => {
                const Icon = plan.icon
                const isCurrent = sub.plan === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`card relative ${isCurrent ? 'border-brand-500 bg-brand-500/5' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</span>
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-dark-400" />
                      <h3 className="text-lg font-bold text-dark-100">{plan.name}</h3>
                      {billing === 'annual' ? (
                        <div className="mt-2">
                          <div className="text-2xl font-bold text-dark-50">
                            ${plan.annualPrice}<span className="text-sm text-dark-400">/año</span>
                          </div>
                          <div className="text-xs text-emerald-400 font-medium">
                            Ahorras 20%
                          </div>
                          <div className="text-xs text-dark-400">
                            ${plan.price}/mes equivalente
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-dark-50 mt-2">
                          ${plan.price}<span className="text-sm text-dark-400">/mes</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-2 mb-4 text-sm text-dark-300">
                      {Object.entries(plan.limits).map(([key, val]) => (
                        <li key={key} className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-brand-400 flex-shrink-0" />
                          {val === -1 ? `${key} ilimitado` : `${val} ${key}/mes`}
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleMpSubscribe(plan.id)}
                        disabled={subscribing}
                        className="w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {locale === 'es' ? 'Pagar con Mercado Pago (ARS)' : 'Pay with Mercado Pago (ARS)'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!sub.cancelAtPeriodEnd && sub.hasSubscription && sub.plan !== 'starter' && (
          <button onClick={cancelSubscription} disabled={changing} className="text-sm text-dark-400 hover:text-red-400">
            {locale === 'es' ? 'Cancelar suscripción' : 'Cancel subscription'}
          </button>
        )}
      </div>

      {sub.hasSubscription && (
        <div>
          <h2 className="text-lg font-semibold text-dark-100 mb-4">
            {locale === 'es' ? 'Cambiar de Plan' : 'Change Plan'}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const Icon = plan.icon
              const isCurrent = sub.plan === plan.id
              return (
                <div
                  key={plan.id}
                  className={`card relative ${isCurrent && !sub.cancelAtPeriodEnd ? 'border-brand-500 bg-brand-500/5' : ''} ${isCurrent && sub.cancelAtPeriodEnd ? 'opacity-60' : ''}`}
                >
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</span>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${isCurrent && !sub.cancelAtPeriodEnd ? 'text-brand-400' : 'text-dark-400'}`} />
                    <h3 className="text-lg font-bold text-dark-100">{plan.name}</h3>
                    <div className="text-2xl font-bold text-dark-50 mt-2">
                      ${plan.price}<span className="text-sm text-dark-400">/mes</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-dark-300">
                    {Object.entries(plan.limits).map(([key, val]) => (
                      <li key={key} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-brand-400 flex-shrink-0" />
                        {val === -1 ? `${key} ilimitado` : `${val} ${key}/mes`}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => changePlan(plan.id)}
                    disabled={isCurrent || changing}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                      isCurrent && !sub.cancelAtPeriodEnd
                        ? 'bg-brand-500/10 text-brand-400 cursor-default'
                        : isCurrent && sub.cancelAtPeriodEnd
                          ? 'bg-dark-700 text-dark-500 cursor-default opacity-50'
                          : 'bg-dark-700 hover:bg-dark-600 text-dark-100 border border-dark-600'
                    } disabled:opacity-50`}
                  >
                    {isCurrent && !sub.cancelAtPeriodEnd
                      ? (locale === 'es' ? 'Plan Actual' : 'Current Plan')
                      : isCurrent && sub.cancelAtPeriodEnd
                        ? (locale === 'es' ? 'Cancelado' : 'Cancelled')
                        : (locale === 'es' ? 'Cambiar' : 'Change')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
