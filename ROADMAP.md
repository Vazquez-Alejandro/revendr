# Revendr — Roadmap

## Estado actual (Julio 2026)
- ✅ Código completo funcional (frontend + backend)
- ✅ Proyecto Firebase creado (revendr-9add8)
- ✅ Functions desplegadas (api, processScheduledMessages, onUserCreated)
- ✅ Hosting desplegado → https://revendr-9add8.web.app
- ✅ Auth (login, registro, verificación email)
- ✅ Campañas CRUD + scraping (Apify + Google Places)
- ✅ Leads con scoring, CSV import, filtros
- ✅ WhatsApp dual (Baileys + Meta Cloud API)
- ✅ Warmup system, business hours, quality score
- ✅ AI message generation (Gemini)
- ✅ Follow-ups, re-engagement, A/B testing
- ✅ LemonSqueezy + MercadoPago (pagos USD + ARS)
- ✅ Email transaccional (Gmail fallback)
- ✅ CRM pipeline, analytics, content generation
- ✅ Telegram notifications (registro)
- ✅ Blacklist, soporte, team management
- ✅ Onboarding, user guide, white-label config

## Fixes aplicados (Julio 2026)
- `campaign-metrics.js`: colección `message_events` → `message_log`
- `analytics.js`: `/stats/products` y `/analytics/trends` ahora filtran por `user_id`
- `analytics.js`: `/predictions/:campaignId` verifica ownership de campaña
- `templates/emails.js`: copyright 2024 → 2026

## Pendiente para salir a producción

### 1. Comprar dominio (~$12 USD)
- Un dominio para Revendr (ej: `revendr.com.ar`)
- Configurar en Firebase Hosting

### 2. Configurar WhatsApp Business API
- Comprar chip nuevo O contactar Meta para deregistrar número actual
- Configurar número en Baileys (local) o Meta Cloud API (producción)
- Verificar webhook: `https://us-central1-revendr-9add8.cloudfunctions.net/api/whatsapp/webhook`

### 3. Configurar Resend (emails transaccionales)
- Dominio `revendr.com.ar` verificado (o usar el mismo que TraceLess)
- Actualizar `RESEND_FROM` en `.env` (actualmente usa `onboarding@resend.dev`)
- FROM建议: `noreply@revendr.com.ar`

### 4. Variables de entorno en Firebase
```
ADMIN_EMAIL=vazquezale82@gmail.com
APIFY_TOKEN=
MP_ACCESS_TOKEN=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
RESEND_API_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
GOOGLE_PLACES_API_KEY=
TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_ID=
```

### 5. Upgrade Node.js (antes de Octubre 2026)
- Node.js 20 deprecado, migrar a Node.js 22
- `firebase.json` → `"runtime": "nodejs22"`
- Testear compatibilidad

### 6. Upgrade firebase-functions SDK
- Actual: 4.9.0 → Necesario: >=5.1.0
- `npm install firebase-functions@latest`
- Revisar breaking changes

### 7. Firestore composite indexes
- Muchos queries usan `where` + `orderBy` en campos diferentes
- Sin indexes compuestos, Firestore da errores
- Crear en Firebase Console > Firestore > Indexes

### 8. Test end-to-end
- [ ] Registro → onboarding → crear producto → campaña → scraping → mensaje → landing
- [ ] Pagos (LemonSqueezy checkout)
- [ ] WhatsApp Baileys (QR scan + envío)
- [ ] WhatsApp Meta API (webhook + envío)
- [ ] Email transaccional
- [ ] Admin panel

## Servicios externos
| Servicio | Costo | Estado |
|----------|-------|--------|
| Firebase | Spark (gratis) | ✅ Deployed |
| Apify | $5-50/mes | Pendiente configurar |
| LemonSqueezy | 5% + $0.50/txn | Pendiente testear |
| MercadoPago | ~4-6% + fijo | Pendiente testear |
| Resend | 100 gratis | Pendiente dominio |
| Gemini API | Gratis (60 req/min) | ✅ Configurado |

## Opcionales
- Sentry — monitoreo de errores
- PostHog — analytics (gratis hasta 1M eventos)
- Google Places API — datos de ubicación (ya configurado)
