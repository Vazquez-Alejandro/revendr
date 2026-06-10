export const createCheckoutSession = async (priceId, leadId = null) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://us-central1-revendr-9add8.cloudfunctions.net/api'
  
  const response = await fetch(`${apiUrl}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, leadId }),
  })

  const data = await response.json()

  if (!response.ok || !data.url) {
    throw new Error(data.error?.message || 'Failed to create checkout session')
  }

  window.location.href = data.url
}

export const PRICES = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Starter',
    monthlyAmount: 4900,
    annualAmount: 3900,
  },
  growth: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Growth',
    monthlyAmount: 14900,
    annualAmount: 11900,
  },
  enterprise: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1Tg4SRAqV0sHGXFzpIWt3k1K',
    annual: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_1Tg4T8AqV0sHGXFzpmWGleoM',
    name: 'Enterprise',
    monthlyAmount: 39900,
    annualAmount: 31900,
  },
}
