# Revendr — TODO de Produccion

## Bugs corregidos (Audit 2026-08-01)
- [x] `routes/payments.js`: Fix pricing mismatch (backend $29/$79/$199 → $15/$39/$99 to match frontend)
- [x] `services/lemonsqueezy.js`: Fix PLAN_PRICES ($29/$79/$199 → $15/$39/$99)
- [x] `config.js`: Fix RESEND_FROM from `onboarding@resend.dev` → `onboarding@revendr.app`
- [x] `firestore.rules`: Remove public read on productos, propuestas, chat_messages, whatsapp_messages, support_tickets, landing_views, landing_engagement
- [x] `routes/payments.js`: Add auth checks to /subscription/change, /subscription/cancel, /subscription/reactivate (任何人 could change anyone's plan)
- [x] `.env.example`: Created

## Pendiente (estado 2026-08-19)
- [x] **Precio unificado** — frontend + backend ya en $29/$79/$199. No hay inconsistencia.
- [x] **Webhook MP HMAC** — implementado en `routes/mercadopago.js`. Falta setear `MP_WEBHOOK_SECRET` en env.
- [x] **LemonSqueezy** — removido del código; ignorar referencias viejas.
- [ ] **Secretos MP** — setear `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` en Firebase Functions config.
- [ ] **WhatsApp (chip llega hoy)** — registrar número en Meta, setear `WHATSAPP_TOKEN/PHONE_ID/VERIFY_TOKEN/APP_SECRET`, verificar webhook.
- [ ] **Dominio + Hosting** — comprar `revendr.app`/`.com.ar`, conectar Firebase Hosting, actualizar `FIREBASE_APP_URL`/CORS.
- [ ] **Resend** — verificar dominio, `RESEND_API_KEY` + `RESEND_FROM=noreply@revendr.app`.
- [ ] **Web Push** — generar VAPID key → `VITE_FIREBASE_VAPID_KEY` en `frontend/.env`.
- [ ] **Desplegar índices** — `firebase deploy --only firestore:indexes`.
- [ ] **Rate limiting persistente** — el limiter usa Map en memoria (se resetea en cold start). Considerar Firestore/Redis.
- [ ] **Firebase Functions crons** — verificar `processScheduledMessages`.
- [ ] **Mover .env a Functions config** (seguridad).
- [ ] **Upgrade** Node 20→22 y firebase-functions ≥5.1 antes de Oct 2026.
- [ ] **Test E2E manual** completo (registro→pago→campaña→WhatsApp).

## Marketing
- [ ] Crear post de lanzamiento para redes sociales
- [ ] Configurar Google Analytics / Umami
- [ ] Crear demo video walkthrough

## Technical improvements
- [ ] Move .env to Firebase Functions config (remove from repo)
- [ ] Add error tracking (Sentry — already partially implemented)
- [ ] Add request logging
- [ ] Add health check dashboard
- [ ] Consider adding Stripe subscription management
