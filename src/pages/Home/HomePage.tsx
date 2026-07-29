import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Building2, Calendar, ChevronRight, Heart, IndianRupee,
  Megaphone, Plus, Sparkles, TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { api, currentFY, fmtPaise } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import type { Boli, FeedItem, TransactionSummary } from '../../types'

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
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [bolis, setBolis] = useState<Boli[]>([])
  const [temples, setTemples] = useState<MyTemple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const results = await Promise.allSettled([
      api.get('/me/feed'),
      api.get('/me/transactions/summary', { params: { fy: currentFY() } }),
      api.get('/me/bolis', { params: { status: 'pledged,partially_paid' } }),
      api.get('/me/temples'),
    ])
    if (results[0].status === 'fulfilled') setFeed(results[0].value.data.data ?? [])
    if (results[1].status === 'fulfilled') setSummary(results[1].value.data.data ?? null)
    if (results[2].status === 'fulfilled') setBolis(results[2].value.data.data ?? [])
    if (results[3].status === 'fulfilled') setTemples(results[3].value.data.data ?? [])
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
    { label: t('home.quickMaharaj'), icon: Sparkles, color: 'bg-brand-blue text-white', path: '/maharaj' },
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
      <div className="hero-saffron px-4 pt-6 pb-20 text-white relative">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-xs text-white/75">{greeting()} 🙏</p>
            <h1 className="text-xl font-bold leading-tight">{user?.name || 'Welcome'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors" aria-label="Notifications">
              <Bell size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-14 space-y-5 relative z-10 pb-6">
        {/* Giving snapshot */}
        <section
          className="card p-4 text-white"
          style={{ background: 'linear-gradient(135deg, #0D1B2E 0%, #1b2f4a 100%)' }}
          onClick={() => navigate('/donations')}
          role="button"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={12} /> {t('home.myGiving')} — FY {summary?.fy ?? currentFY()}
              </p>
              {loading ? (
                <div className="h-7 w-32 bg-white/10 rounded mt-1 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold mt-0.5">₹{fmtPaise(summary?.total_paise ?? 0)}</p>
              )}
            </div>
            <ChevronRight size={18} className="text-slate-500" />
          </div>
          <div className="flex gap-5 mt-2.5">
            <div>
              <p className="text-[11px] text-slate-400">{t('home.eligible80g')}</p>
              <p className="text-sm font-semibold text-brand-gold">₹{fmtPaise(summary?.eligible_80g_paise ?? 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">{t('home.receiptsLabel')}</p>
              <p className="text-sm font-semibold">{summary?.txn_count ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">{t('home.templesLabel')}</p>
              <p className="text-sm font-semibold">{summary?.by_temple?.length ?? 0}</p>
            </div>
          </div>
        </section>

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
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-3 py-1.5 flex-shrink-0">Pay now</span>
          </button>
        )}

        {/* Quick actions */}
        <section className="card p-4">
          <div className="grid grid-cols-5 gap-1.5">
            {quickActions.map(a => (
              <button key={a.path} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-1.5 py-1 group">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform ${a.color}`}>
                  <a.icon size={20} />
                </span>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

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
              <p className="text-slate-400 text-xs mt-1">Donate to a temple or link one to start receiving updates</p>
              <button onClick={() => navigate('/temples')} className="btn-primary mt-4 mx-auto">{t('home.findTemples')}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {(rest.length ? rest : feed).map(item => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === 'event' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.type === 'event' ? <Calendar size={15} /> : <Megaphone size={15} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-400 truncate">{item.temple_name}</span>
                        <span className={`badge text-[9px] ${item.type === 'event' ? 'badge-gold' : 'badge-blue'}`}>{item.type}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      {item.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.body}</p>}
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(item.date), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
