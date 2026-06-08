import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

export const createCheckoutSession = async (priceId, leadId = null) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://us-central1-revendr-9add8.cloudfunctions.net/api'
  
  const response = await fetch(`${apiUrl}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, leadId }),
  })

  const data = await response.json()

  if (!response.ok || !data.sessionId) {
    throw new Error(data.error?.message || 'Failed to create checkout session')
  }

  const stripe = await getStripe()
  const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
  
  if (error) {
    throw new Error(error.message)
  }
}

export const PRICES = {
  starter: {
    monthly: 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Starter',
    monthlyAmount: 4900,
    annualAmount: 3900,
  },
  growth: {
    monthly: 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Growth',
    monthlyAmount: 14900,
    annualAmount: 11900,
  },
  enterprise: {
    monthly: 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Enterprise',
    monthlyAmount: 39900,
    annualAmount: 31900,
  },
}
