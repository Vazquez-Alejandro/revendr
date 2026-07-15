# Roadmap - Revendr SaaS Engine

## Estado Actual: WhatsApp + Pagos + Anti-Ban Implementados ✅

Revendr ahora es una plataforma para **vender productos SaaS** mediante prospección automatizada con WhatsApp dual-mode y sistema anti-ban completo.

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
- [x] Code splitting con lazy loading

### WhatsApp
- [x] Baileys provider — conexión QR, sin costo por mensaje
- [x] Meta Cloud API provider — oficial, ~$0.05/msg marketing
- [x] Sistema anti-ban warm-up (5 días progresivos: 10→30 msg/día)
- [x] Quality score basado en landing page visits/conversions
- [x] Safe mode rate limits (Starter: 8/hr, Growth: 15/hr, Enterprise: 30/hr)
- [x] Desconexión con aviso claro al usuario
- [x] Delay aleatorio entre mensajes (30-90 segundos)
- [x] Solo enviar en horario laboral (9am-8pm)
- [x] Pausar envíos si quality score < 40%
- [x] Preview de mensaje antes de enviar
- [x] Historial de mensajes con stats
- [x] Seguimiento automático (3 intentos, 3 días entre ellos, bloqueo 40 días)
- [x] Re-engagement automático (cuando lead vuelve después de ser ignorado)
- [x] Alertas de re-engagement en Dashboard

### Pagos
- [x] LemonSqueezy integrado (reemplazó Stripe)
- [x] Checkout con 6 variant IDs (mensual + anual × 3 planes)
- [x] Webhook handler para subscription_created/updated/cancelled
- [x] Precios: Starter $29, Growth $79, Enterprise $199
- [x] Anual con 20% off: Starter $278.40, Growth $758.40, Enterprise $1,910.40

### Engagement
- [x] Categorización de leads: engaged/viewed/ignored/converted/pending
- [x] Detección de re-engagement (leads que reaparecen)
- [x] Filtros de engagement en Leads page

### Testing
- [x] Smoke tests (12 tests): config, warmup, engagement, followup, reengagement, message-log, lemonsqueezy, ai-message

---

## 🔲 Pendientes

### CRÍTICO
- [ ] **Activar tienda LemonSqueezy** — Conectar Stripe en dashboard de LemonSqueezy para recibir pagos reales
- [ ] **Probar Baileys end-to-end** — Escanear QR, enviar mensaje, verificar warm-up

### IMPORTANTE
- [ ] **Video tutorial Meta API** — Guiar al usuario paso a paso (outsourcing pendiente)
- [ ] **Pausar/Reanudar envíos** — Control fino del envío (botón manual)
- [ ] **Pool de números** — Distribuir envíos entre varios números (opcional, para usuarios avanzados)

### TÉCNICO
- [ ] **Tests de integración** — Probar endpoints con requests reales
- [ ] **Revisión de seguridad** — OWASP checklist
- [ ] **Dominio propio** — Comprar revendr.app

### UX / DISEÑO
- [ ] **Logo y branding** — Logo profesional + favicon
- [ ] **Responsive mobile** — Optimizar para celular
- [ ] **Empty states** — Estados vacíos con acciones sugeridas

---

## 🧪 Lo que tenés que probar (TESTEO MANUAL)

### 1. Flujo completo de registro y onboarding
- [ ] Ir a https://revendr-9add8.web.app
- [ ] Click en "Comenzar gratis"
- [ ] Completar registro con email y contraseña
- [ ] Completar onboarding (nombre, rubro, etc.)
- [ ] Verificar que aparece el dashboard

### 2. Productos
- [ ] Ir a Dashboard → Productos
- [ ] Crear un producto nuevo (nombre, descripción, precio)
- [ ] Editar el producto
- [ ] Eliminar el producto
- [ ] Verificar que aparece en la lista

### 3. Landing Page
- [ ] Ir a Dashboard → Productos → Ver landing
- [ ] Personalizar título, color, CTA
- [ ] Guardar cambios
- [ ] Abrir la URL de la landing en otro navegador
- [ ] Verificar que se ve correcta

### 4. Leads
- [ ] Ir a Dashboard → Leads
- [ ] Crear un lead manual (nombre, teléfono, email)
- [ ] Editar el lead
- [ ] Verificar que aparece en el pipeline
- [ ] Filtrar por estado de engagement
- [ ] Hacer click en un lead y ver el detalle

### 5. WhatsApp Preview
- [ ] Ir a un lead con teléfono
- [ ] Click en "WhatsApp"
- [ ] Ver el modal de preview
- [ ] Escribir un mensaje
- [ ] Click en "Ver cómo se ve en WhatsApp"
- [ ] Verificar que el preview se ve correcto

### 6. AI Message Generator
- [ ] Ir a un lead con teléfono
- [ ] Click en "Generar con IA"
- [ ] Escribir contexto del producto
- [ ] Click en "Generar"
- [ ] Verificar que aparece un mensaje sugerido

### 7. Message History
- [ ] Ir a Settings → WhatsApp
- [ ] Verificar que aparece "Historial de mensajes"
- [ ] Verificar que muestra stats (total, enviados, fallidos)

### 8. Follow-up System
- [ ] Verificar que los leads tienen estado de follow-up
- [ ] Verificar que el endpoint /whatsapp/followup/leads funciona
- [ ] Verificar que el endpoint /whatsapp/followup/:leadId funciona

### 9. CRM Pipeline
- [ ] Ir a Dashboard → CRM
- [ ] Arrastrar un lead de una columna a otra
- [ ] Verificar que se guarda el cambio
- [ ] Click en un lead para ver detalles

### 10. Campañas
- [ ] Ir a Dashboard → Campañas
- [ ] Crear una campaña nueva
- [ ] Asociarla a un producto
- [ ] Verificar que aparece en la lista

### 11. Subscription
- [ ] Ir a Dashboard → Subscription
- [ ] Verificar que aparecen los 3 planes
- [ ] Verificar que el toggle mensual/anual funciona
- [ ] Verificar que los precios se actualizan correctamente

### 12. Settings
- [ ] Ir a Dashboard → Settings
- [ ] Verificar que WhatsApp tab muestra estado
- [ ] Verificar que Billing tab muestra planes
- [ ] Verificar que Notifications tab funciona
- [ ] Verificar que Security tab permite cambiar contraseña

### 13. Anti-Ban Checks
- [ ] Verificar que el delay aleatorio funciona (30-90s)
- [ ] Verificar que solo se puede enviar en horario laboral (9am-8pm)
- [ ] Verificar que se pausa si quality score < 40%

### 14. Páginas públicas
- [ ] Ir a https://revendr-9add8.web.app (Landing)
- [ ] Ir a /pricing
- [ ] Ir a /help
- [ ] Ir a /privacy
- [ ] Ir a /terms
- [ ] Verificar que todas se ven correctas

### 15. Responsive
- [ ] Abrir la app en el celular
- [ ] Navegar por las diferentes secciones
- [ ] Verificar que se ve bien en mobile

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
| Gemini AI | Generación de mensajes | Gratis (15 req/min) |
