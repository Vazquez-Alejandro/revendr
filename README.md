# Revendr - Motor de Automatización SaaS B2B

Plataforma de automatización de prospección con WhatsApp, CRM, landing pages, campañas y sistema de calidad.

## Features Principales

### 🚀 Sistema de Prospección
- **Landing pages automáticas** por lead con tracking de visitas y conversiones
- **Propuestas personalizadas** generadas por IA (Gemini)
- **Lead scoring** basado en engagement (visitas, clics, tiempo en página)
- **Engagement tracking** categoriza leads como: Engaged, Viewed, Ignored, Pending, Converted

### 💬 WhatsApp Integration
- **Doble modo:** Baileys (gratis, QR) y Meta Cloud API (oficial, ~$0.05/msg)
- **Preview de mensaje** con vista estilo WhatsApp antes de enviar
- **Historial de mensajes** con stats por canal (WhatsApp/Email)
- **Cola de mensajes** con estado (enviado/fallido)
- **Anti-ban warm-up** progresivo (5 días, 10→30 msg/día)
- **Quality score** basado en visitas y conversiones del landing

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

### 📊 Dashboard & Analytics
- **Métricas en tiempo real:** leads, campañas, mensajes, revenue
- **Gráficos de tendencia** con Recharts
- **Alertas de re-engagement** cuando leads vuelven
- **Estadísticas de mensajes** por canal y estado

### 🏢 CRM Multi-tenant
- **Pipeline Kanban** con drag & drop
- **Filtros por:** estado, propietario, fecha, score
- **Límite por etapa:** 50 leads/stage
- **Ownership verification** en todas las operaciones
- **Landing page por lead** con URL única

### 📧 Email Marketing
- **Límites por plan:** Starter (500/mo), Growth (2000/mo), Enterprise (ilimitado)
- **Rate limits:** 20-100 emails/hora según plan
- **Tracking de envíos** con estado enviado/fallido

### 🎨 UI/UX
- **Dark mode** profesional
- **Responsive** mobile-first
- **Code splitting** con lazy loading (chunks de 5-50kB)
- **Toasts** para feedback de usuario
- **Error boundaries** para manejo de errores

## Planes y Precios

| Plan | Mensajes/mo | Emails/mo | Precio Mensual | Precio Anual |
|------|-------------|-----------|----------------|--------------|
| Starter | 900 | 500 | $29 USD | $23.20 USD/mo |
| Growth | 3,000 | 2,000 | $79 USD | $63.20 USD/mo |
| Enterprise | Ilimitado | Ilimitado | $199 USD | $159.20 USD/mo |

**Descuento anual:** 20% (10 meses por 12)

## Arquitectura

### Backend (Firebase Functions)
```
functions/
├── config.js              # Plan limits, rate limits, email limits
├── routes/
│   ├── misc/
│   │   ├── whatsapp.js    # WhatsApp endpoints + followup + reengagement
│   │   ├── crm.js         # CRM CRUD con ownership verification
│   │   └── payments.js    # LemonSqueezy integration
│   └── campaigns/
│       └── messaging.js   # Campaign messaging con email limits
└── services/
    ├── whatsapp.js        # Service abstraction (Baileys/Meta)
    ├── whatsapp-baileys.js # Baileys provider (QR, session)
    ├── whatsapp-meta.js   # Meta Cloud API provider
    ├── warmup.js          # Anti-ban warm-up system
    ├── engagement.js      # Lead engagement categorization
    ├── followup.js        # Follow-up automation
    ├── reengagement.js    # Re-engagement automation
    ├── message-log.js     # Message history tracking
    ├── ai-message.js      # Gemini AI message generation
    └── lemonsqueezy.js    # Payment processing
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
│   └── Subscription.jsx  # Billing with monthly/annual toggle
├── components/
│   ├── WhatsAppPreview.jsx    # Message preview before send
│   ├── MessageHistory.jsx     # Message history + stats
│   ├── ReengagementAlert.jsx  # Re-engagement notifications
│   └── AIMessageGenerator.jsx # AI message generation
```

## Endpoints API

### WhatsApp
- `GET /whatsapp/config` - Configuración y estado
- `POST /whatsapp/connect` - Conectar WhatsApp
- `POST /whatsapp/send-text` - Enviar mensaje
- `GET /whatsapp/messages` - Historial de mensajes
- `GET /whatsapp/messages/stats` - Estadísticas
- `GET /whatsapp/followup/leads` - Leads que necesitan follow-up
- `GET /whatsapp/followup/:leadId` - Estado de follow-up
- `POST /whatsapp/followup/send` - Enviar follow-up
- `GET /whatsapp/reengagement/triggers` - Leads para re-engagement
- `POST /whatsapp/reengagement/send` - Enviar re-engagement
- `GET /whatsapp/reengaged` - Leads re-engaged

### CRM
- `GET /crm/leads` - Leads con filtros
- `POST /crm/leads` - Crear lead
- `PUT /crm/leads/:id` - Actualizar lead
- `DELETE /crm/leads/:id` - Eliminar lead
- `GET /crm/events` - Eventos del pipeline
- `POST /crm/events` - Crear evento

### Payments
- `POST /payments/checkout` - Crear checkout LemonSqueezy
- `GET /payments/subscription/:uid` - Estado de suscripción
- `POST /payments/webhook` - Webhook de LemonSqueezy

## Configuración

### Variables de Entorno (.env)
```env
# Firebase
FIREBASE_PROJECT_ID=revendr-9add8

# LemonSqueezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=
LEMONSQUEEZY_VARIANT_STARTER_ANNUAL=
LEMONSQUEEZY_VARIANT_GROWTH_MONTHLY=
LEMONSQUEEZY_VARIANT_GROWTH_ANNUAL=
LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY=
LEMONSQUEEZY_VARIANT_ENTERPRISE_ANNUAL=
LEMONSQUEEZY_WEBHOOK_SECRET=

# WhatsApp (Meta API)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ID=

# AI
GEMINI_API_KEY=
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
