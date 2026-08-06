import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Crosshair, MapPin, Navigation, Search, SlidersHorizontal } from 'lucide-react'
import { api, apiError, fmtPaise } from '../../lib/api'
import type { StayResult, StaySearchMeta } from '../../types'

/**
 * Find a dharamshala across every trust — "somewhere near Palitana, for these
 * two nights, for four people".
 *
 * This is the screen a devotee starts on when they need a bed, before any one
 * temple is chosen; the per-temple booking page is where they land afterwards.
 * It deliberately reads like a hotel search, because that is the shape people
 * already know.
 *
 * Two things it refuses to fake:
 *
 *  - **Distance is only shown when it was actually measured.** Without the
 *    devotee's coordinates there is no distance, and inventing one from the
 *    city centre would be a number that looks precise and is not.
 *  - **A capped result set says so.** The server prices only a shortlist, and
 *    `meta.truncated` becomes "refine your search" rather than letting the page
 *    imply these are the only dharamshalas that exist.
 *
 * The map is a **hand-off**: "Directions" opens the device's own map app with
 * the temple pinned. That needs no API key, works with whatever map the devotee
 * already uses, and cannot break because a billing account lapsed.
 */
export function StaySearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState(params.get('q') ?? '')
  const [city, setCity] = useState(params.get('city') ?? '')
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')
  const [persons, setPersons] = useState(Number(params.get('persons') ?? 1))
  const [sort, setSort] = useState<'distance' | 'price' | 'name'>('name')
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = useState<number | ''>('')

  const [stays, setStays] = useState<StayResult[] | null>(null)
  const [meta, setMeta] = useState<StaySearchMeta | null>(null)
  const [localities, setLocalities] = useState<{ city: string; state: string; trusts: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/stays/localities')
      .then(r => setLocalities(r.data.data ?? []))
      .catch(() => setLocalities([]))
  }, [])

  useEffect(() => { search() }, [])

  async function search(override?: { lat?: number; lng?: number; sort?: typeof sort }) {
    setLoading(true); setError('')
    const lat = override?.lat ?? near?.lat
    const lng = override?.lng ?? near?.lng
    const useSort = override?.sort ?? sort
    try {
      const { data } = await api.get('/stays/search', {
        params: {
          ...(q ? { q } : {}),
          ...(city ? { city } : {}),
          ...(from && to ? { from, to } : {}),
          persons,
          ...(lat != null && lng != null ? { lat, lng } : {}),
          ...(radiusKm !== '' ? { radius_km: radiusKm } : {}),
          sort: useSort,
          limit: 30,
        },
      })
      setStays(data.data?.stays ?? [])
      setMeta(data.data?.meta ?? null)
      // Keep the URL shareable — a devotee sending "look at this" to family
      // should send the search, not the empty page.
      const next = new URLSearchParams()
      if (q) next.set('q', q)
      if (city) next.set('city', city)
      if (from && to) { next.set('from', from); next.set('to', to) }
      if (persons > 1) next.set('persons', String(persons))
      setParams(next, { replace: true })
    } catch (e) {
      setError(apiError(e))
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  /** Ask the browser where we are, then re-search ranked by distance. */
  function locate() {
    if (!navigator.geolocation) {
      setError('This browser cannot share your location. Try searching by city instead.')
      return
    }
    setLocating(true); setError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setNear(at)
        setSort('distance')
        setLocating(false)
        search({ ...at, sort: 'distance' })
      },
      err => {
        setLocating(false)
        // Permission denied is a choice, not a fault — say what to do instead.
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is switched off for this site, so “near me” cannot work. Search by city instead.'
            : 'Could not get your location. Search by city instead.',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  function directionsUrl(s: StayResult) {
    return s.lat != null && s.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [s.name, s.area, s.city, s.state].filter(Boolean).join(', '),
        )}`
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label={t('ui.goBack')} className="p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">{t('ui.findDharamshala')}</h1>
          <p className="text-xs text-slate-500">{t('ui.acrossEveryTrust')}</p>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* ── search ─────────────────────────────────────────────────── */}
        <div className="card space-y-3 p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="form-input pl-9"
              placeholder={t('ui.templeCityPh')}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('ui.checkIn')}</label>
              <input type="date" className="form-input" value={from}
                onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('ui.checkOut')}</label>
              <input type="date" className="form-input" value={to} min={from}
                onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('ui.guests')}</label>
              <input type="number" min={1} max={20} className="form-input" value={persons}
                onChange={e => setPersons(Math.max(1, Number(e.target.value)))} />
            </div>
            <div>
              <label className="form-label">{t('ui.sortBy')}</label>
              <select className="form-input" value={sort}
                onChange={e => { const v = e.target.value as typeof sort; setSort(v); search({ sort: v }) }}>
                <option value="name">Name</option>
                <option value="price">{t('ui.price')}</option>
                <option value="distance" disabled={!near}>Distance{!near && ' (needs location)'}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => search()} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button onClick={locate} disabled={locating} className="btn-secondary"
              title={t('ui.rankByDistance')}>
              <Crosshair size={16} /> {locating ? 'Locating…' : 'Near me'}
            </button>
          </div>

          {near && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal size={12} />{t('ui.within')}<input type="number" min={1} max={2000} placeholder="any"
                className="w-20 rounded border border-slate-200 px-2 py-1"
                value={radiusKm}
                onChange={e => setRadiusKm(e.target.value === '' ? '' : Number(e.target.value))} />
              km
              <button onClick={() => search()} className="text-brand-red underline">apply</button>
            </div>
          )}
        </div>

        {/* ── locality chips ─────────────────────────────────────────── */}
        {localities.length > 0 && !near && (
          <div className="flex flex-wrap gap-2">
            {localities.slice(0, 8).map(l => (
              <button
                key={`${l.city}-${l.state}`}
                onClick={() => { setCity(l.city); setQ(''); setTimeout(() => search(), 0) }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  city === l.city
                    ? 'border-brand-red bg-red-50 text-brand-red'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {l.city} <span className="text-slate-400">{l.trusts}</span>
              </button>
            ))}
            {city && (
              <button onClick={() => { setCity(''); setTimeout(() => search(), 0) }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                clear
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* ── results ────────────────────────────────────────────────── */}
        {meta && stays && stays.length > 0 && (
          <p className="text-xs text-slate-500">
            {meta.total} dharamshala{meta.total === 1 ? '' : 's'}
            {meta.nights ? ` · ${meta.nights} night${meta.nights === 1 ? '' : 's'} · ${meta.persons} guest${meta.persons === 1 ? '' : 's'}` : ''}
            {meta.near ? ' · nearest first' : ''}
          </p>
        )}

        {stays?.length === 0 && !loading && (
          <div className="card p-6 text-center">
            <BedDouble size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">{t('ui.nothingFree')}</p>
            <p className="mt-1 text-xs text-slate-500">
              {from && to
                ? 'Try different dates, fewer guests, or a wider area.'
                : 'Try a different city or clear the filters.'}
            </p>
          </div>
        )}

        {stays?.map(s => (
          <div key={s.tenant_id} className="card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  {[s.area, s.city, s.state].filter(Boolean).join(', ') || '—'}
                </p>
                {/* Only rendered when the search actually carried coordinates. */}
                {s.distance_km != null && (
                  <p className="mt-0.5 text-xs font-medium text-brand-red">{s.distance_km} km away</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {s.rooms_available > 0
                    ? `${s.rooms_available} room${s.rooms_available === 1 ? '' : 's'} free`
                    : 'No rooms free'}
                  {s.sleeps_max ? ` · sleeps up to ${s.sleeps_max}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {s.from_paise != null ? (
                  <>
                    <p className="text-base font-bold text-slate-800">
                      ₹{fmtPaise(s.from_paise).replace(/\.00$/, '')}
                    </p>
                    <p className="text-xs text-slate-400">per night</p>
                    {s.from_total_paise != null && s.nights ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        ₹{fmtPaise(s.from_total_paise).replace(/\.00$/, '')} total
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">{t('ui.tariffOnRequest')}</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate(
                  `/temples/${s.slug}/book${from && to ? `?from=${from}&to=${to}&persons=${persons}` : ''}`,
                )}
                className="btn-primary flex-1"
                disabled={s.rooms_available === 0}
              >
                {s.rooms_available === 0 ? 'Unavailable' : 'See rooms'}
              </button>
              {/* Hand-off, not an embedded map: opens whichever map app the
                  devotee already uses, with no API key and no billing account. */}
              <a
                href={directionsUrl(s)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                title={t('ui.openInMaps')}
              >
                <Navigation size={16} />
              </a>
            </div>
          </div>
        ))}

        {meta?.truncated && (
          <p className="pt-2 text-center text-xs text-slate-400">{t('ui.closestMatches')}</p>
        )}
      </div>
    </div>
  )
}
