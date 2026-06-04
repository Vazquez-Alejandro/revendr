import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

export const createCheckoutSession = async (priceId, leadId = null) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, leadId }),
    })

    const { sessionId } = await response.json()
    const stripe = await getStripe()
    await stripe.redirectToCheckout({ sessionId })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    throw error
  }
}

export const PRICES = {
  starter: {
    monthly: 'price_starter_monthly',
    annual: 'price_starter_annual',
    name: 'Starter',
    monthlyAmount: 4900,
    annualAmount: 3900,
  },
  growth: {
    monthly: 'price_growth_monthly',
    annual: 'price_growth_annual',
    name: 'Growth',
    monthlyAmount: 14900,
    annualAmount: 11900,
  },
  enterprise: {
    monthly: 'price_enterprise_monthly',
    annual: 'price_enterprise_annual',
    name: 'Enterprise',
    monthlyAmount: 39900,
    annualAmount: 31900,
  },
}
