const { db } = require('../config')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function generatePersonalizedMessage(lead, context = {}) {
  if (!OPENAI_API_KEY) {
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
  const tone = context.tone || 'amigable y directo'
  const language = context.language || 'es'

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 200,
      }),
    })

    const data = await response.json()
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim()
    }
  } catch (error) {
    console.error('AI message generation error:', error.message)
  }

  return generateFallbackMessage(lead, context)
}

function generateFallbackMessage(lead, context = {}) {
  const nombre = lead.nombre_negocio || 'tu negocio'
  const rubro = lead.rubro || 'negocio'
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
    await new Promise(r => setTimeout(r, 500))
  }
  return results
}

module.exports = { generatePersonalizedMessage, generateBulkMessages, generateFallbackMessage }
