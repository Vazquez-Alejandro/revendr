# Guía: Aprobación de WhatsApp Templates

Para enviar mensajes masivos por WhatsApp necesitás plantillas aprobadas por Meta.

## Paso 1: Crear cuenta Business Manager

1. Andá a https://business.facebook.com/
2. Creá una cuenta o usá una existente
3. Completá los datos del negocio

## Paso 2: Configurar WhatsApp Business

1. En Business Manager, andá a **Business Settings** → **WhatsApp Accounts**
2. Clic en **Add WhatsApp Account**
3. Ingresá tu número de teléfono (puede ser un número nuevo)
4. Verificá el número por SMS o llamada

## Paso 3: Crear Message Templates

1. Andá a https://business.facebook.com/wa/manage/message-templates/
2. Clic en **Create Template**
3. Elegí la categoría: **MARKETING** o **UTILITY**

### Template de ejemplo para prospección:

```
Nombre: prospeccion_{{1}}

Categoría: Marketing

Idioma: Español (LATAM)

Body:
Hola {{1}}, somos Revendr y te propusimos algo especial para tu negocio.

Mirá esta propuesta personalizada: {{2}}

Si te interesa, respondé este mensaje y te damos más info.

Footer:
Revendr - Software para tu negocio

Botones:
[URL] Ver mi propuesta → {{2}}
```

### Variables:
- `{{1}}` = nombre del negocio
- `{{2}}` = URL de la propuesta

## Paso 4: Enviar para aprobación

1. Después de crear el template, hacé clic en **Submit for Review**
2. Meta tarda entre 24-48 horas en aprobar
3. Una vez aprobado, aparece con estado **Approved**

## Paso 5: Usar en tu app

Una vez aprobado, usá la API así:

```javascript
const response = await axios.post(
  `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: 'whatsapp',
    to: '5491112345678',
    type: 'template',
    template: {
      name: 'prospeccion',
      language: { code: 'es' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: 'Bella Estética' },
          { type: 'text', text: 'https://revendr-9add8.web.app/demo/estetica/123' },
        ],
      }],
    },
  },
  {
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }
)
```

## Errores comunes

| Error | Solución |
|-------|----------|
| `130429` | Rate limit. Esperá unos minutos |
| `131047` | El usuario no te escribió en 24h. Usá template |
| `132001` | Template no existe o no está aprobado |
| `132005` | Template rechazado. Revisá el contenido |

## Tips

- No incluyas links sospechosos
- El primer mensaje DEBE ser un template
- Después de que el usuario responda, podés escribir libre por 24h
- Usá el botón CTA para links de demo
