import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { auth } from '../config/firebase'
import { 
  CreditCard, 
  Bell, 
  Shield, 
  Loader2, 
  ExternalLink,
  Smartphone,
  Wifi,
  WifiOff,
  Check,
  MessageSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import MessageHistory from '../components/MessageHistory'
import Blacklist from '../components/Blacklist'
import ABTesting from '../components/ABTesting'

const API = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const DEFAULT_NOTIF_PREFS = {
  new_lead: true,
  demo_generated: true,
  message_sent: false,
  lead_converted: true,
  scraping_error: true,
}

export default function Settings() {
  const { adminData, user } = useAuth()
  const { t, locale } = useI18n()
  const [activeTab, setActiveTab] = useState('api')
  const [saving, setSaving] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS)
  const [whatsappStatus, setWhatsappStatus] = useState({ configured: false, status: 'not_configured', messages: { used: 0, limit: 0, remaining: 0, plan: 'starter' } })
  const [whatsappConnecting, setWhatsappConnecting] = useState(false)
  const [whatsappDisconnecting, setWhatsappDisconnecting] = useState(false)
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('')
  const [whatsappTokenInput, setWhatsappTokenInput] = useState('')
  const [waMode, setWaMode] = useState('baileys')
  const [baileysQR, setBaileysQR] = useState(null)
  const [baileysPolling, setBaileysPolling] = useState(false)
  const [baileysConnecting, setBaileysConnecting] = useState(false)
  const [showMetaGuide, setShowMetaGuide] = useState(false)

  useEffect(() => {
    if (adminData?.notif_prefs) {
      setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...adminData.notif_prefs })
    }
    loadWhatsAppStatus()
  }, [adminData])

  const loadWhatsAppStatus = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/config`, { headers: await getAuthHeaders() })
      const data = await res.json()
      if (data.success) setWhatsappStatus(data.data)
    } catch (e) {
      console.error('Error loading WhatsApp status:', e)
    }
  }

  const handleConnectWhatsApp = async () => {
    if (!whatsappPhoneInput || !whatsappTokenInput) {
      toast.error(locale === 'es' ? 'Completá Phone Number ID y Access Token' : 'Fill in Phone Number ID and Access Token')
      return
    }
    setWhatsappConnecting(true)
    try {
      const res = await fetch(`${API}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ phone_number_id: whatsappPhoneInput, access_token: whatsappTokenInput }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(locale === 'es' ? 'WhatsApp conectado correctamente' : 'WhatsApp connected successfully')
        setWhatsappPhoneInput('')
        setWhatsappTokenInput('')
        loadWhatsAppStatus()
      } else {
        toast.error(data.error?.message || 'Error connecting WhatsApp')
      }
    } catch (e) {
      toast.error(locale === 'es' ? 'Error al conectar WhatsApp' : 'Error connecting WhatsApp')
    } finally {
      setWhatsappConnecting(false)
    }
  }

  const handleDisconnectWhatsApp = async () => {
    setWhatsappDisconnecting(true)
    try {
      const res = await fetch(`${API}/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
      })
      const data = await res.json()
      if (data.success) {
        toast.success(locale === 'es' ? 'WhatsApp desconectado' : 'WhatsApp disconnected')
        setBaileysQR(null)
        loadWhatsAppStatus()
      }
    } catch (e) {
      toast.error('Error')
    } finally {
      setWhatsappDisconnecting(false)
    }
  }

  const handleConnectBaileys = async () => {
    setBaileysConnecting(true)
    setBaileysQR(null)
    try {
      const res = await fetch(`${API}/whatsapp/connect-baileys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
      })
      const data = await res.json()
      if (data.success) {
        if (data.data.status === 'connected') {
          toast.success(locale === 'es' ? 'WhatsApp conectado via Baileys' : 'WhatsApp connected via Baileys')
          loadWhatsAppStatus()
        } else {
          toast.success(locale === 'es' ? 'Escaneá el código QR con tu WhatsApp' : 'Scan the QR code with your WhatsApp')
          startBaileysQRPolling()
        }
      } else {
        toast.error(data.error?.message || 'Error connecting')
      }
    } catch (e) {
      toast.error(locale === 'es' ? 'Error al conectar' : 'Error connecting')
    } finally {
      setBaileysConnecting(false)
    }
  }

  const startBaileysQRPolling = async () => {
    setBaileysPolling(true)
    let attempts = 0
    const maxAttempts = 60
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setBaileysPolling(false)
        return
      }
      attempts++
      try {
        const res = await fetch(`${API}/whatsapp/qr`, { headers: await getAuthHeaders() })
        const data = await res.json()
        if (data.success) {
          if (data.data.status === 'connected') {
            setBaileysQR(null)
            setBaileysPolling(false)
            toast.success(locale === 'es' ? 'WhatsApp conectado!' : 'WhatsApp connected!')
            loadWhatsAppStatus()
            return
          }
          if (data.data.qr) {
            setBaileysQR(data.data.qr)
          }
        }
      } catch {}
      setTimeout(poll, 2000)
    }
    poll()
  }

  useEffect(() => {
    if (whatsappStatus.configured && whatsappStatus.baileys_status === 'waiting_qr') {
      startBaileysQRPolling()
    }
  }, [])

  const tabs = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'billing', label: t('billingTab'), icon: CreditCard },
    { id: 'notifications', label: t('notificationsTab'), icon: Bell },
    { id: 'security', label: t('securityTab'), icon: Shield },
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
          {activeTab === 'whatsapp' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-dark-100">WhatsApp</h2>

              {/* WhatsApp */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-sm">📱</span>
                    </div>
                    WhatsApp
                  </label>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    whatsappStatus.configured
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-dark-700 text-dark-400'
                  }`}>
                    {whatsappStatus.configured ? (
                      <><Wifi className="w-3 h-3" /> {whatsappStatus.provider === 'baileys' ? 'Baileys' : 'Meta API'} {locale === 'es' ? 'Conectado' : 'Connected'}</>
                    ) : (
                      <><WifiOff className="w-3 h-3" /> {locale === 'es' ? 'Desconectado' : 'Disconnected'}</>
                    )}
                  </div>
                </div>

                {whatsappStatus.configured ? (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-300">{locale === 'es' ? 'Proveedor' : 'Provider'}</span>
                      <span className="text-sm text-dark-100 font-mono">{whatsappStatus.provider === 'baileys' ? 'Baileys (Gratuito)' : 'Meta Cloud API'}</span>
                    </div>
                    {whatsappStatus.phone_number_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-dark-300">{locale === 'es' ? 'Teléfono' : 'Phone'}</span>
                        <span className="text-sm text-dark-100 font-mono">{whatsappStatus.phone_number_id}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-300">{locale === 'es' ? 'Mensajes este mes' : 'Messages this month'}</span>
                      <span className="text-sm text-dark-100">
                        {whatsappStatus.messages.used} / {whatsappStatus.messages.limit === -1 ? '∞' : whatsappStatus.messages.limit}
                      </span>
                    </div>
                    {whatsappStatus.messages.limit !== -1 && (
                      <div className="w-full bg-dark-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${(whatsappStatus.messages.used / whatsappStatus.messages.limit) > 0.9 ? 'bg-red-500' : (whatsappStatus.messages.used / whatsappStatus.messages.limit) > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (whatsappStatus.messages.used / whatsappStatus.messages.limit) * 100)}%` }}
                        />
                      </div>
                    )}
                    {whatsappStatus.rateLimits && (
                      <div className="pt-2 border-t border-dark-700/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-dark-400">{locale === 'es' ? 'Límite por hora' : 'Hourly limit'}</span>
                          <span className="text-dark-200">{whatsappStatus.rateLimits.perHour} {locale === 'es' ? 'mensajes/hora' : 'msg/hour'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-dark-400">{locale === 'es' ? 'Delay mínimo' : 'Min delay'}</span>
                          <span className="text-dark-200">{whatsappStatus.rateLimits.minDelaySeconds}s {locale === 'es' ? 'entre mensajes' : 'between messages'}</span>
                        </div>
                      </div>
                    )}

                    {/* Warm-up Progress */}
                    {whatsappStatus.warmup && whatsappStatus.warmup.isWarmingUp && (
                      <div className="pt-2 border-t border-dark-700/50">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-amber-400 font-medium">🔥 {locale === 'es' ? 'Calentamiento' : 'Warm-up'}</span>
                          <span className="text-dark-300">{locale === 'es' ? `Día ${whatsappStatus.warmup.day}/${whatsappStatus.warmup.totalDays}` : `Day ${whatsappStatus.warmup.day}/${whatsappStatus.warmup.totalDays}`}</span>
                        </div>
                        <div className="w-full bg-dark-800 rounded-full h-1.5 mb-1">
                          <div
                            className="h-1.5 rounded-full bg-amber-500"
                            style={{ width: `${(whatsappStatus.warmup.day / whatsappStatus.warmup.totalDays) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-dark-400">
                          {locale === 'es'
                            ? `Hoy podés enviar hasta ${whatsappStatus.warmup.maxToday} mensajes (${whatsappStatus.warmup.dailyCount} enviados)`
                            : `Today you can send up to ${whatsappStatus.warmup.maxToday} messages (${whatsappStatus.warmup.dailyCount} sent)`}
                        </p>
                      </div>
                    )}

                    {/* Quality Score */}
                    {whatsappStatus.quality && (
                      <div className="pt-2 border-t border-dark-700/50">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-dark-400">{locale === 'es' ? 'Calidad' : 'Quality'}</span>
                          <span className={`font-medium ${
                            whatsappStatus.quality.level === 'excellent' ? 'text-emerald-400' :
                            whatsappStatus.quality.level === 'good' ? 'text-emerald-400' :
                            whatsappStatus.quality.level === 'fair' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {whatsappStatus.quality.score}%
                          </span>
                        </div>
                        <div className="w-full bg-dark-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              whatsappStatus.quality.score >= 80 ? 'bg-emerald-500' :
                              whatsappStatus.quality.score >= 60 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${whatsappStatus.quality.score}%` }}
                          />
                        </div>
                        {whatsappStatus.quality.score < 60 && (
                          <p className="text-xs text-amber-400 mt-1">
                            {locale === 'es'
                              ? '⚠️ Poca gente entra a tu link. Revisá que el mensaje sea atractivo y la propuesta sea clara.'
                              : '⚠️ Few people visit your link. Check that your message is attractive and the proposal is clear.'}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="pt-2 border-t border-dark-700/50">
                      <button
                        onClick={() => {
                          if (window.confirm(
                            locale === 'es'
                              ? '¿Desvincular WhatsApp?\n\nEsto te permitirá volver a usar WhatsApp desde tu celular.\n\nSi estás usando Baileys (modo gratis), tu sesión se cerrará.\nSi estás usando Meta API, solo se desconectará de Revendr.\n\n¿Continuar?'
                              : 'Unlink WhatsApp?\n\nThis will allow you to use WhatsApp from your phone again.\n\nIf you\'re using Baileys (free mode), your session will be closed.\nIf you\'re using Meta API, it will just disconnect from Revendr.\n\nContinue?'
                          )) {
                            handleDisconnectWhatsApp()
                          }
                        }}
                        disabled={whatsappDisconnecting}
                        className="w-full flex items-center justify-center gap-2 text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                      >
                        {whatsappDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <WifiOff className="w-4 h-4" />}
                        {locale === 'es' ? 'Desvincular WhatsApp de Revendr' : 'Unlink WhatsApp from Revendr'}
                      </button>
                      <p className="text-xs text-dark-500 text-center mt-1">
                        {locale === 'es'
                          ? 'Podés volver a vincularlo cuando quieras'
                          : 'You can link it again anytime'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-dark-900 rounded-xl border border-dark-700 space-y-4">
                    {/* Mode selector */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWaMode('baileys')}
                        className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                          waMode === 'baileys'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>🆓 {locale === 'es' ? 'Gratis' : 'Free'}</span>
                          <span className="text-xs opacity-75">Baileys</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setWaMode('meta')}
                        className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                          waMode === 'meta'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>✅ {locale === 'es' ? 'Oficial' : 'Official'}</span>
                          <span className="text-xs opacity-75">Meta API</span>
                        </div>
                      </button>
                    </div>

                    {waMode === 'baileys' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <p className="text-xs text-emerald-400 font-medium mb-1">
                            {locale === 'es' ? '🟢 Recomendado para empezar' : '🟢 Recommended to start'}
                          </p>
                          <p className="text-xs text-dark-400">
                            {locale === 'es'
                              ? 'Conectá tu WhatsApp personal sin costo por mensaje. Ideal para empezar.'
                              : 'Connect your personal WhatsApp with no per-message cost. Ideal to start.'}
                          </p>
                        </div>

                        {baileysQR ? (
                          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
                            <p className="text-xs text-gray-600 font-medium">
                              {locale === 'es' ? 'Escaneá con WhatsApp > Menú > Dispositivos vinculados' : 'Scan with WhatsApp > Menu > Linked devices'}
                            </p>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(baileysQR)}`}
                              alt="QR Code"
                              className="w-60 h-60"
                            />
                            <p className="text-xs text-gray-500 animate-pulse">
                              {locale === 'es' ? 'Esperando escaneo...' : 'Waiting for scan...'}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={handleConnectBaileys}
                            disabled={baileysConnecting}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                          >
                            {baileysConnecting ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> {locale === 'es' ? 'Conectando...' : 'Connecting...'}</>
                            ) : (
                              <><Smartphone className="w-4 h-4" /> {locale === 'es' ? 'Conectar con QR' : 'Connect with QR'}</>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                          <p className="text-xs text-violet-400 font-medium mb-1">
                            {locale === 'es' ? '💼 Para negocios serios' : '💼 For serious businesses'}
                          </p>
                          <p className="text-xs text-dark-400">
                            {locale === 'es'
                              ? 'API oficial de Meta. Sin riesgo de baneo, green tick, pero ~$0.05 por mensaje.'
                              : 'Meta official API. No ban risk, green tick, but ~$0.05 per message.'}
                          </p>
                        </div>

                        {/* Guía paso a paso */}
                        <button
                          onClick={() => setShowMetaGuide(!showMetaGuide)}
                          className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300"
                        >
                          <span>{showMetaGuide ? '▼' : '▶'}</span>
                          {locale === 'es' ? 'Ver guía paso a paso' : 'View step-by-step guide'}
                        </button>

                        {showMetaGuide && (
                          <div className="p-3 bg-dark-800 rounded-lg border border-dark-700 space-y-3 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">1</span>
                              <div>
                                <p className="text-dark-200 font-medium">{locale === 'es' ? 'Ir a developers.facebook.com' : 'Go to developers.facebook.com'}</p>
                                <p className="text-dark-400">developers.facebook.com/apps/</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">2</span>
                              <div>
                                <p className="text-dark-200 font-medium">{locale === 'es' ? 'Crear app o usar existente' : 'Create app or use existing'}</p>
                                <p className="text-dark-400">{locale === 'es' ? 'Click "Crear app" → Seleccionar tipo "Business" → Completar nombre' : 'Click "Create app" → Select "Business" type → Fill name'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">3</span>
                              <div>
                                <p className="text-dark-200 font-medium">{locale === 'es' ? 'Agregar producto WhatsApp' : 'Add WhatsApp product'}</p>
                                <p className="text-dark-400">{locale === 'es' ? 'En el dashboard de la app → "Agregar producto" → Buscar "WhatsApp" → Configurar' : 'In app dashboard → "Add product" → Search "WhatsApp" → Set up'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">4</span>
                              <div>
                                <p className="text-dark-200 font-medium">{locale === 'es' ? 'Copiar Phone Number ID' : 'Copy Phone Number ID'}</p>
                                <p className="text-dark-400">{locale === 'es' ? 'En WhatsApp → Configuración → Copiar "Phone number ID"' : 'In WhatsApp → Configuration → Copy "Phone number ID"'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">5</span>
                              <div>
                                <p className="text-dark-200 font-medium">{locale === 'es' ? 'Generar Access Token' : 'Generate Access Token'}</p>
                                <p className="text-dark-400">{locale === 'es' ? 'En WhatsApp → Configuración → Token de acceso → Generar token (permisos: messages, business_management)' : 'In WhatsApp → Configuration → Access token → Generate token (permissions: messages, business_management)'}</p>
                              </div>
                            </div>
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded mt-2">
                              <p className="text-amber-400 text-xs">
                                ⚠️ {locale === 'es' ? 'El token expira en ~60 días. Guardalo en un lugar seguro.' : 'Token expires in ~60 days. Save it somewhere safe.'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={whatsappPhoneInput}
                            onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                            className="input-field"
                            placeholder="Phone Number ID (ej: 123456789)"
                          />
                          <input
                            type="password"
                            value={whatsappTokenInput}
                            onChange={(e) => setWhatsappTokenInput(e.target.value)}
                            className="input-field"
                            placeholder="Access Token (EAAxxxxx)"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                            {t('obtainKey')} <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={handleConnectWhatsApp}
                            disabled={whatsappConnecting || !whatsappPhoneInput || !whatsappTokenInput}
                            className="btn-primary flex items-center gap-2 text-sm"
                          >
                            {whatsappConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {locale === 'es' ? 'Conectar' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message History */}
              <div className="pt-4 border-t border-dark-700">
                <h3 className="text-sm font-medium text-dark-300 mb-3">
                  {locale === 'es' ? 'Historial de mensajes' : 'Message History'}
                </h3>
                <MessageHistory />
              </div>

              {/* Blacklist */}
              <div className="pt-4 border-t border-dark-700">
                <Blacklist />
              </div>

              {/* A/B Testing */}
              <div className="pt-4 border-t border-dark-700">
                <ABTesting />
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-dark-100">{t('notificationsTitle')}</h2>
                {notifSaving && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
              </div>
              <div className="space-y-4">
                {[
                  { key: 'new_lead', label: t('newLeadNotif'), description: t('newLeadDesc') },
                  { key: 'demo_generated', label: t('demoGeneratedNotif'), description: t('demoGeneratedDesc') },
                  { key: 'message_sent', label: t('messageSentNotif'), description: t('messageSentDesc') },
                  { key: 'lead_converted', label: t('leadConvertedNotif'), description: t('leadConvertedDesc') },
                  { key: 'scraping_error', label: t('scrapingErrorNotif'), description: t('scrapingErrorDesc') },
                ].map((notif) => (
                  <div key={notif.key} className="flex items-center justify-between p-4 bg-dark-900 rounded-xl">
                    <div>
                      <h3 className="font-medium text-dark-100">{notif.label}</h3>
                      <p className="text-sm text-dark-400">{notif.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[notif.key]}
                        onChange={async () => {
                          const next = !notifPrefs[notif.key]
                          setNotifPrefs(p => ({ ...p, [notif.key]: next }))
                          setNotifSaving(true)
                          try {
                            await updateDoc(doc(db, 'usuarios_admin', user.uid), {
                              notif_prefs: { ...notifPrefs, [notif.key]: next },
                            })
                          } catch { /* silent */ }
                          setNotifSaving(false)
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dark-500 mt-4">
                {locale === 'es'
                  ? 'Las notificaciones push requieren permiso del navegador. Activá las que quieras recibir.'
                  : 'Push notifications require browser permission. Enable the ones you want to receive.'}
              </p>
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
