import {
  BedDouble, BookOpen, Building2, CalendarDays, Heart, Home, IndianRupee, MapPin,
  Sparkles, User,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Desktop navigation — shown from `lg` up, where BottomNav is hidden.
 *
 * The portal was authored phone-only: a bottom tab bar, five destinations, and
 * no desktop breakpoint on any of its 21 pages. A tab bar pinned to the bottom
 * of a 1400px window is the wrong control at that size — it is far from the
 * content, it can only hold five items, and it leaves the whole left half of
 * the screen empty.
 *
 * A sidebar fixes all three: it sits beside the content, and because it is not
 * fighting for horizontal room it can show the destinations the tab bar had to
 * bury behind the Sant tab — Temples, Dharamshala, the map, the chaturmas
 * directory. Those are the same links the home screen's Discover section
 * offers, which is exactly the point: on a phone you scroll to them, on a
 * desktop they are always in view.
 */
export function Sidebar() {
  const { t } = useTranslation()

  const groups: { heading?: string; items: { to: string; icon: typeof Home; label: string }[] }[] = [
    {
      items: [
        { to: '/home', icon: Home, label: t('nav.home') },
        { to: '/donate', icon: Heart, label: t('nav.donate') },
        { to: '/donations', icon: IndianRupee, label: t('nav.donations') },
      ],
    },
    {
      heading: t('titles.templeDirectory'),
      items: [
        { to: '/temples', icon: Building2, label: t('home.quickTemples') },
        { to: '/stays', icon: BedDouble, label: t('home.quickStays') },
      ],
    },
    {
      heading: t('titles.library'),
      items: [
        { to: '/library', icon: BookOpen, label: t('library.browse') },
      ],
    },
    {
      heading: t('titles.maharajMataji'),
      items: [
        { to: '/sant', icon: Sparkles, label: t('nav.sant') },
        { to: '/sant-map', icon: MapPin, label: t('sant.mapTitle') },
        { to: '/chaturmas', icon: CalendarDays, label: t('sant.chaturmasTitle') },
      ],
    },
    {
      items: [{ to: '/profile', icon: User, label: t('nav.profile') }],
    },
  ]

  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 flex-none items-center px-5">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="JainERP" className="h-8 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((g, i) => (
          <div key={g.heading ?? `g${i}`} className="mb-4">
            {g.heading && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {g.heading}
              </p>
            )}
            {g.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-brand-red'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
                  }`
                }
              >
                <Icon size={18} className="flex-none" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
