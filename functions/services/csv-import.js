const { db } = require('../config')

async function importLeadsFromCSV(userId, leads, productId = null) {
  const results = { imported: 0, skipped: 0, errors: [] }

  for (const lead of leads) {
    try {
      if (!lead.nombre_negocio || !lead.telefono_whatsapp) {
        results.skipped++
        results.errors.push({ row: lead.row, error: 'Missing nombre_negocio or telefono_whatsapp' })
        continue
      }

      const phone = lead.telefono_whatsapp.replace(/\D/g, '')
      if (phone.length < 8) {
        results.skipped++
        results.errors.push({ row: lead.row, error: 'Invalid phone number' })
        continue
      }

      const existing = await db.collection('leads')
        .where('user_id', '==', userId)
        .where('telefono_whatsapp', '==', phone)
        .limit(1)
        .get()

      if (!existing.empty) {
        results.skipped++
        continue
      }

      await db.collection('leads').add({
        user_id: userId,
        nombre_negocio: lead.nombre_negocio,
        telefono_whatsapp: phone,
        email: lead.email || '',
        rubro: lead.rubro || '',
        direccion: lead.direccion || '',
        product_id: productId,
        estado_proceso: 'nuevo',
        fecha_creacion: new Date(),
        lead_score: 0,
        landing_views: 0,
        cta_clicks: 0,
      })

      results.imported++
    } catch (error) {
      results.skipped++
      results.errors.push({ row: lead.row, error: error.message })
    }
  }

  return results
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const leads = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const lead = { row: i + 1 }

    headers.forEach((header, index) => {
      if (header === 'nombre' || header === 'nombre_negocio' || header === 'business' || header === 'name') {
        lead.nombre_negocio = values[index] || ''
      } else if (header === 'telefono' || header === 'phone' || header === 'whatsapp' || header === 'tel') {
        lead.telefono_whatsapp = values[index] || ''
      } else if (header === 'email' || header === 'correo') {
        lead.email = values[index] || ''
      } else if (header === 'rubro' || header === 'category' || header === 'industry') {
        lead.rubro = values[index] || ''
      } else if (header === 'direccion' || header === 'address') {
        lead.direccion = values[index] || ''
      }
    })

    if (lead.nombre_negocio || lead.telefono_whatsapp) {
      leads.push(lead)
    }
  }

  return leads
}

module.exports = { importLeadsFromCSV, parseCSV }
