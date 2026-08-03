const { db, GMAIL_USER, emailTransporter, FIREBASE_APP_URL } = require('../../config')

module.exports = function(app) {

app.post('/team/invite', async (req, res) => {
  try {
    const { email, role } = req.body
    if (!email) return res.status(400).json({ success: false, error: { message: 'email required' } })
    const ownerUserId = req.user.uid
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.collection('team_invites').doc(inviteId).set({ owner_user_id: ownerUserId, email, role: role || 'member', status: 'pending', created_at: new Date(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
    let emailSent = false
    if (emailTransporter) {
      try { await emailTransporter.sendMail({ from: `"Revendr" <${GMAIL_USER}>`, to: email, subject: 'Invitación a un equipo en Revendr', html: `<p>Has sido invitado a un equipo en Revendr.</p><p>Haz click aquí para aceptar: <a href="${FIREBASE_APP_URL}/team/accept?invite=${inviteId}">Aceptar invitación</a></p>` }); emailSent = true }
      catch (e) { console.error('Error sending invite email:', e.message) }
    }
    res.json({ success: true, data: { inviteId }, emailSent })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/team/members/:ownerUserId', async (req, res) => {
  try {
    if (req.params.ownerUserId !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    const [membersSnap, invitesSnap] = await Promise.all([
      db.collection('team_members').where('owner_user_id', '==', req.params.ownerUserId).get(),
      db.collection('team_invites').where('owner_user_id', '==', req.params.ownerUserId).where('status', '==', 'pending').get(),
    ])
    res.json({ success: true, data: { members: membersSnap.docs.map(d => ({ id: d.id, ...d.data() })), pendingInvites: invitesSnap.docs.map(d => ({ id: d.id, ...d.data() })) } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/team/invite/accept', async (req, res) => {
  try {
    const { inviteId, email, role } = req.body
    if (!inviteId || !email) return res.status(400).json({ success: false, error: { message: 'inviteId and email required' } })
    const ownerUserId = req.user.uid
    await db.collection('team_members').add({ owner_user_id: ownerUserId, email, role: role || 'member', status: 'active', created_at: new Date() })
    await db.collection('team_invites').doc(inviteId).update({ status: 'accepted' })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.post('/team/invite/accept-link', async (req, res) => {
  try {
    const { inviteId } = req.body
    if (!inviteId) return res.status(400).json({ success: false, error: { message: 'inviteId required' } })
    const inviteDoc = await db.collection('team_invites').doc(inviteId).get()
    if (!inviteDoc.exists) return res.status(404).json({ success: false, error: { message: 'Invitación no encontrada' } })
    const invite = inviteDoc.data()
    if (invite.status !== 'pending') return res.status(400).json({ success: false, error: { message: 'Esta invitación ya fue procesada' } })
    if (invite.expires_at?.toDate?.() < new Date()) return res.status(400).json({ success: false, error: { message: 'Esta invitación expiró' } })
    await db.collection('team_members').add({ owner_user_id: invite.owner_user_id, email: invite.email, role: invite.role || 'member', status: 'active', created_at: new Date() })
    await db.collection('team_invites').doc(inviteId).update({ status: 'accepted' })
    res.json({ success: true, data: { email: invite.email } })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/team/members/:memberId', async (req, res) => {
  try {
    const memberDoc = await db.collection('team_members').doc(req.params.memberId).get()
    if (!memberDoc.exists) return res.status(404).json({ success: false, error: { message: 'Member not found' } })
    if (memberDoc.data().owner_user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('team_members').doc(req.params.memberId).delete()
    res.json({ success: true })
  }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.delete('/team/invites/:inviteId', async (req, res) => {
  try {
    const inviteDoc = await db.collection('team_invites').doc(req.params.inviteId).get()
    if (!inviteDoc.exists) return res.status(404).json({ success: false, error: { message: 'Invite not found' } })
    if (inviteDoc.data().owner_user_id !== req.user.uid) return res.status(403).json({ success: false, error: { message: 'Forbidden' } })
    await db.collection('team_invites').doc(req.params.inviteId).delete()
    res.json({ success: true })
  }
  catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

}
