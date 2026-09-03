import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react'

const TREE = {
  menu: {
    text: '¡Hola! Soy el asistente de Reven<span style="color:#d97706">dr</span>.\n¿En qué puedo ayudarte?',
    options: [
      { label: 'Guía de uso', next: 'guia' },
      { label: 'Preguntas frecuentes', next: 'faq' },
      { label: 'Contacto / Soporte', next: 'contacto' },
      { label: 'Ir al panel', next: 'panel' },
    ],
  },
  guia: {
    text: 'Elegí un tema:',
    options: [
      { label: 'Crear un producto', next: 'crear_producto' },
      { label: 'Crear una campaña', next: 'crear_campania' },
      { label: 'Ver mis leads', next: 'ver_leads' },
      { label: 'Conectar WhatsApp', next: 'conectar_whatsapp' },
      { label: 'Ver engagement', next: 'ver_engagement' },
      { label: 'Guía completa', type: 'link', path: '/guide' },
      { label: '← Volver', next: 'menu' },
    ],
  },
  crear_producto: {
    text: 'Andá a **Productos → Nuevo Producto**.\n\nCompletá:\n• Nombre del producto/servicio\n• URL de tu landing o propuesta\n• Rubro de tu negocio\n• Personalizá la landing (título, descripción, color, botón)\n\nUna vez creado, usalo en tus campañas.',
    options: [
      { label: 'Ir a Productos', type: 'link', path: '/dashboard/productos' },
      { label: '← Volver', next: 'guia' },
    ],
  },
  crear_campania: {
    text: 'Andá a **Campañas → Nueva Campaña**.\n\nConfigurá:\n• Producto: seleccioná el que creaste\n• Ciudad: dónde querés buscar prospectos\n• Rubro: qué tipo de negocio buscar\n\nEl sistema se encarga del resto.',
    options: [
      { label: 'Ir a Campañas', type: 'link', path: '/dashboard/campanias' },
      { label: '← Volver', next: 'guia' },
    ],
  },
  ver_leads: {
    text: 'En la sección **Leads** encontrás todos los prospectos.\n\nCada lead tiene:\n• Score de calidad (Excelente a Muy Bajo)\n• Datos de contacto\n• Mensaje personalizado generado\n• Historial de engagement\n\nPodés filtrarlos por campaña o score.',
    options: [
      { label: 'Ir a Leads', type: 'link', path: '/dashboard/leads' },
      { label: '← Volver', next: 'guia' },
    ],
  },
  conectar_whatsapp: {
    text: 'Tu WhatsApp se activa sin que hagas nada técnico 😉\n\nEl equipo de **Revendr** configura por vos el envío de mensajes (chip + API oficial de Meta).\n\n**Solo necesitamos que confirmes por dónde coordinamos tu alta.**\n\nCuando esté activo, vas a poder enviar campañas desde el panel.',
    options: [
      { label: 'Ir a Settings', type: 'link', path: '/dashboard/settings' },
      { label: '← Volver', next: 'guia' },
    ],
  },
  ver_engagement: {
    text: 'El sistema trackea automáticamente:\n\n• **Abrió/Interesado** - Hizo clic en tu link\n• **Vio el link** - Abrió pero no hizo clic\n• **Ignoró** - No abrió después de 3 días\n• **Convirtió** - Se hizo cliente\n\nEsto te ayuda a saber a quién contactar de nuevo.',
    options: [
      { label: 'Ir a Leads', type: 'link', path: '/dashboard/leads' },
      { label: '← Volver', next: 'guia' },
    ],
  },
  faq: {
    text: 'Elegí una pregunta:',
    options: [
      { label: '¿Qué es Revendr?', next: 'que_es' },
      { label: '¿Cómo funciona el scraping?', next: 'scraping' },
      { label: '¿Cómo funcionan los planes?', next: 'planes' },
      { label: 'Centro de ayuda', type: 'link', path: '/help' },
      { label: '← Volver', next: 'menu' },
    ],
  },
  que_es: {
    text: 'Revendr es un motor SaaS que automatiza tu prospección comercial.\n\n• Busca leads automáticamente (scraping)\n• Genera propuestas personalizadas para cada prospecto\n• Envía mensajes por WhatsApp y email\n• Cobra con MercadoPago\n\nTodo configurado por rubro y ciudad.',
    options: [
      { label: '← Volver', next: 'faq' },
    ],
  },
  scraping: {
    text: 'El scraping busca prospectos en Google Maps según el rubro y ciudad que configures.\n\n1. Creás una campaña con un rubro y ciudad\n2. El sistema busca y analiza cada negocio\n3. Asigna un score según qué tan buen prospecto es\n4. Genera un mensaje personalizado para cada uno\n\nDespués podés generar propuestas y enviar mensajes.',
    options: [
      { label: '← Volver', next: 'faq' },
    ],
  },
  planes: {
    text: 'Tenemos **2 planes**:\n\n• **Starter** ($29/mes) - 100 leads, 50 propuestas, 900 WhatsApp\n• **Growth** ($79/mes) - 1.000 leads, 500 propuestas, 3.000 WhatsApp\n\nPagando anual tenés **20% de descuento**.\n\nTodos incluyen 14 días gratis.',
    options: [
      { label: 'Ver precios', type: 'link', path: '/pricing' },
      { label: '← Volver', next: 'faq' },
    ],
  },
  contacto: {
    text: 'Elegí cómo querés contactarnos:',
    options: [
      { label: 'Enviar ticket de soporte', type: 'link', path: '/support' },
      { label: 'hola@revendr.app', type: 'action', action: 'email' },
      { label: '← Volver', next: 'menu' },
    ],
  },
  panel: {
    text: '¿Listo para trabajar? Andá a tu panel:',
    options: [
      { label: 'Ir al Dashboard', type: 'link', path: '/dashboard' },
      { label: '← Volver', next: 'menu' },
    ],
  },
}

function renderText(text) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      <span dangerouslySetInnerHTML={{ __html: line }} />
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ))
}

export default function GuidedChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentNode, setCurrentNode] = useState('menu')
  const [history, setHistory] = useState([])
  const navigate = useNavigate()

  const node = TREE[currentNode]

  const goTo = (id) => {
    setHistory((prev) => [...prev, currentNode])
    setCurrentNode(id)
  }

  const goBack = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((prevHistory) => prevHistory.slice(0, -1))
    setCurrentNode(prev)
  }

  const handleOption = (opt) => {
    if (opt.type === 'link') {
      setIsOpen(false)
      navigate(opt.path)
    } else if (opt.type === 'action' && opt.action === 'email') {
      window.location.href = 'mailto:hola@revendr.app'
    } else if (opt.next) {
      goTo(opt.next)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3"
      >
        <span className="hidden sm:inline-flex bg-dark-800 border border-dark-600 text-dark-100 text-sm px-4 py-2 rounded-full shadow-lg items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <MessageCircle className="w-4 h-4 text-brand-400" />
          ¿Necesitás ayuda con tu cuenta?
        </span>
        <span className="relative w-16 h-16">
          <span className="absolute inset-0 rounded-full bg-brand-500/20 [animation-duration:4s] animate-ping" />
          <span className="relative w-16 h-16 rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
            <img src="/RevendrLogo.jpeg" alt="Revendr" className="w-16 h-16 rounded-full object-cover" />
          </span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-900 animate-pulse" />
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[480px] bg-dark-900 rounded-2xl shadow-2xl shadow-brand-500/10 border border-dark-700 flex flex-col z-50 animate-slide-up">
      <div className="bg-brand-500 rounded-t-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/RevendrLogo.jpeg" alt="Revendr" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <div className="text-sm font-medium text-white">Asistente Reven<span className="text-white">dr</span></div>
            <div className="text-xs text-white/70">En línea</div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex justify-start">
          <div className="max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-dark-800 text-dark-100 text-sm leading-relaxed">
            {renderText(node.text)}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-dark-700 space-y-1.5">
        {history.length > 0 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Volver
          </button>
        )}
        {node.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleOption(opt)}
            className="w-full text-left px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-brand-500/40 text-sm text-dark-200 transition-all flex items-center justify-between group"
          >
            <span>{opt.label}</span>
            {opt.type === 'link' ? (
              <ExternalLink className="w-3.5 h-3.5 text-dark-500 group-hover:text-brand-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-dark-500 group-hover:text-brand-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
