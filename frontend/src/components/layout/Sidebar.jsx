import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  Settings,
  LogOut,
  Zap,
  Package,
  GitBranch,
  Building2,
  Sparkles,
  CreditCard,
  Shield,
  UserCog,
} from 'lucide-react'
import clsx from 'clsx'

export function Sidebar() {
  const { signOut } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  const navigation = [
    { name: locale === 'es' ? 'Mi Dashboard' : 'My Dashboard', href: '/dashboard', icon: LayoutDashboard, end: true },
    { name: t('myProducts'), href: '/dashboard/productos', icon: Package },
    { name: t('campaigns'), href: '/dashboard/campanias', icon: Megaphone },
    { name: t('leads'), href: '/dashboard/leads', icon: Users },
    { name: 'CRM', href: '/dashboard/crm', icon: GitBranch },
    { name: locale === 'es' ? 'Contenido' : 'Content', href: '/dashboard/contenido', icon: Sparkles },
    { name: locale === 'es' ? 'Equipo' : 'Team', href: '/dashboard/team', icon: Users },
    { name: locale === 'es' ? 'Suscripción' : 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    { name: locale === 'es' ? 'Admin' : 'Admin', href: '/dashboard/admin', icon: Shield },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-700 flex flex-col z-40">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-dark-50">Revendr</h1>
            <p className="text-xs text-dark-400">SaaS Engine</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-brand-600/10 text-brand-400 border border-brand-600/20'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
