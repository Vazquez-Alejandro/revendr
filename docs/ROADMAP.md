# Roadmap - Revendr SaaS Engine

## Estado Actual: Testeo Interno ✅

## Pendientes para Lanzamiento

### 1. Dominio Personalizado (~$10-15/año)
- Comprar dominio (ej: revendr.app)
- Configurar en Firebase Console → Hosting → Dominios personalizados
- SSL automático incluido

### 2. WhatsApp Business (gratis hasta producción)
- Crear cuenta en Meta Business Manager
- Obtener Phone Number ID y Token
- Aprobar templates de mensajes
- **Costo:** solo al enviar mensajes reales (~$0.005-0.05/mensaje)

### 3. Stripe Producción (gratis, comisión por venta)
- Cambiar de keys test (`sk_test_`) a live (`sk_live_`)
- Activar pagos en Stripe Dashboard
- **Costo:** 2.9% + $0.30 por transacción

---

## FALTA PARA TESTEO → MERCADO

### Crítico (sin esto no funciona el core)
- [ ] Integrar Apify scraping end-to-end (conectar con el botón de campaña)
- [ ] Integrar envío real de WhatsApp (con delays inteligentes)
- [ ] Integrar generación automática de demos personalizadas
- [ ] Webhook de Stripe → crear usuario automáticamente al pagar
- [ ] Email de bienvenida al registrarse
- [ ] Email de confirmación de pago

### Importante (mejora la experiencia)
- [ ] Onboarding wizard real (guiar al usuario en los primeros pasos)
- [ ] Página de "Mi cuenta" para ver/actualizar datos
- [ ] Portal de facturación (ver historial de pagos, descargar facturas)
- [ ] Notificaciones in-app (campanita con contador)
- [ ] Búsqueda global (Cmd+K)
- [ ] Filtros guardados / vistas personalizadas
- [ ] Exportar leads a Google Sheets / Excel

### Técnico (calidad y seguridad)
- [ ] Tests unitarios (mínimo: auth, checkout, API)
- [ ] Rate limiting en la API
- [ ] Error tracking (Sentry o similar)
- [ ] Monitoring de uptime (UptimeRobot, etc.)
- [ ] Optimizar bundle (code splitting, lazy loading)
- [ ] Revisión de seguridad (OWASP checklist)
- [ ] Política de privacidad actualizada con datos reales

### Marketing / Branding
- [ ] Logo profesional + favicon
- [ ] OG Image para redes sociales
- [ ] Video demo de 60 segundos
- [ ] Testimonios / social proof
- [ ] Blog con contenido SEO
- [ ] Formulario de contacto funcional

### Post-lanzamiento
- [ ] Analytics de usuarios (PostHog, Mixpanel)
- [ ] A/B testing en pricing
- [ ] Programa de referidos
- [ ] Soporte por chat (Intercom, Crisp)
- [ ] Multi-tenancy real (datos aislados por usuario)
