import { Heart, Home, IndianRupee, Sparkles, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function BottomNav() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/home', icon: Home, label: t('nav.home') },
    { to: '/donations', icon: IndianRupee, label: t('nav.donations') },
    { to: '/donate', icon: Heart, label: t('nav.donate'), featured: true },
    { to: '/maharaj', icon: Sparkles, label: t('nav.maharaj') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 bottom-nav-safe">
      <div className="flex items-end justify-around px-2 pt-1 pb-1">
        {tabs.map(({ to, icon: Icon, label, featured }) =>
          featured ? (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 -mt-3 ${isActive ? 'opacity-100' : 'opacity-90'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                      isActive ? 'bg-brand-red-dark' : 'bg-brand-red'
                    }`}
                  >
                    <Icon size={22} className="text-white" />
                  </span>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-red' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-brand-red' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          )
        )}
      </div>
    </nav>
  )
}
