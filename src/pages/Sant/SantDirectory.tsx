import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ChevronRight, Map, MapPin, Search, SlidersHorizontal, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import { EmptyState, SkeletonList } from '../../components/kit'
import { useTranslation } from 'react-i18next'
import { altNameFor, asceticRank, padLabel, santDisplayName, sectLabel } from '../../lib/ascetic'
import type { MaharajProfile, SantFacets } from '../../types'
import { TraditionSwitch } from '../../components/TraditionSwitch'
import { traditionsParam, useTraditionScope, type SectScopeMeta } from '../../lib/traditions'

/**
 * The Sant directory.
 *
 * Filters are driven by `/sant/directory/facets` rather than a hardcoded list,
 * so the pickers only ever offer values that actually exist in the data — a
 * filter that returns nothing is worse than no filter at all. Every one of
 * these columns was already stored and already returned by the list endpoint;
 * only the query parameters to narrow by them were missing.
 */
/**
 * Rows per page.
 *
 * The directory holds a few thousand ascetics; before this it fetched twenty
 * and offered no way to reach the twenty-first, so 99% of the data was
 * unreachable from the UI.
 */
const PAGE_SIZE = 20

export function SantDirectory() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [samuday, setSamuday] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [type, setType] = useState('')
  const [pad, setPad] = useState('')
  /**
   * Sangh segregation (migration 047) — the group, and the lineage behind it.
   *
   * This is the one filter the city and state pickers cannot stand in for: the
   * members of a single sangh are routinely in six states at once, so "show me
   * Acharya Vidyasagarji's sangh" and "show me who is in Karnataka" are
   * genuinely different questions.
   */
  const [sanghId, setSanghId] = useState('')
  const [parampara, setParampara] = useState('')
  // An explicit sampradaya from the filter row. Distinct from `scope`: this is
  // "show me Shwetambar ascetics" and overrides the default scoping, which is
  // why the picker only appears once the devotee is browsing all traditions.
  const [sect, setSect] = useState('')
  /**
   * Living, samadhistha, or both.
   *
   * Empty means the API's default, which is `living` — a real directory is
   * largely historical, and a devotee opening this screen is nearly always
   * asking who they can take darshan of. The memorial records are a
   * first-class view, not an archive: they are what a great many of these
   * profiles exist to preserve.
   */
  const [status, setStatus] = useState('')
  const [scope, setScope] = useTraditionScope()
  const [sectScope, setSectScope] = useState<SectScopeMeta | null>(null)
  const [sort, setSort] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [facets, setFacets] = useState<SantFacets | null>(null)
  const [profiles, setProfiles] = useState<MaharajProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get('/sant/directory/facets', { params: { ...traditionsParam(scope), status } })
      .then(({ data }) => setFacets(data.data ?? null))
      .catch(() => setFacets(null))
  }, [scope, status])

  useEffect(() => {
    const handle = setTimeout(load, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, samuday, city, state, type, pad, sect, sanghId, parampara, status, sort, scope, page])

  /**
   * Wrap a filter setter so changing it also goes back to page one.
   *
   * Without the reset, a devotee on page 7 who then picks a sangh with two
   * members gets an empty list and no clue why — the filter is right, the page
   * number is simply past the end of it.
   *
   * Done here rather than in an effect on purpose: `setPage` inside an effect
   * body is a cascading render (react-hooks/set-state-in-effect), and the reset
   * genuinely belongs to the event, not to a later reconciliation.
   */
  function onFilter<T>(set: (v: T) => void) {
    return (v: T) => { setPage(1); set(v) }
  }

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/sant', {
        params: {
          q: query, samuday, city, state, type, pad, sect, status, sort,
          page, limit: PAGE_SIZE,
          sangh_id: sanghId, parampara,
          ...traditionsParam(scope),
        },
      })
      setProfiles(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
      setSectScope(data.meta?.sect_scope ?? null)
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  const activeCount = [samuday, city, state, type, pad, sect, sanghId, parampara, status]
    .filter(Boolean).length
  const hasAnyFilter = activeCount > 0 || !!query

  function onScopeChange(next: 'mine' | 'all') {
    setPage(1)
    setScope(next)
    if (next === 'mine') setSect('')
  }

  /**
   * Back to the top when the page changes.
   *
   * Without it the next page loads with the viewport still at the bottom, so
   * the reader lands mid-list on rows they have not seen and it reads as if
   * nothing happened.
   */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** " (12)" for a facet that has a count, or nothing at all. */
  function statusCount(value: string): string {
    const n = (facets?.statuses ?? []).find(o => o.value === value)?.count
    return typeof n === 'number' ? ` (${n})` : ''
  }

  function clearAll() {
    setQuery(''); setSamuday(''); setCity(''); setState('')
    setPage(1)
    setType(''); setPad(''); setSect(''); setStatus(''); setSort('name')
    setSanghId(''); setParampara('')
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
            onChange={e => onFilter(setQuery)(e.target.value)}
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
            onChange={e => onFilter(setSort)(e.target.value)}
            aria-label={t('sant.sortBy')}
          >
            {/* Seniority sits first: it is the order the tradition itself
                uses, and the one a devotee reading a sangh expects. */}
            <option value="seniority">{t('sant.sortSeniority')}</option>
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
                onChange={e => onFilter(setType)(e.target.value)} aria-label={t('sant.rank')}>
                <option value="">{t('sant.allRanks')}</option>
                {(facets?.types ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {asceticRank(o.value, lang)} ({o.count})
                  </option>
                ))}
              </select>
              <select className="form-input flex-1 text-xs" value={pad}
                onChange={e => onFilter(setPad)(e.target.value)} aria-label={t('sant.pad')}>
                <option value="">{t('sant.allPads')}</option>
                {(facets?.pads ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {padLabel(o.value, lang)} ({o.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {scope === 'all' && (
                <select className="form-input flex-1 text-xs" value={sect}
                  onChange={e => onFilter(setSect)(e.target.value)} aria-label={t('sant.sect')}>
                  <option value="">{t('sant.allSects')}</option>
                  {(facets?.sects ?? []).map(o => (
                    <option key={o.value} value={o.value}>
                      {sectLabel(o.value, lang)} ({o.count})
                    </option>
                  ))}
                </select>
              )}
              {/* Counts come from the `statuses` facet, which is deliberately
                  NOT filtered by the current status — its whole job is to say
                  how many are on the other side of the switch. */}
              <select className="form-input flex-1 text-xs" value={status}
                onChange={e => onFilter(setStatus)(e.target.value)} aria-label={t('sant.status')}>
                <option value="">{t('sant.statusLiving')}{statusCount('living')}</option>
                <option value="samadhistha">{t('sant.statusSamadhistha')}{statusCount('samadhistha')}</option>
                <option value="all">{t('sant.statusAll')}</option>
              </select>
              <select className="form-input flex-1 text-xs" value={state}
                onChange={e => onFilter(setState)(e.target.value)} aria-label={t('sant.state')}>
                <option value="">{t('sant.allStates')}</option>
                {(facets?.states ?? []).map(o => (
                  <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
                ))}
              </select>
            </div>
            {/* Sangh sits above samuday because it is the coarser cut and the
                one devotees reach for first — "who travels with this Acharya".
                Picking a parampara clears the sangh: the two would otherwise
                contradict each other the moment a sangh from another lineage
                is still selected, and the list would come back empty with no
                indication of which filter emptied it. */}
            <div className="flex gap-2">
              <select className="form-input flex-1 text-xs" value={sanghId}
                onChange={e => onFilter(setSanghId)(e.target.value)} aria-label={t('sant.sangh')}>
                <option value="">{t('sant.allSanghs')}</option>
                {(facets?.sanghs ?? []).map(o => (
                  <option key={o.value} value={o.value}>
                    {(lang.startsWith('hi') && o.label_hi) || o.label} ({o.count})
                  </option>
                ))}
              </select>
              {(facets?.paramparas ?? []).length > 0 && (
                <select className="form-input flex-1 text-xs" value={parampara}
                  onChange={e => { onFilter(setParampara)(e.target.value); setSanghId('') }}
                  aria-label={t('sant.parampara')}>
                  <option value="">{t('sant.allParamparas')}</option>
                  {(facets?.paramparas ?? []).map(o => (
                    <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder={t('ui.samudayPh')} className="form-input flex-1 text-xs"
                value={samuday} onChange={e => onFilter(setSamuday)(e.target.value)} />
              {/* Facet-driven like the State beside it, NOT the geo lookup:
                  the geo list is every city in India, and a devotee picking one
                  that holds no ascetic gets an empty page. This offers only
                  cities that return something, with the count. */}
              <select className="form-input flex-1 text-xs" value={city}
                onChange={e => onFilter(setCity)(e.target.value)} aria-label={t('ui.city')}>
                <option value="">{t('sant.allCities')}</option>
                {(facets?.cities ?? []).map(o => (
                  <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
                ))}
              </select>
            </div>
            {hasAnyFilter && (
              <button className="btn-secondary w-full text-xs" onClick={clearAll}>
                {t('sant.clearFilters')}
              </button>
            )}
          </div>
        )}

        <TraditionSwitch meta={sectScope} scope={scope} onChange={onScopeChange} />

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
                {/* The inline avatar leads. Since 065 the list carries a
                    128px thumbnail (~5 KB), so the directory renders without
                    a round-trip to another site's server; photo_url is the
                    fallback for profiles seeded since. */}
                <PhotoAvatar
                  name={santDisplayName(p, lang)}
                  photoBase64={p.photo_base64}
                  photoUrl={p.photo_url}
                />
                <div className="flex-1 min-w-0">
                  {/* The post reads as part of the name — "Acharya Shri …" — so
                      it is prefixed here rather than shown as another badge. */}
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {santDisplayName(p, lang)}
                  </p>
                  {/* The other script, when the profile carries one. A devotee
                      who knows this ascetic by their Devanagari name and one who
                      knows the transliteration are looking for the same person;
                      showing both is what makes the row recognisable to either. */}
                  {altNameFor(p, lang) && (
                    <p className="text-xs text-slate-400 truncate">{altNameFor(p, lang)}</p>
                  )}
                  <p className="text-xs text-slate-500">{p.samuday}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {/* City and state come from the SAME place or neither
                        does. Where they are now wins over where they are based,
                        which is what a devotee asking "where can I take
                        darshan" means — but the state must then be
                        `current_state`, never the home `state` (migration 046). */}
                    {(p.current_city || p.city) && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <MapPin size={10} />{' '}
                        {p.current_city
                          ? [p.current_city, p.current_state].filter(Boolean).join(', ')
                          : [p.city, p.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {/* The diksha year earns its place once the list can be
                        sorted by seniority: an order whose key is invisible
                        reads as no order at all. */}
                    {p.diksha_year && (
                      <span className="text-xs text-slate-400 tabular-nums">
                        {t('sant.dikshaShort', { year: p.diksha_year })}
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
                      {(lang === 'hi' ? p.type_display_hi : p.type_display) ?? p.type}
                    </span>
                    {/* A memorial stays in the directory — that record is why
                        it is kept — but a row that looked identical to a living
                        ascetic's would send devotees looking for darshan. */}
                    {p.is_samadhistha && (
                      <span className="badge badge-gray text-[9px]">{t('sant.statusSamadhisthaShort')}</span>
                    )}
                  </div>
                  {/* The sangh, on its own line: it is long, and it is the
                      thing that makes two ascetics in different cities
                      recognisably part of one group. */}
                  {p.sangh_name && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {(lang.startsWith('hi') && p.sangh_name_hi) || p.sangh_name}
                      {p.is_sangh_head && ` · ${t('sant.sanghHead')}`}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </div>
            </button>
          ))}
          </div>
        )}

        {/* Prev / Next with the page number, matching the temple directory.
            Rendered outside the loading branch so the control does not vanish
            and re-appear on every page change — that jump is what makes a
            paginated list feel broken even when it works. */}
        {total > PAGE_SIZE && (
          <div className="flex justify-between items-center pt-1">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); scrollToTop() }}
              disabled={page === 1 || loading}
              className="btn-secondary text-xs px-3 py-1.5"
            >{t('sant.prevPage')}</button>
            <span className="text-xs text-slate-400">
              {t('sant.pageOf', { page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) })}
            </span>
            <button
              onClick={() => { setPage(p => p + 1); scrollToTop() }}
              disabled={page * PAGE_SIZE >= total || loading}
              className="btn-secondary text-xs px-3 py-1.5"
            >{t('sant.nextPage')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
