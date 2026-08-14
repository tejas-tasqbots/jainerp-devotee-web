import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronRight, Search } from 'lucide-react'
import { api } from '../../lib/api'
import type { Temple } from '../../types'

/** Directory filter options, counted over the temples that actually exist. */
interface Facets {
  states: { value: string; count: number }[]
  cities: { value: string; count: number }[]
}
import { EmptyState } from '../../components/kit'

export function TempleDirectory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [facets, setFacets] = useState<Facets>({ states: [], cities: [] })
  const [temples, setTemples] = useState<Temple[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [page, state, city])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [query])

  // Options come from the temples that actually exist, scoped by the chosen
  // state. A filter built from a static list of Indian states offers 36 choices
  // of which three have temples, and picking one of the other 33 returns an
  // empty list that reads as a broken app.
  useEffect(() => {
    let cancelled = false
    api.get('/temples/directory/facets', { params: { state: state || undefined } })
      .then(({ data }) => { if (!cancelled) setFacets(data.data ?? { states: [], cities: [] }) })
      .catch(() => { /* the filter is optional; search still works without it */ })
    return () => { cancelled = true }
  }, [state])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/temples/directory', {
        params: { q: query, state: state || undefined, city: city || undefined, page, limit: 15 },
      })
      setTemples(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
    } catch {
      setTemples([])
    } finally {
      setLoading(false)
    }
  }

  /** Changing state invalidates the city — Pune is not in Madhya Pradesh. */
  function onStateChange(next: string) {
    setState(next)
    setCity('')
    setPage(1)
  }

  const filtering = !!query || !!state || !!city

  const TYPE_COLORS: Record<string, string> = {
    jain: 'badge-gold',
    temple: 'badge-red',
    mandir: 'badge-blue',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('titles.templeDirectory')}</h1>
        <button onClick={() => navigate('/notifications')} aria-label={t('ui.notifications')} title={t('ui.notifications')} className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('ui.searchNameCity')}
            className="form-input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            className="form-select flex-1"
            aria-label={t('ui.state', { defaultValue: 'State' })}
            title={t('ui.state', { defaultValue: 'State' })}
            value={state}
            onChange={e => onStateChange(e.target.value)}
          >
            <option value="">{t('ui.allStates', { defaultValue: 'All states' })}</option>
            {facets.states.map(s => (
              <option key={s.value} value={s.value}>{s.value} ({s.count})</option>
            ))}
          </select>
          <select
            className="form-select flex-1"
            aria-label={t('ui.city', { defaultValue: 'City' })}
            title={t('ui.city', { defaultValue: 'City' })}
            value={city}
            onChange={e => { setCity(e.target.value); setPage(1) }}
          >
            <option value="">{t('ui.allCities', { defaultValue: 'All cities' })}</option>
            {facets.cities.map(c => (
              <option key={c.value} value={c.value}>{c.value} ({c.count})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">{total} temples found</p>
          {filtering && (
            <button
              onClick={() => { setQuery(''); setState(''); setCity(''); setPage(1) }}
              className="text-xs font-semibold text-brand-red hover:underline"
            >
              {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
            </button>
          )}
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : temples.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t('ui.noTemplesFound')}
            hint="Try a different name or city. Temples appear here once they join JainERP."
          />
        ) : (
          // Cards, not rows: a directory of temples reads better two-up on a
          // laptop than as one 1000px-wide row each.
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {temples.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/temples/${t.slug}`)}
                className="w-full card p-4 text-left hover:border-brand-red transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-brand-red" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">{t.city}, {t.state}</p>
                      {t.temple_type && (
                        <span className={`badge ${TYPE_COLORS[t.temple_type] ?? 'badge-slate'}`}>
                          {t.temple_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </div>
              </button>
            ))}
            {total > 15 && (
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5"
                >Prev</button>
                <span className="text-xs text-slate-400">Page {page} of {Math.ceil(total / 15)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 15 >= total}
                  className="btn-secondary text-xs px-3 py-1.5"
                >Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
