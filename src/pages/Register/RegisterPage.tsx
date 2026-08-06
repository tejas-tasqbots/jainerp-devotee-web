import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, User } from 'lucide-react'
import { api, apiError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { StateSelect, CitySelect, CountrySelect } from '../../components/GeoSelect'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  // Carried from LoginPage (new user) or directly from RequireAuth (existing
  // user whose profile was already incomplete) — send them on afterwards.
  const from = (location.state as { from?: string } | null)?.from
  const { user: authUser, setUser } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gotra, setGotra] = useState('')
  // Sampradaya (migration 032). Asked once here and editable later in Profile.
  const [sect, setSect] = useState('')
  const [pan, setPan] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('India')
  const [state, setState] = useState('')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Full name is required'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.patch('/me', {
        name: name.trim(),
        email: email.trim() || undefined,
        gotra: gotra.trim() || undefined,
        sect: sect || undefined,
        pan: pan.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country || undefined,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
      })
      if (authUser) setUser({ ...authUser, name: data.data?.name ?? name.trim() })
      navigate(from || '/home', { replace: true })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <div className="w-14 h-14 rounded-full bg-brand-red flex items-center justify-center mx-auto mb-3">
            <User size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">{t('ui.completeProfile')}</h1>
          <p className="text-xs text-slate-400 mt-1">{t('ui.mobileColon')}<strong className="text-slate-600">{authUser?.mobile}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-3">
          {/* Full Name */}
          <div>
            <label className="form-label">{t('ui.fullName')}</label>
            <input
              className="form-input"
              placeholder="Ayush Kasliwal"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="form-label">{t('ui.email')}<span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Sampradaya — optional, and skipping it must cost the devotee
              nothing: someone who does not answer keeps seeing every temple. */}
          <div>
            <label className="form-label">{t('ui.sampradaya')}<span className="text-slate-400 font-normal">(opt.)</span>
            </label>
            <div className="flex gap-2">
              {[
                { value: '', label: 'Prefer not to say' },
                { value: 'digambar', label: 'Digambar' },
                { value: 'shwetambar', label: 'Shwetambar' },
              ].map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSect(o.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    sect === o.value
                      ? 'border-brand-red bg-brand-red/10 text-brand-red'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">{t('ui.sectHelpLong')}</p>
          </div>

          {/* Gotra + PAN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('ui.gotra')}<span className="text-slate-400 font-normal">(opt.)</span></label>
              <input
                className="form-input"
                placeholder="e.g. Kashyap"
                value={gotra}
                onChange={e => setGotra(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">PAN <span className="text-slate-400 font-normal">(opt.)</span></label>
              <input
                className="form-input uppercase"
                placeholder="ABCDE1234F"
                maxLength={10}
                value={pan}
                onChange={e => setPan(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="form-label">{t('ui.country')}</label>
            <CountrySelect value={country} onChange={c => { setCountry(c); setState(''); setCity('') }} />
          </div>

          {/* State + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('ui.state')}<span className="text-slate-400 font-normal">(opt.)</span></label>
              {country === 'India' ? (
                <StateSelect value={state} onChange={s => { setState(s); setCity('') }} />
              ) : (
                <input className="form-input" placeholder={t('ui.stateProvince')} value={state}
                  onChange={e => setState(e.target.value)} />
              )}
            </div>
            <div>
              <label className="form-label">{t('ui.city')}<span className="text-slate-400 font-normal">(opt.)</span></label>
              {country === 'India' ? (
                <CitySelect state={state} value={city} onChange={setCity} />
              ) : (
                <input className="form-input" placeholder={t('ui.city')} value={city}
                  onChange={e => setCity(e.target.value)} />
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="form-label">{t('ui.address')}<span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              className="form-input"
              placeholder={t('ui.houseStreet')}
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="form-label">{t('ui.pincode')}<span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              className="form-input"
              placeholder={country === 'India' ? '400001' : 'Postal code'}
              inputMode={country === 'India' ? 'numeric' : 'text'}
              maxLength={country === 'India' ? 6 : 12}
              value={pincode}
              onChange={e => setPincode(country === 'India' ? e.target.value.replace(/\D/g, '') : e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary w-full justify-center py-3 mt-2"
          >
            <ShieldCheck size={16} />
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/home', { replace: true })}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
          >{t('ui.skipForNow')}</button>
        </form>
      </div>
    </div>
  )
}
