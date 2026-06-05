import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../contexts/I18nContext'
import { Bell, Search, Sun, Moon, Globe } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const { user, adminData } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { locale, changeLocale } = useI18n()
  const [showSearch, setShowSearch] = useState(false)

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-400 hover:text-dark-200 hover:border-dark-600 transition-all duration-200"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Buscar...</span>
          <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs bg-dark-700 rounded ml-4">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => changeLocale(locale === 'es' ? 'en' : 'es')}
          className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all duration-200 flex items-center gap-1"
          title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <Globe className="w-5 h-5" />
          <span className="text-xs font-medium">{locale.toUpperCase()}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all duration-200"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="relative p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
          <div className="text-right">
            <p className="text-sm font-medium text-dark-100">
              {adminData?.nombre || user?.email?.split('@')[0] || 'Admin'}
            </p>
            <p className="text-xs text-dark-400">
              {adminData?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm">
            {(adminData?.nombre || user?.email || 'A')[0].toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
