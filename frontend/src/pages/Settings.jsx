import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { 
  Key, 
  CreditCard, 
  Bell, 
  Shield, 
  Save, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Copy,
  Globe,
  Palette,
  Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { adminData, user } = useAuth()
  const { t, locale } = useI18n()
  const [activeTab, setActiveTab] = useState('api')
  const [saving, setSaving] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    apify: '',
    stripe_secret: '',
    stripe_webhook: '',
    whatsapp_token: '',
    whatsapp_phone_id: '',
    inmoxil_url: '',
    inmoxil_key: '',
  })

  useEffect(() => {
    if (adminData?.api_keys) {
      setApiKeys(adminData.api_keys)
    }
  }, [adminData])

  const handleSaveApiKeys = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'usuarios_admin', user.uid), {
        api_keys: apiKeys,
        fecha_actualizacion: new Date(),
      })
      toast.success(locale === 'es' ? 'API keys guardadas correctamente' : 'API keys saved successfully')
    } catch (error) {
      console.error('Error saving API keys:', error)
      toast.error(locale === 'es' ? 'Error al guardar las API keys' : 'Error saving API keys')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success(locale === 'es' ? 'Copiado al portapapeles' : 'Copied to clipboard')
  }

  const tabs = [
    { id: 'api', label: t('apiKeysTab'), icon: Key },
    { id: 'billing', label: t('billingTab'), icon: CreditCard },
    { id: 'notifications', label: t('notificationsTab'), icon: Bell },
    { id: 'security', label: t('securityTab'), icon: Shield },
    { id: 'whitelabel', label: locale === 'es' ? 'White-Label' : 'White-Label', icon: Palette },
    { id: 'integrations', label: locale === 'es' ? 'Integraciones' : 'Integrations', icon: Globe },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">{t('settings')}</h1>
        <p className="text-dark-400 mt-1">{t('settingsDesc')}</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-600/10 text-brand-400 border border-brand-600/20'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'api' && (
            <div className="card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark-100">{t('apiKeysTab')}</h2>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                  <AlertCircle className="w-4 h-4" />
                  {t('keysEncrypted')}
                </div>
              </div>

              {/* Apify */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <span className="text-sm">🔍</span>
                  </div>
                  Apify API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeys.apify}
                    onChange={(e) => setApiKeys({ ...apiKeys, apify: e.target.value })}
                    className="input-field flex-1"
                    placeholder="apify_api_xxxxx"
                  />
                  <button
                    onClick={() => copyToClipboard(apiKeys.apify)}
                    className="btn-secondary px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-dark-500">
                  {t('forScraping')}{' '}
                  <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener" className="text-brand-400 hover:text-brand-300">
                    {t('obtainKey')} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              {/* Stripe */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <span className="text-sm">💳</span>
                  </div>
                  Stripe Secret Key
                </label>
                <input
                  type="password"
                  value={apiKeys.stripe_secret}
                  onChange={(e) => setApiKeys({ ...apiKeys, stripe_secret: e.target.value })}
                  className="input-field"
                  placeholder="sk_live_xxxxx"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <span className="text-sm">🔗</span>
                  </div>
                  Stripe Webhook Secret
                </label>
                <input
                  type="password"
                  value={apiKeys.stripe_webhook}
                  onChange={(e) => setApiKeys({ ...apiKeys, stripe_webhook: e.target.value })}
                  className="input-field"
                  placeholder="whsec_xxxxx"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-sm">📱</span>
                  </div>
                  WhatsApp API Token
                </label>
                <input
                  type="password"
                  value={apiKeys.whatsapp_token}
                  onChange={(e) => setApiKeys({ ...apiKeys, whatsapp_token: e.target.value })}
                  className="input-field"
                  placeholder="EAAxxxxx"
                />
                <p className="text-xs text-dark-500">
                  {locale === 'es' ? 'Token de Meta Business Platform.' : 'Meta Business Platform token.'}{' '}
                  <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" className="text-brand-400 hover:text-brand-300">
                    {t('obtainKey')} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-sm">📞</span>
                  </div>
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={apiKeys.whatsapp_phone_id}
                  onChange={(e) => setApiKeys({ ...apiKeys, whatsapp_phone_id: e.target.value })}
                  className="input-field"
                  placeholder="123456789"
                />
              </div>

              {/* Inmoxil */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-sm">🏠</span>
                  </div>
                  Inmoxil API URL
                </label>
                <input
                  type="url"
                  value={apiKeys.inmoxil_url}
                  onChange={(e) => setApiKeys({ ...apiKeys, inmoxil_url: e.target.value })}
                  className="input-field"
                  placeholder="https://api.inmoxil.com/v1"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-sm">🔑</span>
                  </div>
                  Inmoxil API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.inmoxil_key}
                  onChange={(e) => setApiKeys({ ...apiKeys, inmoxil_key: e.target.value })}
                  className="input-field"
                  placeholder="inmox_xxxxx"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-700">
                <button
                  onClick={handleSaveApiKeys}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('saveApiKeys')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('billingTitle')}</h2>
              <p className="text-dark-400 mb-4">
                {locale === 'es' ? 'Gestioná tu suscripción, plan y métodos de pago.' : 'Manage your subscription, plan, and payment methods.'}
              </p>
              <a href="/dashboard/subscription" className="btn-primary inline-flex items-center gap-2">
                {locale === 'es' ? 'Ir a Suscripción' : 'Go to Subscription'}
              </a>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('notificationsTitle')}</h2>
              <div className="space-y-4">
                {[
                  { label: t('newLeadNotif'), description: t('newLeadDesc'), enabled: true },
                  { label: t('demoGeneratedNotif'), description: t('demoGeneratedDesc'), enabled: true },
                  { label: t('messageSentNotif'), description: t('messageSentDesc'), enabled: false },
                  { label: t('leadConvertedNotif'), description: t('leadConvertedDesc'), enabled: true },
                  { label: t('scrapingErrorNotif'), description: t('scrapingErrorDesc'), enabled: true },
                ].map((notif, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-dark-900 rounded-xl">
                    <div>
                      <h3 className="font-medium text-dark-100">{notif.label}</h3>
                      <p className="text-sm text-dark-400">{notif.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={notif.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('securityTitle')}</h2>
              <div className="space-y-4">
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">{t('email')}</h3>
                  <p className="text-sm text-dark-400">{user?.email}</p>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">{t('password')}</h3>
                  <p className="text-sm text-dark-400">••••••••</p>
                  <button className="text-sm text-brand-400 hover:text-brand-300 mt-2">
                    {t('changePassword')}
                  </button>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">{t('role')}</h3>
                  <p className="text-sm text-dark-400 capitalize">{adminData?.role || 'admin'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whitelabel' && (
            <div className="card space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-dark-100">{locale === 'es' ? 'White-Label' : 'White-Label'}</h2>
                <p className="text-sm text-dark-400 mt-1">
                  {locale === 'es'
                    ? 'Personalizá Revendr con tu marca. Disponible en plan Enterprise.'
                    : 'Customize Revendr with your brand. Available on Enterprise plan.'}
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  {locale === 'es' ? 'Próximamente' : 'Coming Soon'}
                </div>
                <p className="text-xs text-dark-400">
                  {locale === 'es'
                    ? 'White-label estará disponible cuando Revendr salga al mercado. Configurá tu marca ahora y la activamos cuando esté listo.'
                    : 'White-label will be available when Revendr launches. Set up your brand now and we\'ll activate it when ready.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-dark-300">
                    {locale === 'es' ? 'Nombre de tu app' : 'Your app name'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="MiSaaS"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-dark-300">
                    {locale === 'es' ? 'Logo URL' : 'Logo URL'}
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://tudominio.com/logo.png"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-dark-300">
                    {locale === 'es' ? 'Color primario' : 'Primary color'}
                  </label>
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 rounded-lg cursor-not-allowed" disabled />
                    <input type="text" className="input-field flex-1" placeholder="#0ea5e9" disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-dark-300">
                    {locale === 'es' ? 'Dominio personalizado' : 'Custom domain'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="app.tudominio.com"
                    disabled
                  />
                  <p className="text-xs text-dark-500">
                    {locale === 'es'
                      ? 'Apuntá CNAME a revendr-9add8.web.app'
                      : 'Point CNAME to revendr-9add8.web.app'}
                  </p>
                </div>

                <button className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
                  <Save className="w-4 h-4" />
                  {locale === 'es' ? 'Guardar (próximamente)' : 'Save (coming soon)'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="card space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-dark-100">
                  {locale === 'es' ? 'Integraciones' : 'Integrations'}
                </h2>
                <p className="text-sm text-dark-400 mt-1">
                  {locale === 'es'
                    ? 'Conectá servicios externos para potenciar Revendr.'
                    : 'Connect external services to power up Revendr.'}
                </p>
              </div>

              {/* Mercado Pago */}
              <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-xl">💰</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-dark-100">Mercado Pago</h3>
                      <p className="text-xs text-dark-400">
                        {locale === 'es' ? 'Cobrar en Argentina con pesos' : 'Accept payments in Argentina'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                    {locale === 'es' ? 'Próximamente' : 'Coming Soon'}
                  </span>
                </div>
                <input
                  type="password"
                  className="input-field mb-2"
                  placeholder="APP_USR-xxxxx"
                  disabled
                />
                <p className="text-xs text-dark-500">
                  {locale === 'es'
                    ? 'Plan Starter $29 USD/mes, Growth $79 USD/mes. Se activa cuando Revendr salga al mercado.'
                    : 'Starter plan $29/mo, Growth $79/mo. Activates when Revendr launches.'}
                </p>
              </div>

              {/* API Pública */}
              <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-xl">🔌</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-dark-100">
                        {locale === 'es' ? 'API Pública' : 'Public API'}
                      </h3>
                      <p className="text-xs text-dark-400">
                        {locale === 'es' ? 'Integrá Revendr con tu sistema' : 'Integrate Revendr with your system'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                </div>
                <div className="bg-dark-800 rounded-lg p-3 font-mono text-xs text-dark-300 mb-2">
                  GET /api/leads?limit=50
                </div>
                <a
                  href="/api-docs"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  {locale === 'es' ? 'Ver documentación completa' : 'View full documentation'} <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Horarios Inteligentes */}
              <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <span className="text-xl">🕐</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-dark-100">
                        {locale === 'es' ? 'Horarios Inteligentes' : 'Smart Scheduling'}
                      </h3>
                      <p className="text-xs text-dark-400">
                        {locale === 'es' ? 'Envía mensajes cuando el negocio está abierto' : 'Send messages when the business is open'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                </div>
                <p className="text-xs text-dark-400">
                  {locale === 'es'
                    ? 'Detecta la zona horaria del lead y envía en horario laboral (9-18hs). Mejores horarios: 9-11am y 2-5pm.'
                    : 'Detects lead timezone and sends during business hours (9-6pm). Best times: 9-11am and 2-5pm.'}
                </p>
              </div>

              {/* Multi-idioma */}
              <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-dark-100">
                        {locale === 'es' ? 'Multi-idioma' : 'Multi-language'}
                      </h3>
                      <p className="text-xs text-dark-400">
                        {locale === 'es' ? 'Detecta idioma automáticamente' : 'Auto-detect language'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                </div>
                <p className="text-xs text-dark-400">
                  {locale === 'es'
                    ? 'Detecta el país/ciudad del lead y adapta el mensaje: español (AR/MX/CO), portugués (BR), inglés (US/UK).'
                    : 'Detects lead country/city and adapts message: Spanish (AR/MX/CO), Portuguese (BR), English (US/UK).'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
