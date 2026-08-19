# Revendr — Roadmap

## Estado actual (verificado 2026-08-19)
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
- ✅ MercadoPago (pagos USD + ARS) — único medio de pago (LemonSqueezy fue removido del código)
- ✅ Email transaccional (Gmail/Resend fallback)
- ✅ CRM pipeline, analytics, content generation
- ✅ Telegram notifications, blacklist, team management, onboarding

## Verificado en esta sesión (opencode)
- ✅ **Precio unificado en $29 / $79 / $199 USD** en frontend (`Subscription.jsx`) y backend (`mercadopago.js` → `PLAN_PRICES_USD`). README coincide. No hay inconsistencia.
- ✅ **Webhook de MercadoPago con HMAC SHA256** implementado en `routes/mercadopago.js` (valida `x-signature`). Falta solo setear `MP_WEBHOOK_SECRET` en env.
- ✅ **Smoke tests:** 19/19 pass (`node tests/smoke-test.js`).
- ✅ **Composite indexes** definidos en `firestore.indexes.json` (productos, campanias, leads, crm_events, message_log, etc.).
- ⚠️ LemonSqueezy ya no existe en el código: ignorar cualquier referencia vieja a `LEMONSQUEEZY_WEBHOOK_SECRET`.

## Pendiente para salir a producción (lo que NO es código)

### Crítico para cobrar
1. **Secretos de MercadoPago** en Firebase Functions config:
   - `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` (obligatorio para que el webhook valide).
2. **WhatsApp Business API** (chip llega hoy 2026-08-19):
   - Registrar número en Meta Business → `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
   - Verificar webhook: `https://us-central1-revendr-9add8.cloudfunctions.net/api/whatsapp/webhook`.
3. **Dominio propio** (~$12 USD): `revendr.com.ar` o `revendr.app` → Firebase Hosting. Actualizar `FIREBASE_APP_URL` y CORS.
4. **Resend**: verificar dominio y setear `RESEND_API_KEY` + `RESEND_FROM=noreply@revendr.app` (hoy sale de `resend.dev`).

### Importante
5. **Web Push**: generar VAPID key y setear `VITE_FIREBASE_VAPID_KEY` en `frontend/.env` (hoy vacío).
6. **Desplegar índices**: `firebase deploy --only firestore:indexes` (ya están definidos, falta aplicarlos).
7. **Mover .env a Firebase Functions config** (seguridad): no dejar secretos en repo.
8. **Upgrade Node.js 20 → 22** (`firebase.json` runtime `nodejs22`) y **firebase-functions ≥ 5.1.0** antes de Oct 2026.
9. **Test E2E manual**: registro → onboarding → producto → campaña → scraping → propuesta → mensaje → landing → pago MP → cambio de plan → WhatsApp Meta.

## Servicios externos
| Servicio | Estado |
|----------|--------|
| Firebase | ✅ Deployado (Spark) |
| Apify | Pendiente configurar token |
| MercadoPago | ✅ Código listo, pendiente token + webhook secret |
| Resend | Pendiente dominio |
| Gemini API | ✅ Configurado |
| Meta WhatsApp | ⏳ Chip llega hoy |

## Opcionales
- Sentry — monitoreo de errores
- PostHog — analytics (gratis hasta 1M eventos)
- Google Places API — ya configurado
