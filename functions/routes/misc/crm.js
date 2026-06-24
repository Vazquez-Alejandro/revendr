const { admin, db } = require('../../config')

module.exports = function(app) {

app.get('/crm/pipeline', async (req, res) => {
  try {
    const { campaignId } = req.query
    let query = db.collection('leads')
    if (campaignId) query = query.where('id_campania', '==', campaignId)
    const snapshot = await query.get()
    const pipeline = { nuevo: [], contactado: [], interesado: [], negociacion: [], cerrado: [], perdido: [] }
    snapshot.docs.forEach(doc => { const lead = doc.data(); const stage = lead.crm_stage || 'nuevo'; if (pipeline[stage]) pipeline[stage].push({ id: doc.id, ...lead }) })
    const stageOrder = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    const labels = { nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', negociacion: 'Negociación', cerrado: 'Cerrado', perdido: 'Perdido' }
    res.json({ success: true, data: { pipeline: stageOrder.map(s => ({ stage: s, label: labels[s], count: pipeline[s].length, leads: pipeline[s].slice(0, 10) })), total: snapshot.size } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/crm/leads/:leadId/stage', async (req, res) => {
  try {
    const { stage } = req.body
    const validStages = ['nuevo', 'contactado', 'interesado', 'negociacion', 'cerrado', 'perdido']
    if (!validStages.includes(stage)) return res.status(400).json({ success: false, error: { message: 'Invalid stage' } })
    await db.collection('leads').doc(req.params.leadId).update({ crm_stage: stage, fecha_actualizacion: new Date() })
    await db.collection('crm_events').add({ lead_id: req.params.leadId, event_type: 'stage_change', new_stage: stage, description: `Cambio a ${({ nueo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', negociacion: 'Negociación', cerrado: 'Cerrado', perdido: 'Perdido' }[stage]) || stage}`, timestamp: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/crm/leads/:leadId/activity', async (req, res) => {
  try {
    const { type, description, value } = req.body
    await db.collection('crm_events').add({ lead_id: req.params.leadId, event_type: type || 'note', description: description || '', value: value || null, timestamp: new Date() })
    if (type === 'call') await db.collection('leads').doc(req.params.leadId).update({ llamadas_count: admin.firestore.FieldValue.increment(1), fecha_ultima_llamada: new Date() })
    if (type === 'meeting') await db.collection('leads').doc(req.params.leadId).update({ reuniones_count: admin.firestore.FieldValue.increment(1), fecha_ultima_reunion: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/crm/leads/:leadId/timeline', async (req, res) => {
  try {
    const snapshot = await db.collection('crm_events').where('lead_id', '==', req.params.leadId).orderBy('timestamp', 'desc').limit(50).get()
    res.json({ success: true, data: snapshot.docs.map(doc => { const d = doc.data(); return { id: doc.id, ...d, timestamp: d.timestamp?.toDate?.()?.toISOString() || d.timestamp, edited_at: d.edited_at?.toDate?.()?.toISOString() || null } }) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.put('/crm/events/:eventId', async (req, res) => {
  try {
    const { description } = req.body
    if (!description) return res.status(400).json({ success: false, error: { message: 'Description is required' } })
    await db.collection('crm_events').doc(req.params.eventId).update({ description, edited_at: new Date() })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/crm/events/:eventId', async (req, res) => {
  try { await db.collection('crm_events').doc(req.params.eventId).delete(); res.json({ success: true }) }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
