import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, User } from 'lucide-react'
import { api, apiError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const { user: authUser, setUser } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gotra, setGotra] = useState('')
  const [pan, setPan] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  useEffect(() => { api.get('/geo/states').then(r => setStates(r.data.data ?? r.data ?? [])).catch(() => {}) }, [])
  useEffect(() => {
    if (state) api.get(`/geo/states/${encodeURIComponent(state)}/cities`).then(r => setCities(r.data.data ?? r.data ?? [])).catch(() => setCities([]))
  }, [state])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Full name is required'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.patch('/me', {
        name: name.trim(),
        email: email.trim() || undefined,
        gotra: gotra.trim() || undefined,
        pan: pan.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
      })
      if (authUser) setUser({ ...authUser, name: data.data?.name ?? name.trim() })
      navigate('/home', { replace: true })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-orange-50 flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <User size={26} className="text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">Complete Your Profile</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mobile: <strong className="text-slate-600">+91 {authUser?.mobile?.replace('+91', '')}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-3">
          {/* Full Name */}
          <div>
            <label className="form-label">Full Name *</label>
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
            <label className="form-label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Gotra + PAN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Gotra <span className="text-slate-400 font-normal">(opt.)</span></label>
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

          {/* State + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">State <span className="text-slate-400 font-normal">(opt.)</span></label>
              <select className="form-select" value={state} onChange={e => { setState(e.target.value); setCity('') }}>
                <option value="">Select…</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">City <span className="text-slate-400 font-normal">(opt.)</span></label>
              <input className="form-input" list="reg-cities" placeholder="Mumbai" value={city} onChange={e => setCity(e.target.value)} />
              <datalist id="reg-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="form-label">Address <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              className="form-input"
              placeholder="House / Street / Locality"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="form-label">Pincode <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              className="form-input"
              placeholder="400001"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
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
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}
