# Revendr — TODO de Produccion

## Bugs corregidos (Audit 2026-08-01)
- [x] `routes/payments.js`: Fix pricing mismatch (backend $29/$79/$199 → $15/$39/$99 to match frontend)
- [x] `services/lemonsqueezy.js`: Fix PLAN_PRICES ($29/$79/$199 → $15/$39/$99)
- [x] `config.js`: Fix RESEND_FROM from `onboarding@resend.dev` → `onboarding@revendr.app`
- [x] `firestore.rules`: Remove public read on productos, propuestas, chat_messages, whatsapp_messages, support_tickets, landing_views, landing_engagement
- [x] `routes/payments.js`: Add auth checks to /subscription/change, /subscription/cancel, /subscription/reactivate (任何人 could change anyone's plan)
- [x] `.env.example`: Created

## Pendiente
- [ ] **Configurar dominio en Resend** — `revendr.app` necesita estar verificado para que los emails no vengan de `resend.dev`
- [ ] **MP_WEBHOOK_SECRET** — Completar para verificación HMAC de webhooks de MercadoPago
- [ ] **LEMONSQUEEZY_WEBHOOK_SECRET** — Usar un secreto más fuerte (actual: `revendr_webhook_secret_2026_abc123`)
- [ ] **Rate limiting** — El rate limiter usa un Map en memoria que se resetea en cold start de Firebase Functions. Considerar usar Firestore o Redis para rate limiting persistente
- [ ] **WhatsApp phone number** — Verificar número registrado en Meta Business
- [ ] **Firebase Functions crons** — Verificar que `processScheduledMessages` funciona correctamente
- [ ] **Frontend .env** — `VITE_FIREBASE_VAPID_KEY` está vacío (Web Push no funciona)

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
