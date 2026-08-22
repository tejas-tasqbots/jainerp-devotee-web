import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Clock, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { StateSelect, CitySelect } from '../../components/GeoSelect'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import { EmptyState, SkeletonList } from '../../components/kit'
import { EVENT_TYPES, eventTypeLabel, padLabel } from '../../lib/ascetic'
import type { SantEvent } from '../../types'
import { TraditionSwitch } from '../../components/TraditionSwitch'
import { traditionsParam, useTraditionScope, type SectScopeMeta } from '../../lib/traditions'

/**
 * Upcoming events across every ascetic a devotee can see.
 *
 * Grouped by date rather than by ascetic: the question this page answers is
 * "what is happening, and when", and a devotee planning a visit reads it as a
 * calendar. Anniversaries are not here — they belong on the profile, because
 * they are derived per-ascetic rather than scheduled.
 */
export function SantEventsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const [rows, setRows] = useState<SantEvent[]>([])
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useTraditionScope()
  const [sectScope, setSectScope] = useState<SectScopeMeta | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true)
      api.get('/sant/events', { params: { city, state: stateName, type, ...traditionsParam(scope) } })
        .then(({ data }) => {
          setRows(data.data ?? [])
          setSectScope(data.meta?.sect_scope ?? null)
        })
        .catch(() => setRows([]))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(handle)
  }, [city, stateName, type, scope])

  const byDate = useMemo(() => {
    const map = new Map<string, SantEvent[]>()
    for (const e of rows) {
      if (!map.has(e.starts_on)) map.set(e.starts_on, [])
      map.get(e.starts_on)!.push(e)
    }
    return map
  }, [rows])

  /**
   * Formats a `YYYY-MM-DD` from Postgres without going through the local
   * timezone. `new Date('2026-09-14')` is parsed as UTC midnight and then
   * rendered in local time, which prints the previous day west of Greenwich —
   * the same class of off-by-one this repo already hit on FY dates.
   */
  function formatDay(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(i18n.language, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('sant.eventsTitle')}</h1>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          {/* State scopes the city list; both go to the API, which has always
              accepted them and only ever received a typed city. */}
          <StateSelect value={stateName} onChange={v => { setStateName(v); setCity('') }}
            className="form-input flex-1 text-xs" />
          <CitySelect state={stateName} value={city} onChange={setCity}
            className="form-input flex-1 text-xs" />
          <select
            className="form-input flex-1"
            value={type}
            onChange={e => setType(e.target.value)}
            aria-label={t('sant.eventType')}
          >
            <option value="">{t('sant.allEventTypes')}</option>
            {EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <TraditionSwitch meta={sectScope} scope={scope} onChange={setScope} />

        {loading ? (
          <SkeletonList rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('sant.eventsEmpty')}
            hint={city || type ? t('sant.eventsEmptyFilterHint') : t('sant.eventsEmptyHint')}
            action={(city || type) ? (
              <button className="btn-secondary" onClick={() => { setCity(''); setType('') }}>
                {t('sant.clearFilters')}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-5">
            {[...byDate.entries()].map(([date, events]) => (
              <section key={date}>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">{formatDay(date)}</h2>
                <div className="card divide-y divide-slate-100">
                  {events.map(e => {
                    const pad = padLabel(e.sant_pad, lang)
                    return (
                      <button
                        key={e.id}
                        onClick={() => e.sant_id && navigate(`/sant/${e.sant_id}`)}
                        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50"
                      >
                        <PhotoAvatar
                          name={e.sant_name ?? e.title}
                          photoUrl={e.photo_url}
                          className="w-10 h-10"
                          textClassName="text-base"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                          {e.sant_name && (
                            <p className="text-xs text-slate-500 truncate">
                              {pad ? `${pad} ${e.sant_name}` : e.sant_name}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="badge badge-gold text-[9px]">{eventTypeLabel(e.type)}</span>
                            {(e.place || e.city) && (
                              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                <MapPin size={10} />
                                {[e.place, e.city].filter(Boolean).join(', ')}
                              </span>
                            )}
                            {e.starts_at_time && (
                              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                <Clock size={10} />{e.starts_at_time}
                              </span>
                            )}
                          </div>
                          {e.tithi_note && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{e.tithi_note}</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
