import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { TraditionSwitch } from '../../components/TraditionSwitch'
import { traditionsParam, useTraditionScope, type SectScopeMeta } from '../../lib/traditions'
import { PADS, SECTS, ASCETIC_TYPES, santDisplayName } from '../../lib/ascetic'
import type { SantMapMarker } from '../../types'

/**
 * Discovery map — where the ascetics are, right now.
 *
 * Loads by BOUNDING BOX and reloads on pan/zoom rather than fetching every
 * location once: the directory is national, and shipping every pin on first
 * paint is what makes a map feel broken on a phone.
 *
 * A CSS `divIcon` rather than Leaflet's default marker: the default pulls its
 * PNGs from a relative path that Vite's bundler rewrites, so it renders as a
 * broken image in production while looking fine in dev. LocationPicker.tsx
 * already solved it the same way.
 */

const PIN_NORMAL = '#0D1B2E'
const PIN_CHATURMAS = '#D62828'

function pinIcon(chaturmas: boolean) {
  const color = chaturmas ? PIN_CHATURMAS : PIN_NORMAL
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-100%)">
      <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
        <circle cx="13" cy="12.5" r="5" fill="#fff"/>
      </svg></div>`,
  })
}

/** India, at a zoom that shows the whole country. */
const INDIA: [number, number] = [22.9734, 78.6569]

export function SantMap() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [type, setType] = useState('')
  const [pad, setPad] = useState('')
  const [sect, setSect] = useState('')
  const [locating, setLocating] = useState(false)
  const [scope, setScope] = useTraditionScope()
  const [sectScope, setSectScope] = useState<SectScopeMeta | null>(null)

  // Filters are read inside a map event handler that is registered once, so a
  // ref keeps it reading the CURRENT values. Without this the handler closes
  // over the first render's empty filters and panning silently resets them.
  const filtersRef = useRef({ type, pad, sect, ...traditionsParam(scope) })
  filtersRef.current = { type, pad, sect, ...traditionsParam(scope) }

  const load = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/sant/map', {
        params: {
          north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(),
          ...filtersRef.current,
        },
      })
      const markers: SantMapMarker[] = data.data ?? []
      setCount(markers.length)
      setSectScope(data.meta?.sect_scope ?? null)

      const layer = layerRef.current
      if (!layer) return
      layer.clearLayers()
      for (const m of markers) {
        const lat = Number(m.lat)
        const lng = Number(m.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        const marker = L.marker([lat, lng], { icon: pinIcon(!!m.chaturmas) })
        const where = [m.place, m.city, m.state].filter(Boolean).join(', ')
        // textContent, not innerHTML: `name` and `place` are user-entered and
        // would otherwise be an HTML injection straight into the popup.
        const el = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = santDisplayName(m)
        const sub = document.createElement('div')
        sub.textContent = where
        sub.style.cssText = 'font-size:12px;color:#64748b;margin:2px 0 6px'
        const btn = document.createElement('button')
        btn.textContent = t('sant.viewProfile')
        btn.style.cssText = 'font-size:12px;color:#D62828;text-decoration:underline;cursor:pointer'
        btn.onclick = () => navigate(`/sant/${m.sant_id}`)
        el.append(title, sub, btn)
        marker.bindPopup(el)
        layer.addLayer(marker)
      }
    } catch {
      setError(t('sant.mapError'))
    } finally {
      setLoading(false)
    }
  }, [navigate, t])

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { attributionControl: false }).setView(INDIA, 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // `moveend` covers pan AND zoom; binding both would double every fetch.
    map.on('moveend', () => { void load() })
    setTimeout(() => { map.invalidateSize(); void load() }, 0)
    return () => { map.remove(); mapRef.current = null; layerRef.current = null }
  }, [load])

  // Refetch when a filter changes — the bounds have not moved, so `moveend`
  // will not fire on its own.
  useEffect(() => {
    if (mapRef.current) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, pad, sect, scope])

  function useMyLocation() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(t('sant.geoInsecure'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 11)
      },
      () => { setLocating(false); setError(t('sant.geoFailed')) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="page-header">
        <h1 className="page-title">{t('sant.mapTitle')}</h1>
        <button
          onClick={useMyLocation}
          disabled={locating}
          aria-label={t('sant.nearMe')}
          title={t('sant.nearMe')}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50"
        >
          {locating ? <Loader2 size={20} className="animate-spin text-slate-600" />
            : <Crosshair size={20} className="text-slate-600" />}
        </button>
      </div>

      <div className="p-3 flex gap-2 flex-wrap bg-white border-b border-slate-200">
        <select className="form-input flex-1 min-w-[110px]" value={type}
          onChange={e => setType(e.target.value)} aria-label={t('sant.rank')}>
          <option value="">{t('sant.allRanks')}</option>
          {ASCETIC_TYPES.map(o => <option key={o.value} value={o.value}>{o.rank}</option>)}
        </select>
        <select className="form-input flex-1 min-w-[110px]" value={pad}
          onChange={e => setPad(e.target.value)} aria-label={t('sant.pad')}>
          <option value="">{t('sant.allPads')}</option>
          {PADS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {scope === 'all' && (
          <select className="form-input flex-1 min-w-[110px]" value={sect}
            onChange={e => setSect(e.target.value)} aria-label={t('sant.sect')}>
            <option value="">{t('sant.allSects')}</option>
            {SECTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      <div className="px-3 pb-2 bg-white border-b border-slate-200">
        <TraditionSwitch
          meta={sectScope}
          scope={scope}
          onChange={next => {
            setScope(next)
            // Scoping back to one tradition drops a cross-tradition pick, or the
            // two controls contradict each other and the map empties.
            if (next === 'mine') setSect('')
          }}
        />
      </div>

      <div className="relative flex-1">
        <div ref={elRef} className="absolute inset-0 z-0" style={{ minHeight: 420 }} />
        <div className="absolute top-2 left-2 z-[400] bg-white/95 rounded-lg shadow px-3 py-2 text-xs">
          {loading
            ? <span className="flex items-center gap-1.5 text-slate-500">
                <Loader2 size={12} className="animate-spin" />{t('ui.loading')}
              </span>
            : <span className="text-slate-600">{t('sant.markersShown', { count })}</span>}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIN_NORMAL }} />
              {t('sant.currentlyAt')}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIN_CHATURMAS }} />
              {t('ui.chaturmas')}
            </span>
          </div>
        </div>
        {error && (
          <div className="absolute bottom-2 left-2 right-2 z-[400] bg-amber-50 border border-amber-200
                          text-amber-800 text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
