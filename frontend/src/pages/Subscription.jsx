import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import {
  CreditCard,
  Loader2,
  Check,
  ArrowUpRight,
  AlertTriangle,
  Zap,
  Building2,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = [
  { id: 'starter', name: 'Starter', price: 49, icon: Zap, limits: { leads: 100, rubros: 1, demos: 50, messages: 1000 } },
  { id: 'growth', name: 'Growth', price: 149, icon: Building2, popular: true, limits: { leads: 1000, rubros: 3, demos: 500, messages: 10000 } },
  { id: 'enterprise', name: 'Enterprise', price: 399, icon: Sparkles, limits: { leads: -1, rubros: -1, demos: -1, messages: -1 } },
]

export default function Subscription() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)

  useEffect(() => { loadSubscription() }, [])

  const loadSubscription = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/subscription/${user.uid}`
      ).then(r => r.json())
      if (result.success) setSubscription(result.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const changePlan = async (newPlan) => {
    if (!user || subscription?.plan === newPlan) return
    if (!confirm(locale === 'es' ? `¿Cambiar al plan ${newPlan}?` : `Change to ${newPlan} plan?`)) return
    setChanging(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/subscription/change',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, newPlan }),
        }
      ).then(r => r.json())
      if (result.success) {
        toast.success(locale === 'es' ? 'Plan actualizado' : 'Plan updated')
        loadSubscription()
      } else {
        toast.error(result.error?.message || 'Error')
      }
    } catch (e) {
      toast.error('Error')
    } finally {
      setChanging(false)
    }
  }

  const cancelSubscription = async () => {
    if (!confirm(locale === 'es' ? '¿Cancelar suscripción? Seguirás usando Revendr hasta fin del período.' : 'Cancel subscription? You can use Revendr until the period ends.')) return
    setChanging(true)
    try {
      await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/subscription/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        }
      )
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

  const sub = subscription || { plan: 'starter', status: 'active', usage: { leads: 0, demos: 0, messages: 0 }, limits: { leads: 100, rubros: 1, demos: 50, messages: 1000 } }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
        <CreditCard className="w-7 h-7 text-brand-400" />
        {locale === 'es' ? 'Mi Suscripción' : 'My Subscription'}
      </h1>

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">
              {locale === 'es' ? 'Plan Actual' : 'Current Plan'}: <span className="capitalize text-brand-400">{sub.plan}</span>
            </h2>
            <p className="text-sm text-dark-400">
              {sub.status === 'active' ? (locale === 'es' ? 'Activo' : 'Active') : sub.status}
              {sub.cancelAtPeriodEnd && ` · ${locale === 'es' ? 'Se cancela al final del período' : 'Cancels at period end'}`}
            </p>
          </div>
          {sub.cancelAtPeriodEnd && (
            <button onClick={() => {}} className="btn-primary text-sm">
              {locale === 'es' ? 'Reactivar' : 'Reactivate'}
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { key: 'leads', label: 'Leads', used: sub.usage.leads, limit: sub.limits.leads },
            { key: 'demos', label: 'Demos', used: sub.usage.demos, limit: sub.limits.demos },
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

        {!sub.cancelAtPeriodEnd && sub.plan !== 'starter' && (
          <button onClick={cancelSubscription} disabled={changing} className="text-sm text-dark-400 hover:text-red-400">
            {locale === 'es' ? 'Cancelar suscripción' : 'Cancel subscription'}
          </button>
        )}
      </div>

      {/* Available Plans */}
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
                className={`card relative ${isCurrent ? 'border-brand-500 bg-brand-500/5' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <div className="text-center mb-4">
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${isCurrent ? 'text-brand-400' : 'text-dark-400'}`} />
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
                    isCurrent
                      ? 'bg-brand-500/10 text-brand-400 cursor-default'
                      : 'bg-dark-700 hover:bg-dark-600 text-dark-100 border border-dark-600'
                  } disabled:opacity-50`}
                >
                  {isCurrent ? (locale === 'es' ? 'Plan Actual' : 'Current Plan') : (locale === 'es' ? 'Cambiar' : 'Change')}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
