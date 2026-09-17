import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Flame, Phone, RotateCw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { api, apiError } from '../../lib/api'
import { isValidPhone, PhoneInput } from '../../components/PhoneInput'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { MandirHero } from '../../components/MandirHero'

type Step = 'mobile' | 'otp'

export function LoginPage() {
  const { t } = useTranslation()
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
  // "Resend OTP", gated by a countdown so a slow SMS/WhatsApp doesn't turn into
  // five requests — the API also caps sends at 5 an hour per number.
  const [resendIn, setResendIn] = useState(0)
  const [resending, setResending] = useState(false)
  const [resentNote, setResentNote] = useState('')

  const { setTokens, setUser, deviceId } = useAuthStore()

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  /** "whatsapp" → "WhatsApp"; the mock and review channels name nothing a user would recognise. */
  function channelName(channel?: string): string | null {
    if (channel === 'whatsapp') return 'WhatsApp'
    if (channel === 'sms') return 'SMS'
    return null
  }

  async function sendOtp() {
    if (!isValidPhone(mobile)) {
      setError(t('login.invalidMobile'))
      return
    }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/send-otp', { mobile, purpose: 'login' })
      if (data.data?.dev_otp) setMockOtp(data.data.dev_otp)
      setStep('otp')
      setResendIn(30)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    if (resendIn > 0 || resending) return
    setResending(true); setError(''); setResentNote('')
    try {
      // A new send replaces the previous code, so the old one stops working.
      const { data } = await api.post('/auth/send-otp', { mobile, purpose: 'login' })
      if (data.data?.dev_otp) setMockOtp(data.data.dev_otp)
      const via = channelName(data.data?.channel)
      setResentNote(via ? t('login.otpResentVia', { channel: via }) : t('login.otpResent'))
      setOtp('')
      setResendIn(30)
    } catch (e) {
      setError(apiError(e) || t('login.resendFailed'))
    } finally {
      setResending(false)
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { setError(t('login.invalidOtp')); return }
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
    // Mirrors the mandir-admin login exactly (slate page, white card, brand-red
    // icon box, navy/red wordmark) so every portal reads as one product.
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative">
        {/* The switcher sits in its own row rather than floating over the
            header. It used to be absolutely positioned on top of the logo and
            hero, so opening it covered the branding — the menu was always
            clickable, it just landed on top of the artwork. Giving it a row of
            its own makes all three portal logins read the same way. */}
        <div className="flex justify-end -mt-2 mb-1 relative z-50"><LanguageSwitcher /></div>
        {/* Header */}
        <div className="text-center mb-8">
          {/* Devotional banner — bundled SVG so it renders offline (PWA). */}
          <MandirHero className="h-24 -mx-2 mb-5" />
          <div className="w-16 h-16 rounded-2xl bg-brand-red flex items-center justify-center mx-auto mb-4 -mt-12 relative ring-4 ring-white">
            <Flame size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-navy-900">Jain</span>
            <span className="text-brand-red">ERP</span>
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">{t('brand.portal')}</p>
        </div>

        {/* Step 1: Mobile */}
        {step === 'mobile' && (
          <div className="space-y-4">
            <div>
              <label className="form-label">{t('login.mobileLabel')}</label>
              <div onKeyDown={e => e.key === 'Enter' && sendOtp()}>
                <PhoneInput value={mobile} onChange={v => { setMobile(v); setError('') }} autoFocus />
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('login.countryHint')}</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || !isValidPhone(mobile)}
              className="btn-primary w-full justify-center py-3"
            >
              <Phone size={16} />
              {loading ? t('login.sendingOtp') : t('login.sendOtp')}
            </button>
            <p className="text-center text-xs text-slate-400">
              {t('login.newUserHint')}
            </p>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep('mobile'); setOtp(''); setError(''); setResentNote('') }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={15} /> {t('login.back')}
            </button>
            <p className="text-sm text-slate-600">
              {t('login.otpSentTo')} <span className="font-semibold">{mobile}</span>
            </p>
            {resentNote && (
              <div role="status" className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-700">
                {resentNote}
              </div>
            )}
            {mockOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
                Dev mode — OTP: <span className="font-mono font-bold">{mockOtp}</span>
              </div>
            )}
            <div>
              <label className="form-label">{t('login.otpLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('login.otpPlaceholder')}
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
              {loading ? t('login.verifying') : t('login.verifyOtp')}
            </button>
            <div className="text-center text-sm" data-testid="resend-otp">
              <span className="text-slate-400">{t('login.noCode')} </span>
              {resendIn > 0 ? (
                <span className="text-slate-400">{t('login.resendIn', { seconds: resendIn })}</span>
              ) : (
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resending}
                  className="inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline disabled:opacity-50"
                >
                  <RotateCw size={13} className={resending ? 'animate-spin' : ''} />
                  {resending ? t('login.resending') : t('login.resend')}
                </button>
              )}
            </div>
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
