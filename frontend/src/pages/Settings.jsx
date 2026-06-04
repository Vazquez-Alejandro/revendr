import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { 
  Key, 
  CreditCard, 
  Bell, 
  Shield, 
  Save, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { adminData, user } = useAuth()
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
      toast.success('API keys guardadas correctamente')
    } catch (error) {
      console.error('Error saving API keys:', error)
      toast.error('Error al guardar las API keys')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  const tabs = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Configuración</h1>
        <p className="text-dark-400 mt-1">Gestioná tus API keys, facturación y preferencias</p>
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
                <h2 className="text-lg font-semibold text-dark-100">API Keys</h2>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                  <AlertCircle className="w-4 h-4" />
                  Las keys se almacenan encriptadas
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
                  Para scraping de Google Maps e Instagram.{' '}
                  <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener" className="text-brand-400 hover:text-brand-300">
                    Obtener key <ExternalLink className="w-3 h-3 inline" />
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
                  Token de Meta Business Platform.{' '}
                  <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" className="text-brand-400 hover:text-brand-300">
                    Obtener token <ExternalLink className="w-3 h-3 inline" />
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
                  Guardar API Keys
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-dark-100 mb-6">Facturación</h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                  <div className="text-sm text-dark-400 mb-1">Plan Actual</div>
                  <div className="text-xl font-bold text-brand-400">Enterprise</div>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                  <div className="text-sm text-dark-400 mb-1">Créditos API</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {adminData?.api_credits?.apify || 0}
                  </div>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
                  <div className="text-sm text-dark-400 mb-1">Próximo cobro</div>
                  <div className="text-xl font-bold text-dark-100">$399/mes</div>
                </div>
              </div>

              <div className="border border-dark-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-dark-100">Método de pago</h3>
                    <p className="text-sm text-dark-400">•••• •••• •••• 4242</p>
                  </div>
                  <button className="btn-secondary text-sm">Actualizar</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-dark-100 mb-6">Notificaciones</h2>
              <div className="space-y-4">
                {[
                  { label: 'Nuevo lead registrado', description: 'Cuando el scraper agrega un lead nuevo', enabled: true },
                  { label: 'Demo generada', description: 'Cuando se completa una demo personalizada', enabled: true },
                  { label: 'Mensaje enviado', description: 'Confirmación de envío WhatsApp', enabled: false },
                  { label: 'Lead convertido', description: 'Cuando un lead se vuelve cliente activo', enabled: true },
                  { label: 'Error en scraping', description: 'Si el scraper falla', enabled: true },
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
              <h2 className="text-lg font-semibold text-dark-100 mb-6">Seguridad</h2>
              <div className="space-y-4">
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">Email</h3>
                  <p className="text-sm text-dark-400">{user?.email}</p>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">Contraseña</h3>
                  <p className="text-sm text-dark-400">••••••••</p>
                  <button className="text-sm text-brand-400 hover:text-brand-300 mt-2">
                    Cambiar contraseña
                  </button>
                </div>
                <div className="p-4 bg-dark-900 rounded-xl">
                  <h3 className="font-medium text-dark-100 mb-1">Rol</h3>
                  <p className="text-sm text-dark-400 capitalize">{adminData?.role || 'admin'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
