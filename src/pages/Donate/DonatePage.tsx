import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Camera, Check, Clock, Copy, Heart, Landmark, QrCode, Search, ShieldCheck, X } from 'lucide-react'
import QRCode from 'qrcode'
import { api, apiError, parsePaise } from '../../lib/api'
import type { Temple, TemplePaymentDetails } from '../../types'

/**
 * Give to a temple — by transferring to that temple's own verified account.
 *
 * THERE IS NO GATEWAY RAIL HERE, DELIBERATELY. This page used to lead with
 * "Pay online — Card / UPI via Razorpay", which put a third party between the
 * devotee and the trust and, worse, was not real: `POST /me/donate` returns a
 * MOCK order (see donate.service.ts), so the button's own success path could
 * not settle a rupee. Money now moves devotee → temple directly, and the
 * devotee tells the temple what they sent so it can approve and issue the
 * receipt (`POST /me/donation-requests`).
 *
 * The details shown are only ever the ones the platform VERIFIED — see
 * `bank_verified` and superadmin's Donation Accounts queue. A trust whose
 * account is unchecked, or that edited it after approval, shows nothing at all:
 * being handed digits nobody has read is the failure this whole rail exists to
 * prevent, and an unverified account is not better than no account.
 */

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

const MANUAL_MODES = [
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'imps', label: 'IMPS' },
  { value: 'cheque', label: 'Cheque' },
]

/** Compress a picked screenshot to a small JPEG data URL (~≤300 KB). */
async function compressImage(file: File, maxDim = 1200, quality = 0.6): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl })
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function DonatePage() {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [temples, setTemples] = useState<Temple[]>([])
  const [searching, setSearching] = useState(false)
  /** Which list is on screen when the devotee has not typed anything. */
  const [suggestion, setSuggestion] = useState<'mine' | 'directory' | null>(null)
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null)
  const [payDetails, setPayDetails] = useState<TemplePaymentDetails | null>(null)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [is80g, setIs80g] = useState(false)
  const [pan, setPan] = useState('')
  // Masked PAN already on the devotee's profile — 80G needs no retyping then.
  const [panOnFile, setPanOnFile] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  // Transfer-details fields
  const [manualMode, setManualMode] = useState('upi')
  const [utr, setUtr] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [proof, setProof] = useState<string | null>(null)
  const [proofBusy, setProofBusy] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Donor details for the receipt (prefilled from profile; required for 80G)
  const [donorName, setDonorName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')

  /**
   * Lead with the temples this devotee already gives to.
   *
   * The page used to load nothing until two characters were typed, so opening
   * Donate — the primary giving action in the app — showed a heading, an empty
   * search box and blank space, with no hint that typing was required
   * (DEF-DONATE-01). Most giving goes to a temple the devotee already has a
   * relationship with, so those come first; a devotee with none falls back to
   * the directory rather than to nothing.
   */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setSearching(true)
      try {
        const mine = await api.get('/me/temples')
        const rows: Temple[] = mine.data.data ?? []
        if (!cancelled && rows.length) { setTemples(rows); setSuggestion('mine'); return }
        const dir = await api.get('/temples/directory', { params: { limit: 10 } })
        if (!cancelled) { setTemples(dir.data.data ?? []); setSuggestion('directory') }
      } catch {
        // A failed suggestion must not block the search box below it.
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 2) searchTemples() }, 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    api.get('/me').then(r => {
      const me = r.data.data
      setPanOnFile(me?.pan_masked ?? null)
      setDonorName(me?.name ?? '')
      setAddress(me?.address ?? '')
      setCity(me?.city ?? '')
      setStateName(me?.state ?? '')
      setPincode(me?.pincode ?? '')
    }).catch(() => {})
  }, [])

  // Live UPI QR, drawn here from the temple's UPI ID and the typed amount. The
  // API deliberately no longer serves a hosted QR image: it was a second copy
  // of the same payment address and went stale on its own.
  useEffect(() => {
    if (!payDetails?.upi_id) { setQrDataUrl(null); return }
    const paise = parsePaise(amount || '0')
    const uri = `upi://pay?pa=${encodeURIComponent(payDetails.upi_id)}&pn=${encodeURIComponent(payDetails.name)}` +
      (paise >= 100 ? `&am=${(paise / 100).toFixed(2)}` : '') +
      `&cu=INR&tn=${encodeURIComponent('Donation')}`
    QRCode.toDataURL(uri, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [payDetails, amount])

  async function searchTemples() {
    setSuggestion(null)
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

  async function selectTemple(temple: Temple) {
    setSelectedTemple(temple)
    setStep('form')
    setPayDetails(null)
    try {
      const { data } = await api.get(`/temples/${temple.slug}/payment-details`)
      setPayDetails(data.data)
    } catch {
      setPayDetails(null)
    }
  }

  function copyText(label: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  async function pickProof(file: File | undefined | null) {
    if (!file) return
    setProofBusy(true); setError('')
    try {
      const compressed = await compressImage(file)
      if (compressed.length > 600_000) {
        setError('Screenshot too large even after compression — try a smaller image.')
        return
      }
      setProof(compressed)
    } catch {
      setError('Could not read that image. Try another screenshot.')
    } finally {
      setProofBusy(false)
    }
  }

  /**
   * Can this devotee actually give to this temple right now?
   *
   * `bank_account_no` is only ever populated for a VERIFIED account — the API
   * reads it from the nominated account and drops it the moment the recorded
   * fingerprint stops matching. Requiring it (rather than "UPI id or account
   * number", which is what this used to accept) is the point: a UPI handle
   * typed into the profile of a trust nobody has checked is exactly the
   * unreviewed payment address the verification queue was built to stop.
   */
  const canGive = !!payDetails?.accept_donor_requests && !!payDetails?.bank_account_no
  const can80g = payDetails?.is_80g_registered === true
  const needsPanEntry = is80g && !panOnFile

  function validateManual(paise: number): string {
    if (!utr.trim() && !proof) return 'Add the UTR / reference number or a payment screenshot so the temple can verify.'
    if (!donorName.trim()) return 'Your name is required for the receipt.'
    if (is80g) {
      if (needsPanEntry && !PAN_REGEX.test(pan)) return 'A valid PAN (format ABCDE1234F) is required for an 80G donation'
      if (!address.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
        return 'Full postal address (address, city, state, pincode) is required on an 80G receipt.'
      }
    }
    if (paise < 100) return 'Minimum donation is ₹1'
    return ''
  }

  async function submitManual() {
    const paise = parsePaise(amount)
    const problem = validateManual(paise)
    if (problem) { setError(problem); return }
    setSubmitting(true); setError('')
    try {
      const { data } = await api.post('/me/donation-requests', {
        tenant_id: selectedTemple!.id,
        amount_paise: paise,
        category,
        payment_mode: manualMode,
        utr_number: utr.trim() || undefined,
        paid_at: paidAt || undefined,
        is_80g: is80g && can80g,
        remarks: remarks || undefined,
        donor_name: donorName.trim(),
        pan: needsPanEntry ? pan : undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: stateName.trim() || undefined,
        pincode: pincode.trim() || undefined,
        proof_image_base64: proof ?? undefined,
      })
      if (needsPanEntry) setPanOnFile(`${pan.slice(0, 2)}XXXXX${pan.slice(-3)}`)
      setResult({ ...data.data, manual: true })
      setStep('result')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setStep('search'); setSelectedTemple(null); setPayDetails(null); setResult(null)
    setAmount(''); setError(''); setUtr(''); setProof(null); setIs80g(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">
          {step === 'search' ? 'Donate to Temple' : step === 'form' ? selectedTemple?.name : 'Request Submitted'}
        </h1>
        {step !== 'search' && (
          <button
            onClick={resetAll}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >{t('ui.change')}</button>
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
                placeholder={t('ui.searchTemplePh')}
                className="form-input pl-9"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            {searching && (
              <div className="text-center py-4 text-slate-400 text-sm">{t('ui.searching')}</div>
            )}
            {!searching && suggestion && temples.length > 0 && (
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {suggestion === 'mine' ? 'Your temples' : 'Temples on JainERP'}
              </p>
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
              <p className="text-center text-slate-400 text-sm py-4">{t('ui.noTemplesFound')}</p>
            )}
            {!searching && query.length < 2 && temples.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">{t('ui.searchToGive')}</p>
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

            {/* No verified account → nothing to pay into, so offer no form at
                all rather than an amount box that leads nowhere. `payDetails`
                is null only while the request is in flight. */}
            {payDetails && !canGive && (
              <div className="card p-4 space-y-1" data-testid="no-verified-account">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-slate-400" />
                  {t('ui.donateUnavailableTitle')}
                </p>
                <p className="text-xs text-slate-500">{t('ui.donateUnavailableBody')}</p>
              </div>
            )}

            {canGive && <>
            <div className="card p-3 flex items-start gap-2" data-testid="pay-method-note">
              <Landmark size={15} className="text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800">{t('ui.upiBankTransfer')}</p>
                <p className="text-[11px] text-slate-500">{t('ui.payDirectVerified')}</p>
              </div>
            </div>

            <div>
              <label className="form-label">{t('ui.amountReq')}</label>
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
              <label className="form-label">{t('ui.category')}</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* The temple's own verified payment details */}
            {payDetails && (
              <div className="card p-4 space-y-3" data-testid="bank-details-card">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <QrCode size={13} />{t('ui.payTempleDirect')}</p>
                {qrDataUrl && (
                  <div className="flex justify-center">
                    <img
                      src={qrDataUrl}
                      alt="UPI QR"
                      className="w-44 h-44 rounded-lg border border-slate-200 object-contain bg-white"
                    />
                  </div>
                )}
                {payDetails.upi_id && (
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">UPI ID</p>
                      <p className="text-sm font-mono font-semibold text-slate-800">{payDetails.upi_id}</p>
                    </div>
                    <button onClick={() => copyText('upi', payDetails.upi_id!)} className="p-1.5 text-slate-400 hover:text-slate-700">
                      {copied === 'upi' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
                {payDetails.bank_account_no && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 uppercase">{t('ui.bankTransfer')}</p>
                      <button
                        onClick={() => copyText('bank', `${payDetails.bank_account_name ?? payDetails.name}\nA/C: ${payDetails.bank_account_no}\nIFSC: ${payDetails.bank_ifsc ?? ''}\n${payDetails.bank_name ?? ''}`)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        {copied === 'bank' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="font-medium text-slate-800">{payDetails.bank_account_name || payDetails.name}</p>
                    <p className="font-mono text-slate-700">A/C: {payDetails.bank_account_no}</p>
                    <p className="text-slate-600 text-xs">IFSC: {payDetails.bank_ifsc || '—'}{payDetails.bank_name ? ` · ${payDetails.bank_name}` : ''}</p>
                  </div>
                )}
                <p className="text-[11px] text-slate-400">{t('ui.afterPaying')}</p>
              </div>
            )}

            <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">{t('ui.paidVia')}</label>
                    <select className="form-select" value={manualMode} onChange={e => setManualMode(e.target.value)}>
                      {MANUAL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{t('ui.datePaid')}</label>
                    <input type="date" className="form-input" value={paidAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setPaidAt(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">{t('ui.utrRef')}</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. 415223344556"
                    maxLength={50}
                    value={utr}
                    onChange={e => setUtr(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">{t('ui.utrHelp')}</p>
                </div>

                {/* Proof screenshot */}
                <div>
                  <label className="form-label">{t('ui.paymentScreenshot')}</label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickProof(e.target.files?.[0])} />
                  {proof ? (
                    <div className="relative inline-block">
                      <img src={proof} alt={t('ui.paymentProof')} className="h-36 rounded-lg border border-slate-200 object-contain bg-white" />
                      <button
                        onClick={() => { setProof(null); if (fileRef.current) fileRef.current.value = '' }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={proofBusy}
                      className="w-full border-2 border-dashed border-slate-300 rounded-xl p-5 text-center text-slate-400 hover:border-brand-red hover:text-brand-red transition-colors"
                    >
                      <Camera size={20} className="mx-auto mb-1" />
                      <span className="text-xs font-medium">{proofBusy ? 'Processing…' : 'Upload payment screenshot'}</span>
                    </button>
                  )}
                </div>
              </>

            {/* 80G — only when the temple can actually issue it */}
            {can80g ? (
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
            ) : payDetails && (
              <p className="text-xs text-slate-400 card p-3">{t('ui.no80g')}</p>
            )}

            {is80g && needsPanEntry && (
              <div>
                <label className="form-label">{t('ui.panNumber')}</label>
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

            {/* Donor details for the receipt */}
            <div className="card p-4 space-y-3" data-testid="donor-details">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Receipt details {is80g && <span className="text-brand-red normal-case font-medium">— required for the 80G receipt</span>}
                </p>
                <div>
                  <label className="form-label">Full name {is80g && '*'}</label>
                  <input type="text" className="form-input" value={donorName} onChange={e => setDonorName(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Address {is80g && '*'}</label>
                  <input type="text" className="form-input" placeholder={t('ui.houseStreet2')} value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">City {is80g && '*'}</label>
                    <input type="text" className="form-input" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">State {is80g && '*'}</label>
                    <input type="text" className="form-input" value={stateName} onChange={e => setStateName(e.target.value)} />
                  </div>
                </div>
                <div className="w-1/2">
                  <label className="form-label">Pincode {is80g && '*'}</label>
                  <input type="text" className="form-input font-mono" maxLength={6} value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>

            <div>
              <label className="form-label">{t('ui.remarksOpt')}</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder={t('ui.inMemoryPh')}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={submitManual}
              disabled={submitting || !amount}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              <Heart size={16} />
              {submitting ? 'Processing...' : `Submit for verification — ₹${amount || 0}`}
            </button>
            </>}
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-amber-100">
              <Clock size={32} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Sent for verification!</h2>
            <p className="text-sm text-slate-500 px-4">
              {`${selectedTemple?.name} will verify your payment and issue the receipt. You'll get a notification here once it's approved.`}
            </p>
            <div className="card p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('ui.temple')}</span>
                <span className="font-medium">{selectedTemple?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Request ID</span>
                <span className="font-mono text-slate-700 text-xs">{result.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('ui.status')}</span>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>{t('ui.pendingApproval')}</span>
              </div>
            </div>
            <button onClick={resetAll} className="btn-primary mx-auto">{t('ui.donateAgain')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
