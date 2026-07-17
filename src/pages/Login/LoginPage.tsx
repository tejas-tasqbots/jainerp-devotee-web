import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Flame, Phone, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { api, apiError } from '../../lib/api'
import { isValidPhone, PhoneInput } from '../../components/PhoneInput'

type Step = 'mobile' | 'otp'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // Set by RequireAuth when redirecting here from a deep link (e.g. a WhatsApp
  // receipt link) — send the user back to it instead of always /home.
  const from = (location.state as { from?: string } | null)?.from
  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [mockOtp, setMockOtp] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setTokens, setUser, deviceId } = useAuthStore()

  async function sendOtp() {
    if (!isValidPhone(mobile)) {
      setError('Enter a valid mobile number')
      return
    }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/send-otp', { mobile, purpose: 'login' })
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
        mobile,
        otp,
        portal: 'devotee',
        device_id: deviceId,
        platform: 'web',
      })
      const result = data.data
      setTokens(result.access_token, result.refresh_token)
      setUser({ id: result.user.id, mobile: result.user.mobile, name: result.user.name })
      // New user (no name) → registration first (carrying `from` along so
      // RegisterPage can still land them on their original destination
      // afterwards); existing user → straight back to where they came from.
      if (result.profile_complete) {
        navigate(from || '/home', { replace: true })
      } else {
        navigate('/register', { replace: true, state: { from } })
      }
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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[var(--color-brand-red)]">
            <Flame size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-navy-900">Jain</span>
            <span className="text-[var(--color-brand-red)]">ERP</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Devotee / Bhakt Portal</p>
        </div>

        {/* Step 1: Mobile */}
        {step === 'mobile' && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Mobile Number</label>
              <div onKeyDown={e => e.key === 'Enter' && sendOtp()}>
                <PhoneInput value={mobile} onChange={v => { setMobile(v); setError('') }} autoFocus />
              </div>
              <p className="text-xs text-slate-400 mt-1">Pick your country code for international numbers</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || !isValidPhone(mobile)}
              className="btn-primary w-full justify-center py-3"
            >
              <Phone size={16} />
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <p className="text-center text-xs text-slate-400">
              New user? You'll complete your profile after OTP.
            </p>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep('mobile'); setOtp(''); setError('') }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-semibold">{mobile}</span>
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
              type="button"
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
                  type="button"
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
      </div>
    </div>
  )
}
