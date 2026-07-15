const { db } = require('../config')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

async function generatePersonalizedMessage(lead, context = {}) {
  if (!GEMINI_API_KEY) {
    return generateFallbackMessage(lead, context)
  }

  const leadData = {
    nombre: lead.nombre_negocio || 'tu negocio',
    rubro: lead.rubro || 'general',
    ciudad: lead.ciudad || '',
    calificacion: lead.calificacion || null,
    reseñas: lead.reseñas || null,
    horarios: lead.horarios || null,
    web: lead.datos_personalizados?.website || null,
    telefono: lead.telefono_whatsapp || null,
  }

  const productContext = context.productContext || 'una herramienta digital para hacer crecer tu negocio'

  const prompt = `Sos una persona real que le escribe por WhatsApp a un negocio local. NO sos un bot. Escribís como escribiría una persona normal: con errores tipográficos ocasionales, abreviaciones, sin ser demasiado formal.

DATOS DEL NEGOCIO:
- Nombre: ${leadData.nombre}
- Rubro: ${leadData.rubro}
- Ciudad: ${leadData.ciudad || 'no especificada'}
- Calificación Google: ${leadData.calificacion ? `${leadData.calificacion} estrellas` : 'sin datos'}
- Tiene web: ${leadData.web ? 'Sí' : 'No'}

CONTEXTO:
Estás vendiendo: ${productContext}

REGLAS ESTRICTAS:
1. Mensaje MÁXIMO de 2-3 oraciones cortas
2. NO usar saludos genéricos como "Hola, ¿cómo estás?"
3. Mencionar algo específico del negocio (nombre, rubro, calificación)
4. Hacer UNA pregunta concreta que invite respuesta
5. NO usar signos de exclamación al inicio
6. NO usar palabras como "increíble", "fantástico", "exclusivo"
7. Sonar como alguien que envía un mensaje rápido desde el celular
8. Si el negocio tiene web, mencionarlo. Si no tiene, ofrecer ayuda
9. NUNCA decir "soy un asistente" o "te escribo de parte de..."

EJEMPLOS DE BUENOS MENSAJES:
- "Hola, vi que Taller López tiene 4.2 estrellas en Google. ¿Tienen agenda online o los clientes llaman directo?"
- "Vi tu clínica en Google. ¿Cuántos pacientes pierden por no tener turnos online? Puedo mostrarte algo que te sirve"
- "Hola, noté que tu restaurante no tiene web. ¿Te gustaría que tus clientes puedan ver el menú y reservar desde el celular?"

Generá SOLO el mensaje, sin comillas, sin explicaciones.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 150,
          },
        }),
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      return text.trim().replace(/^["']|["']$/g, '')
    }
  } catch (error) {
    console.error('Gemini message generation error:', error.message)
  }

  return generateFallbackMessage(lead, context)
}

function generateFallbackMessage(lead, context = {}) {
  const nombre = lead.nombre_negocio || 'tu negocio'
  const hasWeb = lead.datos_personalizados?.website

  const templates = [
    `Hola, vi ${nombre} en Google. ${hasWeb ? 'Vi que tienen web' : 'No vi que tengan web'}. ¿Te gustaría que tus clientes puedan encontrarte más fácil?`,
    `${nombre}, ¿cómo funcionan las reservas hoy? Puedo mostrarte algo que te ahorra tiempo`,
    `Hola, noté que ${nombre} no tiene agenda online. ¿Cuántos clientes perdés por día por eso?`,
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

async function generateBulkMessages(leads, context = {}) {
  const results = []
  for (const lead of leads) {
    const message = await generatePersonalizedMessage(lead, context)
    results.push({ leadId: lead.id, message })
    await new Promise(r => setTimeout(r, 300))
  }
  return results
}

module.exports = { generatePersonalizedMessage, generateBulkMessages, generateFallbackMessage }
