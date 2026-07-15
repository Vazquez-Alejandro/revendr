# Roadmap - Revendr SaaS Engine

## Estado Actual: WhatsApp + Pagos Implementados ✅

Revendr ahora es una plataforma para **vender productos SaaS** mediante prospección automatizada con WhatsApp dual-mode.

## ✅ Completado

### Core
- [x] React + Vite + Tailwind (frontend)
- [x] Firebase Cloud Functions (backend API)
- [x] Firebase Auth + Firestore
- [x] Scraping de Google Maps con Apify
- [x] Generación automática de propuestas
- [x] WhatsApp dual-mode: Baileys (gratis) + Meta Cloud API (oficial)
- [x] LemonSqueezy checkout + webhooks (reemplazó Stripe)
- [x] Billing toggle mensual/anual con 20% descuento
- [x] Landing page personalizada por lead
- [x] Sección "Mis Productos" con CRUD
- [x] Campañas vinculadas a productos
- [x] Configurador de landing (título, color, CTA)
- [x] Dashboard con gráficos (Recharts)
- [x] Sistema i18n (ES/EN)
- [x] Modo oscuro/claro
- [x] Páginas públicas (Landing, Pricing, Help, Privacy, Terms)
- [x] Onboarding page
- [x] Error boundaries + Loading skeletons
- [x] Export CSV de leads
- [x] CRM Pipeline con drag-and-drop
- [x] Settings simplificado (WhatsApp, Billing, Notifications, Security)

### WhatsApp
- [x] Baileys provider — conexión QR, sin costo por mensaje
- [x] Meta Cloud API provider — oficial, ~$0.05/msg marketing
- [x] Sistema anti-ban warm-up (5 días progresivos: 10→30 msg/día)
- [x] Quality score basado en landing page visits/conversions
- [x] Safe mode rate limits (Starter: 8/hr, Growth: 15/hr, Enterprise: 30/hr)
- [x] Desconexión con aviso claro al usuario

### Pagos
- [x] LemonSqueezy integrado (reemplazó Stripe)
- [x] Checkout con 6 variant IDs (mensual + anual × 3 planes)
- [x] Webhook handler para subscription_created/updated/cancelled
- [x] Precios: Starter $29, Growth $79, Enterprise $199
- [x] Anual con 20% off: Starter $278.40, Growth $758.40, Enterprise $1,910.40

### Engagement
- [x] Categorización de leads: engaged/viewed/ignored/converted/pending
- [x] Detección de re-engagement (leads que reaparecen)

---

## 🔲 Pendientes

### CRÍTICO
- [ ] **Activar tienda LemonSqueezy** — Conectar Stripe en dashboard de LemonSqueezy para recibir pagos reales
- [ ] **Probar Baileys end-to-end** — Escanear QR, enviar mensaje, verificar warm-up

### IMPORTANTE
- [ ] **Filtros de engagement en Leads** — Filtrar por estado: engaged, viewed, ignored, converted
- [ ] **Alertas de re-engagement** — Notificar cuando un lead contactado vuelve a aparecer
- [ ] **Video tutorial Meta API** — Guiar al usuario paso a paso (outsourcing pendiente)
- [ ] **Preview de mensaje** — Botón para ver qué recibe el lead antes de enviar
- [ ] **Segundo mensaje** — Follow-up automático si no responden en 48h
- [ ] **Cola de mensajes** — Ver mensajes pendientes y enviados
- [ ] **Pausar/Reanudar envíos** — Control fino del envío

### TÉCNICO
- [ ] **Optimizar bundle** — Code splitting, lazy loading (~1MB actual)
- [ ] **Tests** — Mínimo: auth, checkout, API endpoints
- [ ] **Revisión de seguridad** — OWASP checklist
- [ ] **Dominio propio** — Comprar revendr.app

### UX / DISEÑO
- [ ] **Logo y branding** — Logo profesional + favicon
- [ ] **Responsive mobile** — Optimizar para celular
- [ ] **Empty states** — Estados vacíos con acciones sugeridas

---

## 📋 Lo que tiene que hacer el usuario

### Para cobrar
1. [ ] Ir a LemonSqueezy → Settings → Billing
2. [ ] Conectar cuenta de Stripe
3. [ ] Activar la tienda

### Para Meta WhatsApp (opcional)
1. [ ] Crear cuenta en Meta Business Manager
2. [ ] Obtener Phone Number ID y WhatsApp Token
3. [ ] Pegar en .env: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
4. [ ] Conectar en Settings → WhatsApp → Meta API

### Para Baileys (gratis, recomendado)
1. [ ] Ir a Settings → WhatsApp
2. [ ] Seleccionar "Baileys (Gratis)"
3. [ ] Escanear el QR con WhatsApp del teléfono
4. [ ] ¡Listo para enviar!

---

## 🏗️ Stack Actual

| Servicio | Uso | Costo |
|---|---|---|
| Firebase Hosting | Deploy frontend | Gratis |
| Firebase Functions | API backend | Gratis tier |
| Firebase Firestore | Base de datos | Gratis tier |
| Firebase Auth | Autenticación | Gratis |
| Apify | Scraping Google Maps | $49/mes |
| LemonSqueezy | Pagos (Merchant of Record) | 5% + $0.50/txn |
| Baileys | WhatsApp gratis | $0/msg (riesgo de ban) |
| Meta Cloud API | WhatsApp oficial | ~$0.05/msg marketing |
