import { createContext, useContext, useState, useCallback } from 'react'

const translations = {
  es: {
    dashboard: 'Dashboard',
    campaigns: 'Campañas',
    leads: 'Leads',
    settings: 'Configuración',
    newCampaign: 'Nueva Campaña',
    campaignName: 'Nombre de la Campaña',
    targetNiche: 'Rubro Objetivo',
    city: 'Ciudad / Zona',
    messageTemplate: 'Mensaje Template (WhatsApp)',
    createCampaign: 'Crear Campaña',
    cancel: 'Cancelar',
    save: 'Guardar',
    search: 'Buscar...',
    exportCSV: 'Exportar CSV',
    allNiches: 'Todos los Rubros',
    allStatuses: 'Todos los Estados',
    scraped: 'Scrapeado',
    demoGenerated: 'Demo Generada',
    messageSent: 'Mensaje Enviado',
    interested: 'Interesado',
    activeClient: 'Cliente Activo',
    totalLeads: 'Total Leads',
    activeCampaigns: 'Campañas Activas',
    demosGenerated: 'Demos Generadas',
    conversionRate: 'Tasa Conversión',
    recentLeads: 'Leads Recientes',
    leadsPerDay: 'Leads por Día',
    leadsByStatus: 'Leads por Estado',
    leadsByNiche: 'Leads por Rubro',
    viewAll: 'Ver todos →',
    noLeadsYet: 'No hay leads aún. Crea una campaña para empezar.',
    business: 'Negocio',
    contact: 'Contacto',
    niche: 'Rubro',
    status: 'Estado',
    source: 'Fuente',
    date: 'Fecha',
    startNow: 'Empezar Ahora',
    viewDemo: 'Ver mi Demo',
    contactWhatsApp: 'Consultar por WhatsApp',
    darkMode: 'Modo oscuro',
    lightMode: 'Modo claro',
    login: 'Iniciar Sesión',
    register: 'Crear Cuenta',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    name: 'Nombre',
    welcome: 'Bienvenido',
    pricing: 'Precios',
    landing: {
      title: 'Revendé tus apps de forma masiva y automatizada',
      subtitle: 'Un motor SaaS que scrapea leads, genera demos personalizadas, envía WhatsApp y cobra con Stripe. Todo automático, por rubro.',
      getStarted: 'Empezar Gratis',
      seeFeatures: 'Ver Features',
      features: 'Todo lo que necesitás para revender',
      featuresDesc: 'Un pipeline completo que funciona solo.',
      multiNiche: 'Un sistema, múltiples rubros',
      multiNicheDesc: 'Configurá una campaña por rubro y el sistema se adapta.',
      cta: '¿Listo para escalar tus ventas?',
      ctaDesc: 'Unite a cientos de revendedores que ya automatizan su prospección.',
    },
  },
  en: {
    dashboard: 'Dashboard',
    campaigns: 'Campaigns',
    leads: 'Leads',
    settings: 'Settings',
    newCampaign: 'New Campaign',
    campaignName: 'Campaign Name',
    targetNiche: 'Target Niche',
    city: 'City / Zone',
    messageTemplate: 'Message Template (WhatsApp)',
    createCampaign: 'Create Campaign',
    cancel: 'Cancel',
    save: 'Save',
    search: 'Search...',
    exportCSV: 'Export CSV',
    allNiches: 'All Niches',
    allStatuses: 'All Statuses',
    scraped: 'Scraped',
    demoGenerated: 'Demo Generated',
    messageSent: 'Message Sent',
    interested: 'Interested',
    activeClient: 'Active Client',
    totalLeads: 'Total Leads',
    activeCampaigns: 'Active Campaigns',
    demosGenerated: 'Demos Generated',
    conversionRate: 'Conversion Rate',
    recentLeads: 'Recent Leads',
    leadsPerDay: 'Leads per Day',
    leadsByStatus: 'Leads by Status',
    leadsByNiche: 'Leads by Niche',
    viewAll: 'View all →',
    noLeadsYet: 'No leads yet. Create a campaign to get started.',
    business: 'Business',
    contact: 'Contact',
    niche: 'Niche',
    status: 'Status',
    source: 'Source',
    date: 'Date',
    startNow: 'Start Now',
    viewDemo: 'View my Demo',
    contactWhatsApp: 'Contact via WhatsApp',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    login: 'Log In',
    register: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    welcome: 'Welcome',
    pricing: 'Pricing',
    landing: {
      title: 'Sell your apps at scale and on autopilot',
      subtitle: 'A SaaS engine that scrapes leads, generates personalized demos, sends WhatsApp and collects payments via Stripe. All automated, per niche.',
      getStarted: 'Get Started Free',
      seeFeatures: 'See Features',
      features: 'Everything you need to resell',
      featuresDesc: 'A complete pipeline that works on its own.',
      multiNiche: 'One system, multiple niches',
      multiNicheDesc: 'Set up a campaign per niche and the system adapts automatically.',
      cta: 'Ready to scale your sales?',
      ctaDesc: 'Join hundreds of resellers already automating their prospecting.',
    },
  },
}

const I18nContext = createContext(null)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('revendr-locale') || 'es'
  })

  const t = useCallback((key) => {
    const keys = key.split('.')
    let value = translations[locale]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }, [locale])

  const changeLocale = useCallback((newLocale) => {
    setLocale(newLocale)
    localStorage.setItem('revendr-locale', newLocale)
  }, [])

  return (
    <I18nContext.Provider value={{ locale, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  )
}
