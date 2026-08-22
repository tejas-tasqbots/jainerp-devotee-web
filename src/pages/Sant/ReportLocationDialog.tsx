import { useState } from 'react'
import { StateSelect, CitySelect } from '../../components/GeoSelect'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'

/**
 * "I saw them here" — a devotee's location report.
 *
 * Deliberately does NOT change the location. It queues a proposal that the
 * Sant's own representative approves, the same path a mandir admin's proposal
 * takes (migration 016). The copy says so plainly: a devotee who thinks they
 * have edited a verified profile will be confused when nothing changes, and a
 * crowdsourced directory that silently discards contributions loses its
 * contributors.
 */
export function ReportLocationDialog({
  santId, santName, onClose,
}: {
  santId: string
  santName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [place, setPlace] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [notes, setNotes] = useState('')
  const [chaturmas, setChaturmas] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  function useMyLocation() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(t('sant.geoInsecure'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        setCoords({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        })
      },
      () => { setLocating(false); setError(t('sant.geoFailed')) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit() {
    if (!place.trim()) { setError(t('sant.placeRequired')); return }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/sant/${santId}/report-location`, {
        place: place.trim(),
        city: city.trim() || undefined,
        state: stateName.trim() || undefined,
        notes: notes.trim() || undefined,
        chaturmas,
        lat: coords?.lat,
        lng: coords?.lng,
        // Today, in the user's own timezone. Built from local parts rather than
        // toISOString(), which converts to UTC and reports yesterday for anyone
        // in IST before 05:30.
        from_date: localToday(),
      })
      // A duplicate open report is `submitted: false` with a message, not an
      // error — the devotee did nothing wrong and must not see a red failure.
      setDone(data.data?.message ?? t('sant.reportThanks'))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? t('sant.reportFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('sant.reportSeen')}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-800">{t('sant.reportSeen')}</h2>
          <button onClick={onClose} aria-label={t('ui.close')} className="p-1 -mr-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
            <p className="text-sm text-slate-700">{done}</p>
            <button onClick={onClose} className="btn-primary w-full mt-5">{t('ui.done')}</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">
              {t('sant.reportIntro', { name: santName })}
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="form-label" htmlFor="rl-place">{t('sant.placeLabel')}</label>
                <input id="rl-place" className="form-input" value={place}
                  onChange={e => setPlace(e.target.value)}
                  placeholder={t('sant.placePh')} />
              </div>
              {/* Dropdowns, not free text. This report becomes a real
                  `sant_locations` row the moment the representative approves
                  it, and the devotee directory filters on that city — so a
                  typed "sagar" / "Saagar" / "Sagar " fragments the very column
                  the search depends on. State first, because the city list is
                  fetched for the chosen state. */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="form-label">{t('sant.state')}</label>
                  <StateSelect value={stateName} onChange={v => { setStateName(v); setCity('') }} />
                </div>
                <div className="flex-1">
                  <label className="form-label">{t('ui.city')}</label>
                  <CitySelect state={stateName} value={city} onChange={setCity} />
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="rl-notes">{t('sant.notesLabel')}</label>
                <textarea id="rl-notes" className="form-input" rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('sant.notesPh')} />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={chaturmas}
                  onChange={e => setChaturmas(e.target.checked)} />
                {t('sant.reportIsChaturmas')}
              </label>

              <button type="button" onClick={useMyLocation} disabled={locating}
                className="text-xs text-brand-red hover:underline disabled:opacity-50">
                {locating ? t('sant.locating')
                  : coords ? t('sant.coordsSet', { lat: coords.lat, lng: coords.lng })
                  : t('sant.attachLocation')}
              </button>
            </div>

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <button onClick={submit} disabled={saving}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {t('sant.submitReport')}
            </button>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              {t('sant.reportReviewNote')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** Today as YYYY-MM-DD in the user's own timezone. */
function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
