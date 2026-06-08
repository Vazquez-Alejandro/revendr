# Roadmap - Revendr SaaS Engine

## Estado Actual: Reorientación en Progreso 🔄

Revendr ahora es una plataforma para **vender productos SaaS** (Inmoxil, TurnosOnline, etc.) mediante prospección automatizada.

## ✅ Completado

### Core
- [x] React + Vite + Tailwind (frontend)
- [x] Firebase Cloud Functions (backend API)
- [x] Firebase Auth + Firestore
- [x] Scraping de Google Maps con Apify
- [x] Generación automática de demos
- [x] Envío de WhatsApp (endpoint funcionando)
- [x] Stripe checkout + webhooks (test mode)
- [x] Landing page personalizada por lead
- [x] Sección "Mis Productos" con CRUD
- [x] Campañas vinculadas a productos
- [x] Configurador de landing (título, color, CTA)
- [x] Dashboard con gráficos (Recharts)
- [x] Sistema i18n (ES/EN)
- [x] Modo oscuro/claro
- [x] Páginas públicas (Landing, Pricing, Help, Privacy, Terms)
- [x] Onboarding page
- [x] Error boundaries
- [x] Loading skeletons
- [x] Export CSV de leads

---

## 🔲 Pendientes - Lo que falta

### CRÍTICO (sin esto no funciona el core)
- [ ] **WhatsApp Business** — Crear cuenta en Meta Business Manager
- [ ] **WhatsApp Token** — Obtener Phone Number ID y Token
- [ ] **WhatsApp Templates** — Aprobar plantillas de mensajes
- [ ] **Probar envío real** — Testear con un número real
- [ ] **Conectar Inmoxil** — Registrar Inmoxil como producto con URL real
- [ ] **Conectar TurnosOnline** — Registrar TurnosOnline como producto
- [ ] **Test end-to-end** — Scraping → Landing → WhatsApp → Lead recibe

### IMPORTANTE (mejora la experiencia)
- [ ] **Onboarding wizard** — Guiar al usuario: "Primero creá tu producto, después una campaña"
- [ ] **Preview de mensaje** — Botón para ver qué recibe el lead antes de enviar
- [ ] **Segundo mensaje** — Follow-up automático si no responden en 48h
- [ ] **Tracking de aperturas** — Saber si el lead hizo click en el link
- [ ] **Dashboard mejorado** — Métricas de conversión por producto
- [ ] **Filtros en leads** — Por producto, campaña, estado
- [ ] **Búsqueda en leads** — Buscar por nombre, teléfono
- [ ] **Paginación real** — Los leads se cargan por páginas
- [ ] **Editar campaña** — Modificar campaña existente
- [ ] **Pausar/Reanudar envíos** — Control fino del envío
- [ ] **Cola de mensajes** — Ver mensajes pendientes y enviados
- [ ] **Reintentos fallidos** — Reenviar mensajes que fallaron
- [ ] **Límites de envío** — Configurar cuántos mensajes por día

### TÉCNICO (calidad y seguridad)
- [ ] **Dominio propio** — Comprar revendr.app o similar
- [ ] **Email de bienvenida** — Al registrarse
- [ ] **Email de confirmación** — Al generar demo o enviar mensaje
- [ ] **Rate limiting** — Proteger la API de abuso
- [ ] **Error tracking** — Sentry o similar
- [ ] **Monitoring** — UptimeRobot o similar
- [ ] **Tests** — Mínimo: auth, checkout, API endpoints
- [ ] **Optimizar bundle** — Code splitting, lazy loading (~1MB actual)
- [ ] **Revisión de seguridad** — OWASP checklist
- [ ] **Variables de entorno** — Migrar todo a .env (algunas hardcoded)

### UX / DISEÑO
- [ ] **Logo y branding** — Logo profesional + favicon
- [ ] **OG Image** — Imagen para redes sociales
- [ ] **Responsive mobile** — Optimizar para celular
- [ ] **Tooltips** — Ayuda contextual en formularios
- [ ] **Empty states** — Estados vacíos con acciones sugeridas
- [ ] **Confirmaciones** — "¿Estás seguro?" antes de borrar
- [ ] **Undo** — Deshacer acciones recientes
- [ ] **Filtros guardados** — Vistas personalizadas de leads

### MARKETING
- [ ] **Video demo** — 60 segundos mostrando el producto
- [ ] **Testimonios** — Social proof en landing pública
- [ ] **Blog SEO** — Contenido para atraer tráfico
- [ ] **Formulario de contacto** — En landing pública
- [ ] **Pricing real** — Definir planes y precios

### POST-LANZAMIENTO
- [ ] **Analytics** — PostHog o Mixpanel
- [ ] **A/B testing** — Probar diferentes mensajes
- [ ] **Programa de referidos** — Recompensar referidos
- [ ] **Soporte por chat** — Intercom o Crisp
- [ ] **Multi-tenancy** — Datos aislados por usuario
- [ ] **API pública** — Para integraciones
- [ ] **Webhooks** — Notificaciones a sistemas externos

---

## 📋 Lo que tiene que hacer el usuario

### Para producción
1. [ ] Crear cuenta en Meta Business Manager
2. [ ] Verificar negocio en Meta
3. [ ] Obtener Phone Number ID y WhatsApp Token
4. [ ] Aprobar plantillas de mensajes en Meta
5. [ ] Comprar dominio (ej: revendr.app)
6. [ ] Configurar dominio en Firebase Console
7. [ ] Conectar Inmoxil a Revendr (registrar como producto)
8. [ ] Conectar TurnosOnline a Revendr
9. [ ] Pasar Stripe a modo live
10. [ ] Probar flujo completo con un lead real

### Para testear ahora
1. [ ] Ir a Mis Productos → Editar Inmoxil
2. [ ] Configurar landing (título, descripción, color)
3. [ ] Crear campaña "Test" → elegir Inmoxil
4. [ ] Esperar scraping (~1-5 min)
5. [ ] Hacer click en "Demos"
6. [ ] Verificar que la landing se genera correctamente
7. [ ] (WhatsApp no funciona sin token — es normal)

---

## 🏗️ Stack Actual

| Servicio | Uso | Costo |
|---|---|---|
| Firebase Hosting | Deploy frontend | Gratis |
| Firebase Functions | API backend | Gratis tier |
| Firebase Firestore | Base de datos | Gratis tier |
| Firebase Auth | Autenticación | Gratis |
| Apify | Scraping Google Maps | $49/mes |
| Stripe | Pagos | 2.9% + $0.30/txn |
| WhatsApp Business | Envío mensajes | ~$0.005-0.05/msg |
| Vercel | Deploy apps cliente | Gratis |
| GitHub | Control de versiones | Gratis |
