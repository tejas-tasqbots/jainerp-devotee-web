import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BedDouble, Bell, Building2, Calendar, CalendarDays, ChevronRight, Heart,
  IndianRupee, MapPin, Plus, Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import { api, fmtPaise } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { feedTypeStyle } from '../../lib/feedTypes'
import type { Boli, FeedItem } from '../../types'

interface MyTemple {
  id?: string
  slug?: string
  tenant_slug?: string
  name?: string
  temple_name?: string
  city?: string
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Suprabhat'
  if (h < 17) return 'Jai Jinendra'
  return 'Shubh Sandhya'
}

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [bolis, setBolis] = useState<Boli[]>([])
  const [temples, setTemples] = useState<MyTemple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const results = await Promise.allSettled([
      api.get('/me/feed'),
      api.get('/me/bolis', { params: { status: 'pledged,partially_paid' } }),
      api.get('/me/temples'),
    ])
    if (results[0].status === 'fulfilled') setFeed(results[0].value.data.data ?? [])
    if (results[1].status === 'fulfilled') setBolis(results[1].value.data.data ?? [])
    if (results[2].status === 'fulfilled') setTemples(results[2].value.data.data ?? [])
    setLoading(false)
  }

  // Brand palette only — `purple-600` and raw `green-600`/`amber-500` were
  // off-scheme and made the row read as five unrelated apps. These are the same
  // tokens mandiradmin uses, so the three portals look like one product.
  const quickActions = [
    { label: t('home.quickDonate'), icon: Heart, color: 'bg-brand-red text-white', path: '/donate' },
    { label: t('home.quickDonations'), icon: IndianRupee, color: 'bg-brand-green text-white', path: '/donations' },
    { label: t('home.quickBolis'), icon: Calendar, color: 'bg-brand-gold text-navy-900', path: '/bolis' },
    { label: t('home.quickTemples'), icon: Building2, color: 'bg-navy-700 text-white', path: '/temples' },
    // Finding a bed is its own errand, not a sub-task of browsing temples —
    // a devotee travelling to Palitana wants a dharamshala, not a directory.
    { label: t('home.quickStays'), icon: BedDouble, color: 'bg-brand-blue text-white', path: '/stays' },
    { label: t('home.quickMaharaj'), icon: Sparkles, color: 'bg-brand-gold-dark text-white', path: '/sant' },
  ]

  // The three Sant-directory views. Kept beside quickActions rather than merged
  // into it: these are places to browse, not actions to take, and mixing them
  // into the icon row made a nine-tile grid nobody could scan.
  const discover = [
    {
      label: t('sant.mapTitle'),
      hint: t('home.discoverMapHint'),
      icon: MapPin,
      color: 'bg-navy-50 text-navy-700',
      path: '/sant-map',
    },
    {
      label: t('sant.chaturmasTitle'),
      hint: t('home.discoverChaturmasHint'),
      icon: CalendarDays,
      color: 'bg-red-50 text-brand-red',
      path: '/chaturmas',
    },
    {
      label: t('sant.eventsTitle'),
      hint: t('home.discoverEventsHint'),
      icon: Sparkles,
      color: 'bg-brand-gold-light text-brand-gold-dark',
      path: '/sant-events',
    },
  ]

  const outstanding = bolis.reduce((s, b) => s + Number(b.outstanding_paise || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = feed
    .filter(f => f.type === 'event' && f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  const rest = feed.filter(f => !upcoming.includes(f))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Saffron hero */}
      <div className="hero-saffron relative px-4 pt-6 pb-20 text-white
                      lg:bg-none lg:bg-white lg:px-8 lg:pt-7 lg:pb-6 lg:text-slate-900
                      lg:border-b lg:border-slate-200">
        {/* z-30, not z-10: the content block below is a later sibling at z-10,
            so at equal z-index it painted over this header — and the language
            menu's own z-50 could not escape, because this row is the stacking
            context it lives in. Two of the three options were unclickable. */}
        <div className="flex items-start justify-between relative z-30">
          <div>
            <p className="text-xs text-white/75 lg:text-slate-500">{greeting()} 🙏</p>
            <h1 className="text-xl font-bold leading-tight lg:text-2xl">{user?.name || 'Welcome'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={() => navigate('/notifications')} className="relative rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25 lg:bg-slate-100 lg:hover:bg-slate-200" aria-label={t('ui.notifications')}>
              <Bell size={20} className="text-white lg:text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Below lg this is the phone stack, unchanged. From lg it becomes two
          columns: what you ACT on and the update stream in the main column,
          the temples you follow beside them — which is what the desktop width
          is actually good for. */}
      <div className="relative z-10 -mt-14 px-4 pb-6 lg:mt-0 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:px-8 lg:pt-6">
        <div className="space-y-5 lg:col-span-2">
        {/* Outstanding bolis nudge */}
        {outstanding > 0 && (
          <button
            onClick={() => navigate('/bolis')}
            className="w-full card p-4 bg-amber-50 border-amber-200 flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Calendar size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">₹{fmtPaise(outstanding)} boli pending</p>
                <p className="text-xs text-amber-600">{bolis.length} pledge{bolis.length > 1 ? 's' : ''} awaiting payment</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-3 py-1.5 flex-shrink-0">{t('ui.payNow')}</span>
          </button>
        )}

        {/* Quick actions.
            `grid-cols-3` at every width, not the old hardcoded `grid-cols-5`:
            there are six actions, so five columns put one orphan on a second
            row, and on anything wider than a phone the five stretched across
            the full width with the icons marooned in the middle of their
            cells. Three columns divide six exactly and keep the tiles the
            same size on a phone and a laptop. */}
        <section className="card p-4">
          <div className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
            {quickActions.map(a => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="group flex flex-col items-center gap-2 rounded-xl py-1 transition-colors hover:bg-slate-50"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${a.color}`}>
                  <a.icon size={20} />
                </span>
                <span className="px-1 text-center text-[11px] font-medium leading-tight text-slate-600">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Discover — the Sant directory's three views.
            The map, the chaturmas directory and the events feed were reachable
            only from icons inside the Sant directory header, so a devotee who
            never opened that tab had no idea they existed. These are the parts
            of the platform with nothing comparable elsewhere, so they earn a
            place on the home screen rather than a second-level icon. */}
        <section>
          <h2 className="mb-2.5 text-sm font-semibold uppercase tracking-wider text-slate-500">
            {t('home.discover')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {discover.map(d => (
              <button
                key={d.path}
                onClick={() => navigate(d.path)}
                className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${d.color}`}>
                  <d.icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight text-slate-800">{d.label}</span>
                  {/* No `truncate`: at three columns inside a 672px app column
                      each card is ~205px, so every hint was cut to "See who is
                      ne…". Two lines of wrapped text costs nothing — the grid
                      keeps the cards equal height anyway. */}
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{d.hint}</span>
                </span>
                <ChevronRight size={16} className="flex-none text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-red" />
              </button>
            ))}
          </div>
        </section>

        </div>

        {/* Aside on desktop, next block on a phone. It carries the
            things you BROWSE — the temples you follow and what is
            coming up — so the main column stays the action stream.
            With only "My temples" in here the right third of a
            1400px page was empty. */}
        <div className="mt-5 space-y-5 lg:mt-0">
        {/* My temples strip */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('home.myTemples')}</h2>
            <button onClick={() => navigate('/temples')} className="text-xs font-medium text-brand-red flex items-center gap-0.5">
              {t('home.explore')} <ChevronRight size={13} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {temples.map((t, i) => {
              const name = t.name ?? t.temple_name ?? 'Temple'
              const slug = t.slug ?? t.tenant_slug
              return (
                <button
                  key={slug ?? i}
                  onClick={() => slug && navigate(`/temples/${slug}`)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16"
                >
                  <span className="w-14 h-14 rounded-full bg-gradient-to-br from-red-50 to-amber-50 border border-slate-200 flex items-center justify-center text-brand-red font-bold text-lg">
                    {name.replace(/^(shri|shree|sri)\s+/i, '').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-600 text-center leading-tight line-clamp-2">{name}</span>
                </button>
              )
            })}
            <button onClick={() => navigate('/temples')} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
              <span className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                <Plus size={20} />
              </span>
              <span className="text-[10px] text-slate-400 text-center leading-tight">{t('home.addTemple')}</span>
            </button>
          </div>
        </section>

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{t('home.upcomingEvents')}</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
              {upcoming.map(ev => (
                <div key={ev.id} className="card p-3.5 flex-shrink-0 w-56">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Calendar size={14} />
                    </span>
                    <p className="text-[11px] font-semibold text-amber-600">{format(new Date(ev.date), 'EEE, dd MMM')}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">{ev.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">{ev.temple_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        </div>

        <div className="mt-5 space-y-5 lg:col-span-2 lg:mt-0">
        {/* Feed */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{t('home.templeUpdates')}</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="card p-8 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">{t('home.noUpdates')}</p>
              <p className="text-slate-400 text-xs mt-1">{t('ui.donateToStart')}</p>
              <button onClick={() => navigate('/temples')} className="btn-primary mt-4 mx-auto">{t('home.findTemples')}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {(rest.length ? rest : feed).map(item => {
                // The badge used to render `item.type` verbatim, so a Sant's
                // broadcast showed devotees the literal string
                // "maharaj_message". feedTypeStyle maps every type to an icon,
                // a tint and a translated label, and falls back to a generic
                // "Update" for anything unknown rather than leaking the enum.
                const { Icon, labelKey, avatar, badge } = feedTypeStyle(item.type)
                return (
                  <div key={item.id} className="card p-4 transition hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${avatar}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="truncate text-xs text-slate-400">{item.temple_name}</span>
                          <span className={`badge text-[9px] ${badge}`}>{t(labelKey)}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                        <p className="mt-1 text-xs text-slate-400">{format(new Date(item.date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  )
}
