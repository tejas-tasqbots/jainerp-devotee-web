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
 * Discovery map — where the ascetics are right now, and where the temples are.
 *
 * BOTH layers, because a map of one without the other answers half the
 * question a devotee actually has ("where can I go, and who is there?"). Every
 * trust has carried coordinates since migration 033 and the temple detail page
 * has been drawing a pin from them all along; they simply never reached this
 * map, so it opened on an empty country whenever no ascetic had published a
 * location nearby.
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
const PIN_CHATURMAS = '#e8600c'
const PIN_TEMPLE = '#B7791F'

/**
 * `iconAnchor` is not optional here: Leaflet derives the default anchor from
 * `iconSize`, so a 0×0 icon anchors at its top-left and the CSS transform can
 * only recentre against a zero-width box — every pin sat half a marker to the
 * right of the place it was marking. Anchoring at the tip (13, 34) puts the
 * point of the pin on the coordinate, which is what a pin means.
 */
function pinSvg(color: string, hollow: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
    html: `<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
      ${hollow
        ? `<circle cx="13" cy="12.5" r="5" fill="#fff"/>`
        : `<rect x="8" y="9" width="10" height="8" fill="#fff"/><path d="M13 4l6 5H7z" fill="#fff"/>`}
    </svg>`,
  })
}

const santIcon = (chaturmas: boolean) => pinSvg(chaturmas ? PIN_CHATURMAS : PIN_NORMAL, true)
const templeIcon = () => pinSvg(PIN_TEMPLE, false)

interface TempleMapMarker {
  tenant_id: string
  slug: string
  name: string
  city: string | null
  state: string | null
  lat: number | string
  lng: number | string
}

/** Which pins are on the map. Both by default — the map is "what is near me". */
type Layers = { sants: boolean; temples: boolean }

/** India, at a zoom that shows the whole country. */
const INDIA: [number, number] = [22.9734, 78.6569]

export function SantMap() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const templeLayerRef = useRef<L.LayerGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [templeCount, setTempleCount] = useState(0)
  const [layers, setLayers] = useState<Layers>({ sants: true, temples: true })
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
  // Same reason: the layer toggles are read inside `moveend`.
  const layersRef = useRef(layers)
  layersRef.current = layers

  /** Popup body. `textContent`, never `innerHTML` — every field here is user-entered. */
  function popup(title: string, where: string, linkLabel: string, to: string) {
    const el = document.createElement('div')
    const h = document.createElement('strong')
    h.textContent = title
    const sub = document.createElement('div')
    sub.textContent = where
    sub.style.cssText = 'font-size:12px;color:#64748b;margin:2px 0 6px'
    const btn = document.createElement('button')
    btn.textContent = linkLabel
    btn.style.cssText = 'font-size:12px;color:#e8600c;text-decoration:underline;cursor:pointer'
    btn.onclick = () => navigate(to)
    el.append(h, sub, btn)
    return el
  }

  const load = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const bounds = { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }
    const { sants: wantSants, temples: wantTemples } = layersRef.current
    setLoading(true)
    setError('')

    // One `Promise.allSettled`, not two awaits: the two layers are independent,
    // and a failing sant fetch must not leave the temple pins unloaded (or the
    // other way round) — that is the shape that makes a map look broken when
    // only half of it is.
    const [santRes, templeRes] = await Promise.allSettled([
      wantSants
        ? api.get('/sant/map', { params: { ...bounds, ...filtersRef.current } })
        : Promise.resolve(null),
      wantTemples
        ? api.get('/temples/map', { params: { ...bounds, ...traditionsParam(scope) } })
        : Promise.resolve(null),
    ])

    const santLayer = layerRef.current
    if (santLayer) {
      santLayer.clearLayers()
      if (santRes.status === 'fulfilled' && santRes.value) {
        const { data } = santRes.value
        const markers: SantMapMarker[] = data.data ?? []
        setCount(markers.length)
        setSectScope(data.meta?.sect_scope ?? null)
        for (const m of markers) {
          const lat = Number(m.lat)
          const lng = Number(m.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
          const marker = L.marker([lat, lng], { icon: santIcon(!!m.chaturmas) })
          marker.bindPopup(popup(
            santDisplayName(m, lang),
            [m.place, m.city, m.state].filter(Boolean).join(', '),
            t('sant.viewProfile'),
            `/sant/${m.sant_id}`,
          ))
          santLayer.addLayer(marker)
        }
      } else {
        setCount(0)
      }
    }

    const templeLayer = templeLayerRef.current
    if (templeLayer) {
      templeLayer.clearLayers()
      if (templeRes.status === 'fulfilled' && templeRes.value) {
        const markers: TempleMapMarker[] = templeRes.value.data.data ?? []
        setTempleCount(markers.length)
        for (const m of markers) {
          const lat = Number(m.lat)
          const lng = Number(m.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
          const marker = L.marker([lat, lng], { icon: templeIcon() })
          marker.bindPopup(popup(
            m.name,
            [m.city, m.state].filter(Boolean).join(', '),
            t('sant.viewTemple'),
            `/temples/${m.slug}`,
          ))
          templeLayer.addLayer(marker)
        }
      } else {
        setTempleCount(0)
      }
    }

    const asked = [wantSants && santRes, wantTemples && templeRes].filter(Boolean)
    if (asked.length && asked.every(r => (r as PromiseSettledResult<unknown>).status === 'rejected')) {
      setError(t('sant.mapError'))
    }
    setLoading(false)
  }, [navigate, scope, t])

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current).setView(INDIA, 5)
    // ATTRIBUTION IS NOT OPTIONAL. The tiles are OpenStreetMap's and the
    // coordinates behind the pins are geocoded from OSM too, so both the ODbL
    // and OSM's tile usage policy require the credit. It had been switched off
    // with `attributionControl: false`, which is the one setting on this map
    // that is a licence question rather than a design one.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    // Added second so temple pins draw above ascetic ones where they coincide
    // — an ascetic is usually staying AT the temple, and the pin a devotee
    // needs to tap for directions is the place.
    templeLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // `moveend` covers pan AND zoom; binding both would double every fetch.
    map.on('moveend', () => { void load() })
    setTimeout(() => { map.invalidateSize(); void load() }, 0)
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      templeLayerRef.current = null
    }
  }, [load])

  // Refetch when a filter or layer changes — the bounds have not moved, so
  // `moveend` will not fire on its own.
  useEffect(() => {
    if (mapRef.current) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, pad, sect, scope, layers])

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
        <h1 className="page-title">{t('sant.discoverMapTitle')}</h1>
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

      {/* Which pins are on the map. A devotee looking for a temple should not
          have to read past ascetic filters that do not apply to it, so the
          layer switch sits above them and the rank/pad/sect filters disappear
          entirely when the ascetic layer is off. */}
      <div className="px-3 pt-3 flex gap-2 bg-white">
        {([
          ['sants', t('sant.layerSants'), PIN_NORMAL],
          ['temples', t('sant.layerTemples'), PIN_TEMPLE],
        ] as const).map(([key, label, color]) => (
          <button
            key={key}
            type="button"
            aria-pressed={layers[key]}
            onClick={() => setLayers(l => (
              // Never let both go off — an empty map with no way to read why is
              // the failure this screen is being fixed for.
              l[key] && !l[key === 'sants' ? 'temples' : 'sants'] ? l : { ...l, [key]: !l[key] }
            ))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              layers[key] ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400'
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: layers[key] ? color : '#cbd5e1' }}
            />
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 flex gap-2 flex-wrap bg-white border-b border-slate-200">
        {layers.sants && <>
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
        </>}
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
            : <span className="text-slate-600">
                {[
                  layers.sants && t('sant.markersShown', { count }),
                  layers.temples && t('sant.templesShown', { count: templeCount }),
                ].filter(Boolean).join(' · ')}
              </span>}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 flex-wrap">
            {layers.temples && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIN_TEMPLE }} />
                {t('sant.layerTemples')}
              </span>
            )}
            {layers.sants && <>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIN_NORMAL }} />
                {t('sant.currentlyAt')}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIN_CHATURMAS }} />
                {t('ui.chaturmas')}
              </span>
            </>}
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
