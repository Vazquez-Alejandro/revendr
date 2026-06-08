# Revendr - SaaS Engine para Revender Aplicaciones

Plataforma automatizada de prospección y venta de productos SaaS. Busca leads, genera landing pages personalizadas y envía mensajes de WhatsApp automáticamente.

**Deploy:** https://revendr-9add8.web.app  
**Backend API:** https://us-central1-revendr-9add8.cloudfunctions.net/api

## Stack

### Frontend
| Servicio | Uso |
|---|---|
| [React 18](https://react.dev) + [Vite](https://vitejs.dev) | Framework UI y bundler |
| [Tailwind CSS](https://tailwindcss.com) | Estilos |
| [Recharts](https://recharts.org) | Gráficos del dashboard |
| [React Router](https://reactrouter.com) | Rutas SPA |
| [React Hot Toast](https://react-hot-toast.com) | Notificaciones |
| [Lucide React](https://lucide.dev) | Iconos |
| [Firebase Auth](https://firebase.google.com/docs/auth) | Autenticación |

### Backend
| Servicio | Uso |
|---|---|
| [Firebase Cloud Functions](https://firebase.google.com/docs/functions) | API REST (Node.js 20) |
| [Firebase Firestore](https://firebase.google.com/docs/firestore) | Base de datos NoSQL |
| [Firebase Hosting](https://firebase.google.com/docs/hosting) | Hosting estático + SSL |
| [Apify](https://apify.com) | Scraping de Google Maps |
| [Axios](https://axios-http.com) | HTTP client |

### Servicios Externos
| Servicio | Uso | Plan |
|---|---|---|
| [Stripe](https://stripe.com) | Pagos, suscripciones, webhooks | Test mode |
| [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/) | Envío de mensajes | Pendiente configurar |
| [Vercel](https://vercel.com) | Deploy de apps cliente (Inmoxil, TurnosOnline) | Free tier |

### Apps Cliente (productos que se revenden)
| App | Descripción | Deploy |
|---|---|---|
| [Inmoxil](https://inmoxil.vercel.app) | SaaS para inmobiliarias (scraping, flyers, facturación) | Vercel |
| [TurnosOnline](https://turnos-online.vercel.app) | Sistema de turnos para negocios | Vercel |

## Arquitectura

```
Revendr (Plataforma)
├── Mis Productos → El usuario registra qué vende
│   ├── Nombre, descripción, URLs
│   ├── Configuración de landing (título, color, CTA)
│   └── Mensaje de WhatsApp personalizado
│
├── Campañas → Se vinculan a un producto
│   ├── Scraping de Google Maps (Apify)
│   ├── Generación de landing personalizada por lead
│   └── Envío de WhatsApp con link a landing
│
├── Leads → Base de datos de negocios contactados
│   ├── Scraped → Demo Generada → Mensaje Enviado → Interesado → Cliente
│   └── Export CSV
│
└── Dashboard → Métricas en tiempo real
    ├── Leads por día, demos, envíos
    └── Gráficos interactivos
```

## Flujo de Uso

1. **Crear producto** → Registrar Inmoxil/TurnosOnline con su URL y mensaje
2. **Crear campaña** → Elegir producto, nicho y ciudad
3. **Scraping** → Revendr busca negocios en Google Maps
4. **Landing** → Se genera una landing personalizada por lead
5. **WhatsApp** → Se envía el link de la landing al lead
6. **Conversión** → El lead ve la landing y contacta al vendedor

## Variables de Entorno

### Frontend (`frontend/.env`)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_API_URL=https://us-central1-revendr-9add8.cloudfunctions.net/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (`functions/.env`)
```
APIFY_TOKEN=apify_api_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
WHATSAPP_TOKEN=...          # Pendiente
PHONE_NUMBER_ID=...         # Pendiente
```

## Inicio Rápido

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd functions && npm install && npm run serve
```

## Deploy

```bash
# Todo junto
firebase deploy

# Solo funciones
firebase deploy --only functions

# Solo hosting
firebase deploy --only hosting

# Solo reglas de Firestore
firebase deploy --only firestore:rules,firestore:indexes
```

## Estructura del Proyecto

```
revendr/
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── contexts/            # Auth, Theme, I18n
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Métricas y gráficos
│   │   │   ├── Products.jsx     # CRUD de productos
│   │   │   ├── Campaigns.jsx    # Campañas vinculadas a productos
│   │   │   ├── Leads.jsx        # Lista de leads
│   │   │   ├── Settings.jsx     # API keys, facturación
│   │   │   └── public/          # Páginas públicas
│   │   │       ├── Landing.jsx
│   │   │       ├── Pricing.jsx
│   │   │       ├── DemoProductLanding.jsx  # Landing personalizada por lead
│   │   │       └── DemoBooking/Properties/Clinic.jsx  # Demos de ejemplo
│   │   └── services/
│   │       ├── api.js           # Cliente API
│   │       └── stripe.js        # Checkout Stripe
│   └── .env                     # Firebase config + API URL
│
├── functions/                   # Firebase Cloud Functions
│   ├── index.js                 # Toda la lógica backend
│   ├── .env                     # API keys (gitignored)
│   └── templates/               # Templates de email
│
├── firestore.rules              # Reglas de seguridad Firestore
├── firestore.indexes.json       # Índices compuestos
└── firebase.json                # Configuración Firebase
```

## Costos Estimados

| Servicio | Costo | Notas |
|---|---|---|
| Firebase Hosting | Gratis | 10 GB storage, 10 GB/mes transfer |
| Firebase Functions | Gratis tier | 2M invocaciones/mes |
| Firebase Firestore | Gratis tier | 50K lecturas, 20K escrituras/día |
| Apify | $49/mes | Plan Starter, 49 Actor compute units |
| Stripe | 2.9% + $0.30/txn | Solo en producción |
| WhatsApp Business | ~$0.005-0.05/mensaje | Pay per message |
| Dominio | ~$10-15/año | Opcional |
