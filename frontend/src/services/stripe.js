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
    const apiUrl = import.meta.env.VITE_API_URL || 'https://us-central1-revendr-9add8.cloudfunctions.net/api'
    const response = await fetch(`${apiUrl}/create-checkout-session`, {
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
