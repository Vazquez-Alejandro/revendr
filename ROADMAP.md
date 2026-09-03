# Revendr — Roadmap

> Última actualización: 2026-09-03
> El archivo `docs/ROADMAP.md` es una versión vieja/duplicada (con LemonSqueezy y 3 planes) — **ignorarlo**. Este archivo raíz es el actual.

## Estado actual (2026-09-03)
- ✅ Código completo funcional (frontend + backend)
- ✅ Proyecto Firebase creado (revendr-9add8)
- ✅ Hosting desplegado → https://revendr-9add8.web.app
- ✅ Auth (login, registro, verificación email)
- ✅ Campañas CRUD + scraping
- ✅ Leads con scoring, CSV import, filtros
- ✅ WhatsApp dual (Baileys + Meta Cloud API)
- ✅ Warmup system, business hours, quality score
- ✅ AI message generation (Gemini)
- ✅ Follow-ups, re-engagement, A/B testing
- ✅ MercadoPago (pagós USD + ARS, webhook HMAC SHA256)
- ✅ Email transaccional (Gmail/Resend fallback)
- ✅ CRM pipeline, analytics, content generation
- ✅ Telegram notifications, blacklist, team management, onboarding
- ✅ Límites de plan implementados (leads, rubros, propuestas, mensajes, emails)
- ✅ Asistente (GuidedChat) con el nuevo copy de WhatsApp
- ✅ Logo Revendr en toda la app, splash de carga, "dr" naranja

## Decisiones de negocio / modelo vigente (2026-09-03)

### Planes y precios
- **2 planes** (Enterprise fue eliminado):
  - **Starter $29** — 100 leads, 1 rubro, 50 propuestas, 900 WhatsApp, 500 emails
  - **Growth $99** (subió de $79) — 1000 leads, 3 rubros, 500 propuestas, 3000 WhatsApp, 2000 emails, A/B testing, soporte prioritario
- Anual = mensual × 12 × 0.8 (20% dcto): Starter $278.40, Growth $950.40
- Precios actualizados en: `Subscription.jsx`, `public/Pricing.jsx`, `Register.jsx`, `GuidedChat.jsx`, `functions/services/mercadopago.js` (`PLAN_PRICES_USD`)
- **⚠️ El cambio de precio (79→99) en `mercadopago.js` NO está en producción** — el deploy de functions falló (ver bloqueo abajo). Los pagos aún cobrarían $79 hasta que se despliegue.

### Modelo WhatsApp (DECISIÓN CLAVE)
- **Baileys (gratis) por defecto** — el cliente conecta su propio WhatsApp por QR, costo $0 por mensaje. Es el modo por defecto (`Settings.jsx` waMode = 'baileys').
- **API oficial solo como add-on premium** — el "número dedicado con tu marca" se ofrece como extra donde **el cliente paga el costo real** (~US$0.06/mensaje marketing en Argentina ≈ $89,56 ARS, rate card Meta 2026). NO se absorbe en el plan.
- **Razón:** con API oficial paga, 3000 msj/mes ≈ US$180 → más que el plan Growth ($99). No cierra si se absorbe. Con Baileys, costo WhatsApp = $0 y margen sano (~90%).
- Plan de chips propios del dueño: para validar MVP y para el add-on (1 chip ≈ 1 cliente activo). BASTA con chips propios en la fase inicial.

### Costos / rentabilidad (analizado 2026-09-03)
- **Scraping:** se cambió a **Google Places API (gratis)** como método principal. Apify (pago) queda como secundario/opcional.
- **Emails:** Resend (gratis hasta 3.000/mes, cubre ambos planes) + fallback Gmail SMTP → ~$0.
- **Gemini:** negligible por lead.
- **Costo WhatsApp:** $0 (Baileys) o trasladado al cliente (add-on API oficial).
- **Margen bruto estimado:** Starter ~90%, Growth ~93% (con Baileys + Places).
- **Veredicto:** SÍ vale la pena sacarla. El riesgo real es adquisición de clientes, no margen.

## ⚠️ BLOQUEADOR ACTUAL (crítico)
- **No se puede deployar functions** — error 403: "Write access to project revendr-9add8 was denied: please check billing account".
  - Cloud Functions (especialmente 2nd gen `processScheduledMessages` con pubsub scheduler) **requiere plan Blaze** (tarjeta asociada) en Firebase.
  - El hosting funciona (free), pero las functions NO.
  - **Acción:** Upgrade a Blaze en la consola Firebase (no cobra hasta superar cuotas gratuitas). Luego reintentar deploy.
  - **Impacto:** hasta resolver esto, los cambios de `mercadopago.js` (precio 99) y cualquier cambio de functions NO están en producción.
  - **Nota:** hace unos días se resolvió borrando y recreando la función `api` (`functions:delete api --force` + `deploy --only functions:api`), pero ese workaround hoy también falla por el 403 de billing.

## Pendiente para salir a producción (lo que NO es código)

### Crítico para cobrar
1. **Upgrade Firebase a plan Blaze** — desbloquear deploy de functions (bloqueador actual).
2. **Reintentar deploy de functions** después del upgrade → subir precio Growth $99 en `mercadopago.js`. Verificar en producción que el pago cobre $99.
3. **Secretos de MercadoPago** en Firebase Functions config:
   - `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` (obligatorio para que el webhook valide).
4. **WhatsApp chip de Revendr** (llegó/pendiente):
   - Registrar número en Meta Business → `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
   - Verificar webhook: `https://us-central1-revendr-9add8.cloudfunctions.net/api/whatsapp/webhook`.
   - **Al hacer el setup: sacar capturas** para la guía visual de Meta (tarea pospuesta, pendiente).
5. **Dominio propio** (~$12 USD): `revendr.com.ar` (NIC.ar) o `revendr.app` → Firebase Hosting. Actualizar `FIREBASE_APP_URL` y CORS. Hoy `revendr.app` NO está registrado.
6. **Resend**: verificar dominio y setear `RESEND_API_KEY` + `RESEND_FROM=noreply@revendr.app` (hoy sale de `resend.dev`). Bloqueado por dominio.

### Importante
7. **Web Push**: generar VAPID key y setear `VITE_FIREBASE_VAPID_KEY` en `frontend/.env` (hoy vacío).
8. **Desplegar índices**: `firebase deploy --only firestore:indexes`.
9. **Mover .env a Firebase Functions config** (seguridad): no dejar secretos en repo.
10. **Upgrade Node.js 20 → 22** (`firebase.json` runtime `nodejs22`) y **firebase-functions ≥ 5.1.0** antes de Oct 2026.
11. **Test E2E manual**: registro → onboarding → producto → campaña → scraping (Places) → propuesta → mensaje (Baileys) → landing → pago MP → cambio de plan → add-on API oficial.

## Ideas / mejoras pendientes (sin fecha)
- **Panel admin para asignar número/chip a cada cliente** (asociar Phone Number ID + token a la cuenta del cliente) cuando se use API oficial como add-on. Hoy el cliente pega el token manualmente.
- **Guía visual de Meta** (rehacer la guía paso a paso con capturas reales del chip de Revendr). Ya existe la guía en `Settings.jsx` (botón "Ver guía paso a paso"), falta mejorarla visualmente.
- **Rate limiting persistente** — el limiter usa Map en memoria (se resetea en cold start). Considerar Firestore/Redis.
- **Webhook MP**: falta setear `MP_WEBHOOK_SECRET` para validar firma.
- **Verificar loop de pago MP completo** (sandbox/real) — pospuesto por el usuario.

## Servicios externos
| Servicio | Estado |
|----------|--------|
| Firebase Hosting | ✅ Deployado |
| Firebase Functions | ⚠️ **BLOQUEADO** (requiere plan Blaze) |
| Google Places API | ✅ Configurado y ahora método principal (gratis) |
| Apify | ✅ Token configurado (secundario/opcional, pago) |
| MercadoPago | ✅ Código listo; pendiente subir precio 99 + token + webhook secret |
| Resend | Pendiente dominio |
| Gemini API | ✅ Configurado (gratis) |
| Meta WhatsApp | ⏳ Chip de Revendr; add-on API oficial cuando escale |
| Baileys | ✅ Gratis, método por defecto |

## Opcionales
- Sentry — monitoreo de errores
- PostHog — analytics (gratis hasta 1M eventos)
