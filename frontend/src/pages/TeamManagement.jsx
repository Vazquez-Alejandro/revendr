import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import {
  Users,
  UserPlus,
  Loader2,
  Mail,
  Trash2,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamManagement() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/team/members/${user.uid}`
      ).then(r => r.json())
      if (result.success) setMembers(result.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const inviteMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/team/invite',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerUserId: user.uid, email: inviteEmail, role: inviteRole }),
        }
      ).then(r => r.json())
      if (result.success) {
        toast.success(locale === 'es' ? 'Invitación enviada' : 'Invite sent')
        setInviteEmail('')
        loadMembers()
      }
    } catch (e) {
      toast.error('Error')
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId) => {
    if (!confirm(locale === 'es' ? '¿Eliminar miembro?' : 'Remove member?')) return
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/team/members/${memberId}`,
        { method: 'DELETE' }
      )
      toast.success(locale === 'es' ? 'Miembro eliminado' : 'Member removed')
      loadMembers()
    } catch (e) {
      toast.error('Error')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
        <Users className="w-7 h-7 text-brand-400" />
        {locale === 'es' ? 'Equipo' : 'Team'}
      </h1>

      {/* Invite Form */}
      <div className="card">
        <h2 className="text-sm font-medium text-dark-300 mb-4">
          {locale === 'es' ? 'Invitar Miembro' : 'Invite Member'}
        </h2>
        <form onSubmit={inviteMember} className="flex gap-3 items-center">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="input-field flex-1 min-w-0"
            placeholder={locale === 'es' ? 'email@ejemplo.com' : 'email@example.com'}
            required
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="input-field w-36 flex-shrink-0">
            <option value="member">{locale === 'es' ? 'Miembro' : 'Member'}</option>
            <option value="admin">{locale === 'es' ? 'Admin' : 'Admin'}</option>
          </select>
          <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 flex-shrink-0">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {locale === 'es' ? 'Invitar' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className="card">
        <h2 className="text-sm font-medium text-dark-300 mb-4">
          {locale === 'es' ? 'Miembros del Equipo' : 'Team Members'}
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : members.length === 0 ? (
          <p className="text-center py-8 text-dark-400 text-sm">
            {locale === 'es' ? 'Aún no invitaste a nadie' : 'No members invited yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm">
                    {member.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-dark-100">{member.email}</div>
                    <div className="text-xs text-dark-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {member.role}
                      {member.status === 'pending' && (
                        <span className="ml-1 text-amber-400">(pendiente)</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-dark-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
