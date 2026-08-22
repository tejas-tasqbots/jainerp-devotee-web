import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { TraditionSwitch } from '../../components/TraditionSwitch'
import { traditionsParam, useTraditionScope, type SectScopeMeta } from '../../lib/traditions'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import { EmptyState, SkeletonList } from '../../components/kit'
import { santDisplayName } from '../../lib/ascetic'
import type { ChaturmasEntry } from '../../types'

/**
 * Varshayog directory — who spent which monsoon where.
 *
 * `sant_locations.chaturmas` has been written since migration 002 and read by
 * nothing but a badge on the current location. The history was already in the
 * data; this is the page that finally asks for it.
 *
 * Grouped by state then city because that is how the printed chaturmas lists
 * every Jain household receives are laid out — a flat alphabetical list of 600
 * names is not how anyone looks for "who is near me this year".
 */
export function ChaturmasPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const [years, setYears] = useState<{ year: number; count: number }[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [city, setCity] = useState('')
  const [rows, setRows] = useState<ChaturmasEntry[]>([])
  const [loading, setLoading] = useState(true)
  // The gazetteer is scoped to the devotee's tradition like every other
  // discovery list, so it needs the same control — a chaturmas listing that
  // silently omits half the ascetics is indistinguishable from a thin year.
  const [scope, setScope] = useTraditionScope()
  const [sectScope, setSectScope] = useState<SectScopeMeta | null>(null)

  useEffect(() => {
    api.get('/sant/chaturmas/years', { params: traditionsParam(scope) })
      .then(({ data }) => {
        const list: { year: number; count: number }[] = data.data ?? []
        setYears(list)
        // Default to the most recent year that HAS data rather than the current
        // calendar year: in January the current year holds nothing yet, and the
        // page would open empty on a directory that is full.
        setYear(list[0]?.year ?? new Date().getFullYear())
      })
      .catch(() => { setYears([]); setYear(new Date().getFullYear()) })
  }, [scope])

  useEffect(() => {
    if (year == null) return
    const handle = setTimeout(() => {
      setLoading(true)
      api.get('/sant/chaturmas', { params: { year, city, ...traditionsParam(scope) } })
        .then(({ data }) => {
          setRows(data.data ?? [])
          setSectScope(data.meta?.sect_scope ?? null)
        })
        .catch(() => setRows([]))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(handle)
  }, [year, city, scope])

  /** Group into state → city → entries, preserving the API's ordering. */
  const grouped = useMemo(() => {
    const byState = new Map<string, Map<string, ChaturmasEntry[]>>()
    for (const r of rows) {
      const st = r.state?.trim() || t('sant.unknownState')
      const ct = r.city?.trim() || t('sant.unknownCity')
      if (!byState.has(st)) byState.set(st, new Map())
      const cities = byState.get(st)!
      if (!cities.has(ct)) cities.set(ct, [])
      cities.get(ct)!.push(r)
    }
    return byState
  }, [rows, t])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('sant.chaturmasTitle')}</h1>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-slate-500">{t('sant.chaturmasIntro')}</p>

        <div className="flex gap-2">
          <select
            className="form-input flex-1"
            value={year ?? ''}
            onChange={e => setYear(Number(e.target.value))}
            aria-label={t('sant.year')}
          >
            {years.length === 0 && year != null && <option value={year}>{year}</option>}
            {years.map(y => (
              <option key={y.year} value={y.year}>
                {y.year} · {t('sant.asceticCount', { count: y.count })}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="form-input pl-9"
              placeholder={t('ui.cityPh')}
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>
        </div>

        <TraditionSwitch meta={sectScope} scope={scope} onChange={setScope} />

        {loading ? (
          <SkeletonList rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('sant.chaturmasEmpty', { year })}
            hint={city ? t('sant.chaturmasEmptyCityHint') : t('sant.chaturmasEmptyHint')}
            action={city ? (
              <button className="btn-secondary" onClick={() => setCity('')}>
                {t('sant.clearFilters')}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-slate-400">
              {t('sant.chaturmasCount', { count: rows.length, year })}
            </p>
            {[...grouped.entries()].map(([state, cities]) => (
              <section key={state}>
                <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />{state}
                </h2>
                <div className="space-y-3">
                  {[...cities.entries()].map(([cityName, entries]) => (
                    <div key={cityName}>
                      <p className="text-xs font-medium text-slate-500 mb-1">{cityName}</p>
                      <div className="card divide-y divide-slate-100">
                        {entries.map(e => (
                          <button
                            key={e.id}
                            onClick={() => navigate(`/sant/${e.sant_id}`)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50"
                          >
                            {/* Lists never carry the inline photo, only the URL
                                and a has_photo flag (Images_And_Photos.md §6.3),
                                so PhotoAvatar takes photoUrl and falls back to
                                initials — a deliberate state, not a failure. */}
                            <PhotoAvatar
                              name={e.name}
                              photoUrl={e.photo_url}
                              className="w-10 h-10"
                              textClassName="text-base"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {santDisplayName(e, lang)}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {[
                                  lang === 'hi' ? e.type_display_hi ?? e.type_display : e.type_display,
                                  e.place,
                                ].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
