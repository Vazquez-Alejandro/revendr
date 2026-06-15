import { useState, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import {
  Shield,
  Users,
  Search,
  Loader2,
  Check,
  X,
  Mail,
  Building2,
  Calendar,
  BarChart3,
  Ban,
  Edit2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../hooks/useConfirm'

const PLANS = ['starter', 'growth', 'enterprise']

export default function AdminPanel() {
  const { locale } = useI18n()
  const { confirm, ConfirmDialog } = useConfirm()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [selectedClient, setSelectedClient] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const result = await fetch(
        'https://us-central1-revendr-9add8.cloudfunctions.net/api/admin/clients'
      ).then(r => r.json())
      if (result.success) setClients(result.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateClient = async (id, updates) => {
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/admin/clients/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )
      toast.success(locale === 'es' ? 'Actualizado' : 'Updated')
      loadClients()
      setEditingPlan(null)
    } catch (e) {
      toast.error('Error')
    }
  }

  const deactivateClient = async (id) => {
    if (!(await confirm(locale === 'es' ? '¿Desactivar esta cuenta?' : 'Deactivate this account?', 'Desactivar'))) return
    try {
      await fetch(
        `https://us-central1-revendr-9add8.cloudfunctions.net/api/admin/clients/${id}`,
        { method: 'DELETE' }
      )
      toast.success(locale === 'es' ? 'Desactivado' : 'Deactivated')
      loadClients()
    } catch (e) {
      toast.error('Error')
    }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || c.email?.toLowerCase().includes(q) || c.nombre?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q)
    const matchPlan = filterPlan === 'all' || c.plan === filterPlan
    return matchSearch && matchPlan
  })

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.activo).length,
    plans: PLANS.reduce((acc, p) => ({ ...acc, [p]: clients.filter(c => c.plan === p).length }), {}),
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2">
          <Shield className="w-7 h-7 text-brand-400" />
          {locale === 'es' ? 'Panel de Admin' : 'Admin Panel'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-dark-100">{stats.total}</div>
          <div className="text-xs text-dark-400">{locale === 'es' ? 'Total Clientes' : 'Total Clients'}</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          <div className="text-xs text-dark-400">{locale === 'es' ? 'Activos' : 'Active'}</div>
        </div>
        {PLANS.map(p => (
          <div key={p} className="card text-center">
            <div className="text-2xl font-bold text-dark-100">{stats.plans[p] || 0}</div>
            <div className="text-xs text-dark-400 capitalize">{p}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 cursor-pointer"
            onClick={() => document.getElementById('admin-search')?.focus()}
          />
          <input
            id="admin-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
            placeholder={locale === 'es' ? 'Buscar por email, nombre o empresa...' : 'Search by email, name or company...'}
            autoFocus
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="input-field min-w-[140px] w-auto"
        >
          <option value="all">{locale === 'es' ? 'Filtrar por plan' : 'Filter by plan'}</option>
          {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      {/* Clients Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Cliente' : 'Client'}</th>
                <th className="text-left p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Plan' : 'Plan'}</th>
                <th className="text-left p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Uso' : 'Usage'}</th>
                <th className="text-left p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Estado' : 'Status'}</th>
                <th className="text-left p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Registro' : 'Registered'}</th>
                <th className="text-right p-4 text-xs text-dark-400 font-medium">{locale === 'es' ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr key={client.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-medium">
                        {client.nombre?.[0] || client.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-dark-100">{client.nombre || '—'}</div>
                        <div className="text-xs text-dark-400">{client.email}</div>
                        {client.empresa && <div className="text-xs text-dark-500">{client.empresa}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {editingPlan === client.id ? (
                      <div className="flex gap-1">
                        {PLANS.map(p => (
                          <button
                            key={p}
                            onClick={() => updateClient(client.id, { plan: p })}
                            className={`px-2 py-1 rounded text-xs ${
                              client.plan === p ? 'bg-brand-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPlan(client.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-dark-800 text-dark-200 text-xs hover:bg-dark-700"
                      >
                        <span className="capitalize">{client.plan}</span>
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-dark-300">
                      {client.usage?.leads || 0} leads · {client.usage?.demos || 0} demos · {client.usage?.messages || 0} msgs
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      client.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {client.activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {client.activo ? (locale === 'es' ? 'Activo' : 'Active') : (locale === 'es' ? 'Inactivo' : 'Inactive')}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-dark-400">
                    {client.fecha_creacion?.toDate?.()?.toLocaleDateString('es-AR')}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => deactivateClient(client.id)}
                      className="text-dark-400 hover:text-red-400 transition-colors"
                      title={locale === 'es' ? 'Desactivar' : 'Deactivate'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            {locale === 'es' ? 'No se encontraron clientes' : 'No clients found'}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  )
}
