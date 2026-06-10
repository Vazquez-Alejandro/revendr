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
    monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY || 'price_1TgpksPRwRIumjKDJTuaMTdh',
    annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL || 'price_1TgpksPRwRIumjKDMb9IUI4F',
    name: 'Starter',
    monthlyAmount: 4900,
    annualAmount: 3900,
  },
  growth: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY || 'price_1TgpnzPRwRIumjKDByQoc0Mh',
    annual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL || 'price_1TgprbPRwRIumjKD6vYYlLsK',
    name: 'Growth',
    monthlyAmount: 14900,
    annualAmount: 11900,
  },
  enterprise: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1TgpsWPRwRIumjKDbvOgfLrP',
    annual: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_1Tgpt6PRwRIumjKDXs6laP5D',
    name: 'Enterprise',
    monthlyAmount: 39900,
    annualAmount: 31900,
  },
}
