# Revendr — TODO de Producción

> Última actualización: 2026-09-03

## Bloqueador actual (urgente)
- [ ] **Upgrade Firebase a plan Blaze** — desbloquear deploy de functions (403 billing). Sin esto no suben cambios de `mercadopago.js` ni nada de functions.
- [ ] **Reintentar deploy de functions** → confirmar que el pago Growth cobra **$99** (hoy cae a $79 en producción).

## Config / productos en producción
- [ ] **Secretos MP** — `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` en Firebase Functions config.
- [ ] **WhatsApp chip de Revendr** — registrar en Meta, setear `WHATSAPP_TOKEN/PHONE_ID/VERIFY_TOKEN/APP_SECRET`, verificar webhook. Sacar capturas para la guía.
- [ ] **Dominio** — comprar `revendr.com.ar` (NIC.ar), conectar Firebase Hosting, actualizar `FIREBASE_APP_URL`/CORS.
- [ ] **Resend** — verificar dominio, `RESEND_API_KEY` + `RESEND_FROM=noreply@revendr.app`.
- [ ] **Desplegar índices** — `firebase deploy --only firestore:indexes`.
- [ ] **Web Push** — generar VAPID key → `VITE_FIREBASE_VAPID_KEY`.
- [ ] **Mover .env a Functions config** (seguridad).
- [ ] **Upgrade** Node 20→22 y firebase-functions ≥5.1 antes de Oct 2026.

## Test / validación
- [ ] **Test E2E manual** completo (registro → producto → campaña → scraping Places → propuesta → mensaje Baileys → landing → pago MP → cambio plan → add-on API oficial).
- [ ] **Verificar loop de pago MP completo** (sandbox/real) — pospuesto por el usuario.
- [ ] **Smoke tests** de nuevo tras cambios (tests/smoke-test.js).

## Mejoras / features (sin fecha)
- [ ] **Panel admin para asignar número/chip a cada cliente** (asociar Phone Number ID + token a la cuenta del cliente) — para el add-on API oficial.
- [ ] **Guía visual de Meta** — rehacer la guía paso a paso con capturas reales del chip de Revendr.
- [ ] **Rate limiting persistente** — el limiter usa Map en memoria (se resetea en cold start). Considerar Firestore/Redis.
- [ ] **Verificar que el add-on API oficial cobre el costo real al cliente** (no absorber en el plan).
- [ ] **Probar portabilidad/durabilidad de número** para power-users que quieran su chip propio.

## Marketing
- [ ] Crear post de lanzamiento para redes sociales
- [ ] Configurar Google Analytics / Umami
- [ ] Crear demo video walkthrough

## Technical improvements
- [ ] Add error tracking (Sentry — ya parcial implementado)
- [ ] Add request logging
- [ ] Add health check dashboard
