import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ChevronRight, Map, MapPin, Search, SlidersHorizontal, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import { EmptyState, SkeletonList } from '../../components/kit'
import { useTranslation } from 'react-i18next'
import { asceticRank, padLabel, santDisplayName, sectLabel } from '../../lib/ascetic'
import type { MaharajProfile, SantFacets } from '../../types'

/**
 * The Sant directory.
 *
 * Filters are driven by `/sant/directory/facets` rather than a hardcoded list,
 * so the pickers only ever offer values that actually exist in the data — a
 * filter that returns nothing is worse than no filter at all. Every one of
 * these columns was already stored and already returned by the list endpoint;
 * only the query parameters to narrow by them were missing.
 */
export function SantDirectory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [samuday, setSamuday] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [type, setType] = useState('')
  const [pad, setPad] = useState('')
  const [sect, setSect] = useState('')
  const [sort, setSort] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [facets, setFacets] = useState<SantFacets | null>(null)
  const [profiles, setProfiles] = useState<MaharajProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api.get('/sant/directory/facets')
      .then(({ data }) => setFacets(data.data ?? null))
      .catch(() => setFacets(null))
  }, [])

  useEffect(() => {
    const handle = setTimeout(load, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, samuday, city, state, type, pad, sect, sort])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/sant', {
        params: { q: query, samuday, city, state, type, pad, sect, sort, limit: 20 },
      })
      setProfiles(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  const activeCount = [samuday, city, state, type, pad, sect].filter(Boolean).length
  const hasAnyFilter = activeCount > 0 || !!query

  function clearAll() {
    setQuery(''); setSamuday(''); setCity(''); setState('')
    setType(''); setPad(''); setSect(''); setSort('name')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('titles.maharajMataji')}</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/sant-map')} aria-label={t('sant.mapTitle')}
            title={t('sant.mapTitle')} className="p-2 rounded-full hover:bg-slate-100">
            <Map size={20} className="text-slate-600" />
          </button>
          <button onClick={() => navigate('/chaturmas')} aria-label={t('sant.chaturmasTitle')}
            title={t('sant.chaturmasTitle')} className="p-2 rounded-full hover:bg-slate-100">
            <CalendarDays size={20} className="text-slate-600" />
          </button>
          <button onClick={() => navigate('/notifications')} aria-label={t('ui.notifications')}
            title={t('ui.notifications')} className="p-2 rounded-full hover:bg-slate-100">
            <Bell size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('ui.searchByName')}
            className="form-input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={14} />
            {t('sant.filters')}
            {activeCount > 0 && (
              <span className="badge badge-red text-[9px] ml-0.5">{activeCount}</span>
            )}
          </button>
          <select
            className="form-input flex-1 text-xs"
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label={t('sant.sortBy')}
          >
            <option value="name">{t('sant.sortName')}</option>
            <option value="followers">{t('sant.sortFollowers')}</option>
            <option value="recent">{t('sant.sortRecent')}</option>
          </select>
        </div>

        {showFilters && (
          <div className="card p-3 space-y-2">
            <div className="flex gap-2">
              {/* Facet-driven: only ranks that exist are offered, with counts, so
                  the picker can never promise results the list then fails to show. */}
              <select className="form-input flex-1 text-xs" value={type}
                onChange={e => setType(e.target.value)} aria-label={t('sant.rank')}>
                <option value="">{t('sant.allRanks')}</option>
                {(facets?.types ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {asceticRank(o.value)} ({o.count})
                  </option>
                ))}
              </select>
              <select className="form-input flex-1 text-xs" value={pad}
                onChange={e => setPad(e.target.value)} aria-label={t('sant.pad')}>
                <option value="">{t('sant.allPads')}</option>
                {(facets?.pads ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {padLabel(o.value)} ({o.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select className="form-input flex-1 text-xs" value={sect}
                onChange={e => setSect(e.target.value)} aria-label={t('sant.sect')}>
                <option value="">{t('sant.allSects')}</option>
                {(facets?.sects ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {sectLabel(o.value)} ({o.count})
                  </option>
                ))}
              </select>
              <select className="form-input flex-1 text-xs" value={state}
                onChange={e => setState(e.target.value)} aria-label={t('sant.state')}>
                <option value="">{t('sant.allStates')}</option>
                {(facets?.states ?? []).map(o => (
                  <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder={t('ui.samudayPh')} className="form-input flex-1 text-xs"
                value={samuday} onChange={e => setSamuday(e.target.value)} />
              <input type="text" placeholder={t('ui.cityPh')} className="form-input flex-1 text-xs"
                value={city} onChange={e => setCity(e.target.value)} />
            </div>
            {hasAnyFilter && (
              <button className="btn-secondary w-full text-xs" onClick={clearAll}>
                {t('sant.clearFilters')}
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400">{t('sant.profileCount', { count: total })}</p>

        {loading ? (
          <SkeletonList rows={4} />
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={Search}
            title={hasAnyFilter ? t('sant.noMatches') : t('sant.emptyTitle')}
            hint={hasAnyFilter ? t('sant.noMatchesHint') : t('sant.emptyHint')}
            action={hasAnyFilter ? (
              <button className="btn-secondary" onClick={clearAll}>
                {t('sant.clearFilters')}
              </button>
            ) : undefined}
          />
        ) : (
          /* Two-up from lg: these are portrait cards in a directory, and one
             per row across a laptop is mostly empty space. */
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/sant/${p.id}`)}
              className="w-full card p-4 text-left hover:border-navy-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PhotoAvatar name={p.name} photoUrl={p.photo_url} />
                <div className="flex-1 min-w-0">
                  {/* The post reads as part of the name — "Acharya Shri …" — so
                      it is prefixed here rather than shown as another badge. */}
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {santDisplayName(p)}
                  </p>
                  <p className="text-xs text-slate-500">{p.samuday}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {(p.current_city || p.city) && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <MapPin size={10} /> {p.current_city || p.city}
                      </span>
                    )}
                    {p.followers_count !== undefined && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <Users size={10} /> {p.followers_count}
                      </span>
                    )}
                    {/* type_display is resolved server-side from ascetic.ts —
                        never render the raw rank enum ('muni') at the user. */}
                    <span className="badge badge-gold text-[9px]">
                      {p.type_display ?? p.type}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </div>
            </button>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}
