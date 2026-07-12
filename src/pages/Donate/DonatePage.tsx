import { useState, useEffect } from 'react'
import { Building2, Check, Heart, Search } from 'lucide-react'
import { api, apiError, parsePaise } from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { useAuthStore } from '../../store/authStore'
import type { Temple } from '../../types'

type Step = 'search' | 'form' | 'result'

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'annadaan', label: 'Annadaan' },
  { value: 'nirman', label: 'Nirman' },
  { value: 'gaushala', label: 'Gaushala' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

export function DonatePage() {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [temples, setTemples] = useState<Temple[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [is80g, setIs80g] = useState(false)
  const [pan, setPan] = useState('')
  // Masked PAN already on the devotee's profile — 80G needs no retyping then.
  const [panOnFile, setPanOnFile] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<any>(null)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 2) searchTemples() }, 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    api.get('/me').then(r => setPanOnFile(r.data.data?.pan_masked ?? null)).catch(() => {})
  }, [])

  async function searchTemples() {
    setSearching(true)
    try {
      const { data } = await api.get('/temples/directory', { params: { q: query, limit: 10 } })
      setTemples(data.data ?? [])
    } catch {
      setTemples([])
    } finally {
      setSearching(false)
    }
  }

  function selectTemple(temple: Temple) {
    setSelectedTemple(temple)
    setStep('form')
  }

  async function submit() {
    const paise = parsePaise(amount)
    if (paise < 100) { setError('Minimum donation is ₹1'); return }
    const needsPanEntry = is80g && !panOnFile
    if (needsPanEntry && !PAN_REGEX.test(pan)) {
      setError('A valid PAN (format ABCDE1234F) is required for an 80G donation')
      return
    }
    setSubmitting(true); setError(''); setNotice('')
    try {
      // 1. Create the order on the backend. A newly typed PAN is saved onto
      //    the profile there, so future 80G donations use the PAN on file.
      const { data } = await api.post('/me/donate', {
        tenant_id: selectedTemple!.id,
        category,
        amount_paise: paise,
        is_80g: is80g,
        pan: needsPanEntry ? pan : undefined,
        remarks,
      })
      if (needsPanEntry) setPanOnFile(`${pan.slice(0, 2)}XXXXX${pan.slice(-3)}`)
      const order = data.data
      if (order.mock) {
        setError('Payment gateway is not configured on the server yet. Please try again later.')
        setSubmitting(false)
        return
      }

      // 2. Open the Razorpay Standard Checkout modal.
      await openRazorpayCheckout({
        order,
        name: selectedTemple!.name,
        description: `Donation — ${category}`,
        prefill: {
          name: user?.name ?? undefined,
          email: user?.email,
          contact: user?.mobile,
        },
        onSuccess: async (callback) => {
          try {
            // 3. Verify the signature server-side; the donation is recorded there.
            const { data: v } = await api.post('/me/donate/verify', callback)
            setResult({ ...order, ...v, paid: true })
            setStep('result')
          } catch (e) {
            setError(apiError(e))
          } finally {
            setSubmitting(false)
          }
        },
        onFailure: (msg) => { setError(msg); setSubmitting(false) },
        onDismiss: () => { setNotice('Payment cancelled. You can try again.'); setSubmitting(false) },
      })
    } catch (e) {
      setError(apiError(e))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">
          {step === 'search' ? 'Donate to Temple' : step === 'form' ? selectedTemple?.name : 'Donation Created'}
        </h1>
        {step !== 'search' && (
          <button
            onClick={() => { setStep('search'); setSelectedTemple(null); setResult(null); setError('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Change
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Step 1: Search temple */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search temple by name or city..."
                className="form-input pl-9"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            {searching && (
              <div className="text-center py-4 text-slate-400 text-sm">Searching...</div>
            )}
            {!searching && temples.length > 0 && (
              <div className="space-y-2">
                {temples.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemple(t)}
                    className="w-full card p-4 text-left hover:border-brand-red transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-brand-red" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.city}, {t.state}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!searching && query.length >= 2 && temples.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No temples found</p>
            )}
          </div>
        )}

        {/* Step 2: Donation form */}
        {step === 'form' && selectedTemple && (
          <div className="space-y-4">
            <div className="card p-3 bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-brand-red" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedTemple.name}</p>
                  <p className="text-xs text-slate-500">{selectedTemple.city}, {selectedTemple.state}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1}
              />
              <div className="flex gap-2 mt-2">
                {[51, 101, 251, 501, 1001].map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      amount === String(a)
                        ? 'bg-brand-red text-white border-brand-red'
                        : 'border-slate-200 text-slate-600 hover:border-brand-red'
                    }`}
                  >
                    ₹{a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 card p-3">
              <input
                type="checkbox"
                id="is80g"
                checked={is80g}
                onChange={e => setIs80g(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-red"
              />
              <label htmlFor="is80g" className="text-sm text-slate-700 cursor-pointer">
                Claim 80G tax exemption
                {is80g && panOnFile && (
                  <span className="block text-xs text-green-600 mt-0.5">
                    Uses the PAN on your profile (<span className="font-mono">{panOnFile}</span>)
                  </span>
                )}
              </label>
            </div>

            {is80g && !panOnFile && (
              <div>
                <label className="form-label">PAN Number *</label>
                <input
                  type="text"
                  className="form-input uppercase font-mono"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={pan}
                  onChange={e => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {PAN_REGEX.test(pan)
                    ? 'Your PAN will be saved to your profile for future 80G donations.'
                    : 'Needed for 80G — 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).'}
                </p>
              </div>
            )}

            <div>
              <label className="form-label">Remarks (optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="In memory of... / For the occasion of..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {notice && <p className="text-amber-600 text-sm">{notice}</p>}

            <button
              onClick={submit}
              disabled={submitting || !amount}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              <Heart size={16} />
              {submitting ? 'Processing...' : `Donate ₹${amount || 0}`}
            </button>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Payment Successful!</h2>
            <p className="text-sm text-slate-500">Thank you for your donation. Your receipt will be available shortly.</p>
            <div className="card p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Temple</span>
                <span className="font-medium">{selectedTemple?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-slate-700 text-xs">{result.razorpay_order_id}</span>
              </div>
            </div>
            <button
              onClick={() => { setStep('search'); setSelectedTemple(null); setResult(null); setAmount(''); setNotice('') }}
              className="btn-primary mx-auto"
            >
              Donate Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
