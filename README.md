# Revendr - Motor de Automatización SaaS B2B

Plataforma de automatización de prospección con WhatsApp, CRM, landing pages, campañas y sistema de calidad.

## Features Principales

### 🚀 Sistema de Prospección
- **Landing pages automáticas** por lead con tracking de visitas y conversiones
- **Propuestas personalizadas** generadas por IA (Gemini)
- **Lead scoring** basado en engagement (visitas, clics, tiempo en página)
- **Engagement tracking** categoriza leads como: Engaged, Viewed, Ignored, Pending, Converted
- **Scraping de Google Maps** vía Apify y Google Places API
- **Importación CSV** de leads con mapeo automático de columnas

### 💬 WhatsApp Integration
- **Doble modo:** Baileys (gratis, QR) y Meta Cloud API (oficial, ~$0.05/msg)
- **Inbox de conversaciones** — vista completa con envío/recepción, lectura confirmada
- **Preview de mensaje** con vista estilo WhatsApp antes de enviar
- **Historial de mensajes** con stats por canal (WhatsApp/Email)
- **Cola de mensajes** con estado (enviado/fallido)
- **Anti-ban warm-up** progresivo (5 días, 10→30 msg/día)
- **Quality score** basado en visitas y conversiones del landing
- **Blacklist** —管理 de números bloqueados
- **Programación de mensajes** — envío programado para fecha futura

### 🔄 Follow-up Automático
- **3 intentos automáticos** (mensaje inicial + 2 follow-ups)
- **Días entre intentos:** 3 días
- **Bloqueo después de 3 intentos:** 40 días sin respuesta
- **Desbloqueo automático** después del período de bloqueo
- **Mensajes personalizados** con nombre del negocio y URL

### 🎯 Re-engagement Automático
- **Detección de leads** que volvieron a visitar después de ser ignorados
- **Mensaje automático** 24 horas después de la visita
- **Un solo intento** por lead para no ser spam
- **Filtrado inteligente** solo leads que estaban en estado "ignored"

### 🏷 Landing Pages & Demos
- **Landing pages por lead** — cada lead tiene una URL única con sus datos
- **Demos por nicho** — booking de estética, propiedades inmobiliarias, clínica, WhatsApp click-to-chat, producto genérico
- **Configuración por producto** — título, descripción, color, CTA text
- **Tracking de analytics** — GA4 Measurement ID y Meta Pixel ID por producto
- **Engagement tracking** — visitas, clics CTA, tiempo en página

### 📊 Dashboard & Analytics
- **Métricas en tiempo real:** leads, campañas, mensajes, revenue
- **Gráficos de tendencia** con Recharts (Area, Pie, Bar)
- **Funnel de conversión** visual
- **Alertas de re-engagement** cuando leads vuelven
- **Estadísticas de mensajes** por canal y estado
- **Portal del owner** — métricas de rendimiento

### 🏢 CRM Multi-tenant
- **Pipeline Kanban** con drag & drop (6 etapas)
- **Filtros por:** estado, propietario, fecha, score, rubro
- **Límite por etapa:** 50 leads/stage
- **Timeline de actividad** — notas, llamadas, reuniones con timestamps
- **Integración Google Calendar** — agendar reuniones directamente
- **Ownership verification** en todas las operaciones

### 📧 Email Marketing
- **Límites por plan:** Starter (500/mo), Growth (2000/mo), Enterprise (ilimitado)
- **Rate limits:** 20-100 emails/hora según plan
- **Tracking de envíos** con estado enviado/fallido
- **Templates HTML** para propuestas y bienvenida
- **Email de prueba** — enviar demo al propio email

### 🤖 Generador de Contenido IA
- **Contenido para redes** — Twitter, Instagram, LinkedIn, Facebook
- **Tipos de contenido** — lanzamiento, feature, testimonial, promoción
- **Generación con Gemini AI** — contenido personalizado por nicho

### 🔬 A/B Testing
- **Variantes de mensaje** — dividir leads en grupos para probar diferentes mensajes
- **Tracking de resultados** — comparar rendimiento entre variantes
- **Por campaña** — ejecutar tests en campañas individuales

### 👥 Gestión de Equipo
- **Invitación por email** — enviar invitación para unirse al workspace
- **Sistema de roles** — Member y Admin
- **Invitaciones pendientes** — seguimiento de invitaciones sin aceptar
- **Flujo de aceptación** — página dedicada con link por email
- **Remover miembros** — eliminar miembros del equipo

### 🎨 UI/UX
- **Dark mode** profesional
- **Responsive** mobile-first
- **Code splitting** con lazy loading (chunks de 5-50kB)
- **Toasts** para feedback de usuario
- **Error boundaries** para manejo de errores
- **i18n** — español e inglés completos
- **Onboarding** — wizard de 5 pasos

### 🔐 Seguridad
- **Firebase Auth** — email/password con verificación de email
- **Token-based API auth** — verificación Bearer token en todos los endpoints
- **Firestore rules** — multi-tenant ownership verification
- **Admin role** — permisos especiales
- **Rate limiting** — general (100/min), por usuario (60/min), webhook (20/min)
- **CORS whitelist** — solo orígenes permitidos

## Planes y Precios

| Plan | Leads | Nichos | Propuestas | WhatsApp/mo | Emails/mo | Precio Mensual | Precio Anual |
|------|-------|--------|------------|-------------|-----------|----------------|--------------|
| Starter | 100 | 1 | 50 | 900 | 500 | $29 USD | $23.20 USD/mo |
| Growth | 1,000 | 3 | 500 | 3,000 | 2,000 | $79 USD | $63.20 USD/mo |
| Enterprise | Ilimitado | Ilimitado | Ilimitado | Ilimitado | Ilimitado | $199 USD | $159.20 USD/mo |

**Descuento anual:** 20% (10 meses por 12)

## Arquitectura

### Backend (Firebase Functions)
```
functions/
├── config.js              # Plan limits, rate limits, email limits
├── index.js               # Express app, Cloud Functions entry
├── baileys-worker.js      # WhatsApp Baileys standalone worker
├── routes/
│   ├── misc/
│   │   ├── whatsapp.js    # WhatsApp endpoints + followup + reengagement
│   │   ├── crm.js         # CRM CRUD con ownership verification
│   │   ├── mercadopago.js # MercadoPago integration (subscriptions + webhooks)
│   │   ├── content.js     # AI content generation
│   │   └── admin.js       # Admin panel endpoints
│   └── campaigns/
│       └── messaging.js   # Campaign messaging con email limits
└── services/
    ├── whatsapp.js        # Service abstraction (Baileys/Meta)
    ├── whatsapp-baileys.js # Baileys provider (QR, session)
    ├── whatsapp-meta.js   # Meta Cloud API provider
    ├── mercadopago.js     # MercadoPago service (preferences, preapprovals, webhooks)
    ├── warmup.js          # Anti-ban warm-up system
    ├── engagement.js      # Lead engagement categorization
    ├── followup.js        # Follow-up automation
    ├── reengagement.js    # Re-engagement automation
    ├── message-log.js     # Message history tracking
    └── ai-message.js      # Gemini AI message generation
```

### Frontend (React + Vite)
```
frontend/src/
├── App.jsx               # Lazy-loaded routes
├── pages/
│   ├── Dashboard.jsx     # Main dashboard with metrics
│   ├── Leads.jsx         # Lead management + engagement filters
│   ├── CRM.jsx           # Kanban pipeline
│   ├── Campaigns.jsx     # Campaign management
│   ├── Settings.jsx      # WhatsApp config + message history
│   ├── Subscription.jsx  # Billing with monthly/annual toggle
│   ├── OwnerPortal.jsx   # Owner metrics dashboard
│   ├── ContentGenerator.jsx # AI social media content
│   └── TeamManagement.jsx # Team invite/remove
├── components/
│   ├── WhatsAppPreview.jsx    # Message preview before send
│   ├── MessageHistory.jsx     # Message history + stats
│   ├── ReengagementAlert.jsx  # Re-engagement notifications
│   └── AIMessageGenerator.jsx # AI message generation
└── contexts/
    ├── AuthContext.jsx    # Auth state management
    └── I18nContext.jsx    # Spanish/English translations
```

## Endpoints API

### WhatsApp
- `GET /whatsapp/config` - Configuración y estado
- `POST /whatsapp/connect` - Conectar WhatsApp
- `POST /whatsapp/send-text` - Enviar mensaje
- `POST /whatsapp/send-bulk` - Envío masivo
- `GET /whatsapp/messages` - Historial de mensajes
- `GET /whatsapp/messages/stats` - Estadísticas
- `GET /whatsapp/conversations` - Inbox de conversaciones
- `GET /whatsapp/conversations/:id/messages` - Mensajes de conversación
- `POST /whatsapp/conversations/:id/send` - Responder en conversación
- `GET /whatsapp/followup/leads` - Leads que necesitan follow-up
- `POST /whatsapp/followup/send` - Enviar follow-up
- `GET /whatsapp/reengagement/triggers` - Leads para re-engagement
- `POST /whatsapp/reengagement/send` - Enviar re-engagement
- `POST /whatsapp/schedule` - Programar mensaje
- `GET/POST /whatsapp/blacklist` - Gestionar blacklist

### Campaigns
- `GET /campaigns` - Listar campañas
- `POST /campaigns` - Crear campaña
- `POST /campaigns/:id/scrape` - Scraping Apify
- `POST /campaigns/:id/scrape-google` - Scraping Google Places
- `POST /campaigns/:id/process-demos` - Generar propuestas
- `POST /campaigns/:id/send-messages` - Enviar mensajes WhatsApp
- `POST /campaigns/:id/send-demo-emails` - Enviar emails
- `POST /campaigns/:id/followups` - Configurar follow-ups
- `POST /campaigns/:id/process-sequence` - Secuencia inteligente
- `POST /campaigns/:id/ab-test` - Crear A/B test
- `GET /campaigns/:id/roi` - Cálculos de ROI

### CRM
- `GET /crm/pipeline` - Datos del pipeline Kanban
- `POST /crm/leads/:id/stage` - Mover lead a etapa
- `GET /crm/leads/:id/timeline` - Timeline de actividad
- `POST /crm/leads/:id/activity` - Agregar actividad

### Payments
- `POST /mercadopago/create-preference` — Preferencia MercadoPago (pago único)
- `POST /mercadopago/create-subscription` — Crear suscripción (preapproval) MercadoPago
- `POST /mercadopago/cancel-subscription` — Cancelar suscripción MercadoPago
- `GET /mercadopago/subscription-status/:userId` — Estado de suscripción
- `POST /mercadopago/webhook` — Webhook MercadoPago (pagos + suscripciones)

### Content & Team
- `POST /content/generate` - Generar contenido IA
- `GET /team/members/:userId` - Listar miembros
- `POST /team/invite` - Invitar miembro
- `POST /team/invite/accept` - Aceptar invitación

## Configuración

### Variables de Entorno (.env)
```env
# Firebase
FIREBASE_PROJECT_ID=revendr-9add8

# MercadoPago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=

# WhatsApp (Meta API)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ID=

# AI
GEMINI_API_KEY=

# Apify
APIFY_API_KEY=

# Google Places
GOOGLE_PLACES_API_KEY=
```

## Instalación

```bash
# Instalar dependencias
cd frontend && npm install
cd ../functions && npm install

# Configurar Firebase
firebase use revendr-9add8

# Desarrollo
cd frontend && npm run dev

# Build y deploy
cd frontend && npm run build
firebase deploy --only hosting,functions
```

## Testing

```bash
# Ejecutar tests
node tests/smoke-test.js

# Tests cubiertos:
# - config.js (plan limits, email limits)
# - warmup.js (anti-ban system)
# - engagement.js (categorization, eligible leads)
# - followup.js (status, messages, config)
# - reengagement.js (triggers, config)
# - message-log.js (logging, history, stats)
# - lemonsqueezy.js (checkout)
# - ai-message.js (generation, bulk)
```

## Notas Técnicas

### Anti-Ban Warm-up
- **Día 1:** 10 mensajes máximo
- **Día 2:** 15 mensajes
- **Día 3:** 20 mensajes
- **Día 4:** 25 mensajes
- **Día 5+:** 30 mensajes (límite del plan)

### Quality Score
- **0-40%:** Poca gente entra al link (mejorar mensaje)
- **40-70%:** Regular
- **70-100%:** Excelente engagement

### Follow-up Logic
1. Mensaje inicial → esperar 3 días
2. Si no respondió → Follow-up 1 → esperar 3 días
3. Si no respondió → Follow-up 2 (último) → bloquear 40 días
4. Después de 40 días → se desbloquea automáticamente

### Re-engagement Logic
1. Lead fue ignorado (no entró al link)
2. Lead vuelve a visitar el landing
3. Esperar 24 horas
4. Enviar mensaje de re-engagement
5. Marcar como enviado (no repetir)
