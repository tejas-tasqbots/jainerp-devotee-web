import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { loadDialCodes } from './PhoneInput'

/** India state dropdown backed by the bundled geo lookup (/geo/states). */
export function StateSelect({ value, onChange, className = 'form-select' }: {
  value: string; onChange: (state: string) => void; className?: string
}) {
  const [states, setStates] = useState<string[]>([])
  useEffect(() => { api.get('/geo/states').then(r => setStates(r.data.data ?? r.data ?? [])).catch(() => {}) }, [])
  const opts = value && !states.includes(value) ? [value, ...states] : states
  return (
    <select aria-label="State" title="State" className={className} value={value} autoComplete="off" onChange={e => onChange(e.target.value)}>
      <option value="">Select state…</option>
      {opts.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

/** City dropdown for the chosen state (/geo/states/:state/cities). */
export function CitySelect({ state, value, onChange, className = 'form-select' }: {
  state: string; value: string; onChange: (city: string) => void; className?: string
}) {
  const [cities, setCities] = useState<string[]>([])
  useEffect(() => {
    if (!state) { setCities([]); return }
    api.get(`/geo/states/${encodeURIComponent(state)}/cities`)
      .then(r => setCities(r.data.data ?? r.data ?? []))
      .catch(() => setCities([]))
  }, [state])
  const opts = value && !cities.includes(value) ? [value, ...cities] : cities
  return (
    <select aria-label="City" title="City" className={className} value={value} autoComplete="off" disabled={!state} onChange={e => onChange(e.target.value)}>
      <option value="">{state ? 'Select city…' : 'Pick a state first'}</option>
      {opts.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

/** Countries devotees/donors commonly come from — India first. */
export const COUNTRIES = [
  'India', 'United Arab Emirates', 'United States', 'Canada', 'United Kingdom',
  'Singapore', 'Hong Kong', 'Australia', 'New Zealand', 'Germany', 'France',
  'Belgium', 'Netherlands', 'Switzerland', 'Japan', 'Malaysia', 'Thailand',
  'Indonesia', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Nepal',
  'Sri Lanka', 'Kenya', 'Tanzania', 'South Africa', 'Mauritius', 'Other',
]

/**
 * Country dropdown backed by GET /geo/countries (COUNTRIES below is the
 * offline fallback). Defaults to India; when the value is India callers pair
 * it with StateSelect/CitySelect, otherwise free-text state/city inputs.
 */
export function CountrySelect({ value, onChange, className = 'form-select' }: {
  value: string; onChange: (country: string) => void; className?: string
}) {
  const [names, setNames] = useState<string[]>(COUNTRIES)
  useEffect(() => { loadDialCodes().then(l => setNames(l.map(c => c.name))).catch(() => {}) }, [])
  const effective = value || 'India'
  const opts = !names.includes(effective) ? [effective, ...names] : names
  return (
    <select aria-label="Country" title="Country" className={className} value={effective} autoComplete="off" onChange={e => onChange(e.target.value)}>
      {opts.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}
