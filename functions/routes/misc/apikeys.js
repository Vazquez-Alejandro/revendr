const { db } = require('../../config')

module.exports = function(app) {

app.post('/api-keys/generate', async (req, res) => {
  try {
    const { name } = req.body
    const userId = req.user.uid
    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection('api_keys').doc(keyId).set({ user_id: userId, name: name || 'Default Key', active: true, created_at: new Date(), uses: 0 })
    res.json({ success: true, data: { api_key: keyId } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/api-keys/revoke', async (req, res) => {
  try {
    const { keyId } = req.body
    const keyDoc = await db.collection('api_keys').doc(keyId).get()
    if (!keyDoc.exists) return res.status(404).json({ success: false, error: { message: 'API key not found' } })
    if (keyDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('api_keys').doc(keyId).update({ active: false })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/api-keys/client/generate', async (req, res) => {
  try {
    const { name } = req.body
    const userId = req.user.uid
    const keyId = `rk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    await db.collection('api_keys').doc(keyId).set({ user_id: userId, name: name || 'Default Key', active: true, created_at: new Date(), uses: 0, last_used: null })
    res.json({ success: true, data: { api_key: keyId, name: name || 'Default Key' } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/api-keys/client/:userId', async (req, res) => {
  try {
    if (req.params.userId !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    const snapshot = await db.collection('api_keys').where('user_id', '==', req.params.userId).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), api_key_preview: doc.id.slice(0, 12) + '...' })) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/api-keys/client/:keyId', async (req, res) => {
  try {
    const keyDoc = await db.collection('api_keys').doc(req.params.keyId).get()
    if (!keyDoc.exists) return res.status(404).json({ success: false, error: { message: 'API key not found' } })
    if (keyDoc.data().user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('api_keys').doc(req.params.keyId).update({ active: false })
    res.json({ success: true })
  }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
