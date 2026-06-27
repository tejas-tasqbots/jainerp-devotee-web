import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Flame, Phone, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { api, apiError } from '../../lib/api'

type Step = 'mobile' | 'otp' | 'profile'

export function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [mockOtp, setMockOtp] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile setup for new users
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileGotra, setProfileGotra] = useState('')
  const [profilePan, setProfilePan] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [profileState, setProfileState] = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [profilePincode, setProfilePincode] = useState('')

  const { setTokens, setUser, deviceId, user: authUser } = useAuthStore()

  async function sendOtp() {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/send-otp', { mobile: `+91${mobile}`, purpose: 'login' })
      if (data.data?.dev_otp) setMockOtp(data.data.dev_otp)
      setStep('otp')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/verify-otp', {
        mobile: `+91${mobile}`,
        otp,
        portal: 'devotee',
        device_id: deviceId,
        platform: 'web',
      })
      const result = data.data
      setTokens(result.access_token, result.refresh_token)
      setUser({ id: result.user.id, mobile: result.user.mobile, name: result.user.name })
      if (!result.profile_complete) {
        // New user — collect their details before going home
        setProfileName(result.user.name ?? '')
        setStep('profile')
      } else {
        navigate('/home', { replace: true })
      }
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!profileName.trim()) { setError('Please enter your name'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.patch('/me', {
        name: profileName.trim(),
        email: profileEmail.trim() || undefined,
        gotra: profileGotra.trim() || undefined,
        pan: profilePan.trim() || undefined,
        city: profileCity.trim() || undefined,
        state: profileState.trim() || undefined,
        address: profileAddress.trim() || undefined,
        pincode: profilePincode.trim() || undefined,
      })
      if (authUser) setUser({ ...authUser, name: data.data?.name ?? profileName.trim() })
      navigate('/home', { replace: true })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-orange-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-brand-red)' }}
          >
            <Flame size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-navy-900">Jain</span>
            <span style={{ color: 'var(--color-brand-red)' }}>ERP</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Devotee / Bhakt Portal</p>
        </div>

        {/* Step 1: Mobile */}
        {step === 'mobile' && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={13}
                placeholder="9876543210"
                className="form-input"
                value={mobile}
                onChange={e => {
                  // Accept with or without +91 / 91 prefix — normalise to 10 digits
                  const digits = e.target.value.replace(/\D/g, '')
                  const ten = digits.startsWith('91') && digits.length > 10
                    ? digits.slice(2)
                    : digits.slice(0, 10)
                  setMobile(ten)
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">India mobile — +91 is added automatically</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={loading || mobile.length !== 10}
              className="btn-primary w-full justify-center py-3"
            >
              <Phone size={16} />
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              New user? Enter your mobile — you'll set up your profile after OTP.
            </p>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('mobile'); setOtp(''); setError('') }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-semibold">+91 {mobile}</span>
            </p>
            {mockOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
                Dev mode — OTP: <span className="font-mono font-bold">{mockOtp}</span>
              </div>
            )}
            <div>
              <label className="form-label">Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                className="form-input text-center text-2xl font-mono tracking-[0.5em]"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full justify-center py-3"
            >
              <ShieldCheck size={16} />
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (d === '⌫') setOtp(p => p.slice(0, -1))
                    else if (d !== '') setOtp(p => p.length < 6 ? p + d : p)
                    setError('')
                  }}
                  className={`h-11 rounded-lg text-lg font-semibold transition-colors ${
                    d === '' ? '' :
                    d === '⌫' ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                    'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Profile setup (new users only) */}
        {step === 'profile' && (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <User size={22} className="text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">Welcome! Set up your profile</h2>
              <p className="text-xs text-slate-400 mt-1">Mobile: <strong>+91 {mobile}</strong></p>
            </div>

            <div>
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                placeholder="Ayush Kasliwal"
                value={profileName}
                onChange={e => { setProfileName(e.target.value); setError('') }}
                autoFocus
              />
            </div>

            <div>
              <label className="form-label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="email" className="form-input" placeholder="you@example.com"
                value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Gotra <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="form-input" placeholder="e.g. Kashyap"
                  value={profileGotra} onChange={e => setProfileGotra(e.target.value)} />
              </div>
              <div>
                <label className="form-label">PAN <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="form-input uppercase" placeholder="ABCDE1234F" maxLength={10}
                  value={profilePan} onChange={e => setProfilePan(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">City <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="form-input" placeholder="Mumbai"
                  value={profileCity} onChange={e => setProfileCity(e.target.value)} />
              </div>
              <div>
                <label className="form-label">State <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="form-input" placeholder="Maharashtra"
                  value={profileState} onChange={e => setProfileState(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Address <span className="text-slate-400 font-normal">(optional)</span></label>
              <input className="form-input" placeholder="House / Street / Locality"
                value={profileAddress} onChange={e => setProfileAddress(e.target.value)} />
            </div>

            <div>
              <label className="form-label">Pincode <span className="text-slate-400 font-normal">(optional)</span></label>
              <input className="form-input" placeholder="400001" inputMode="numeric" maxLength={6}
                value={profilePincode} onChange={e => setProfilePincode(e.target.value.replace(/\D/g, ''))} />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="button"
              onClick={saveProfile}
              disabled={loading || !profileName.trim()}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              <ShieldCheck size={16} />
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/home', { replace: true })}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
