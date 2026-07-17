import { useEffect, useState } from 'react'
import { Bell, Calendar, CheckCircle, IndianRupee, X } from 'lucide-react'
import { format } from 'date-fns'
import { api, apiError, fmtPaise, parsePaise } from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { useAuthStore } from '../../store/authStore'
import type { Boli } from '../../types'

export function BolisList() {
  const user = useAuthStore(s => s.user)
  const [bolis, setBolis] = useState<Boli[]>([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState<Boli | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState<string | null>(null)
  const [payError, setPayError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/me/bolis?status=pledged,partially_paid')
      setBolis(data.data ?? [])
    } catch {
      setBolis([])
    } finally {
      setLoading(false)
    }
  }

  async function payBoli() {
    if (!payModal) return
    const paise = parsePaise(payAmount)
    if (paise < 100) { setPayError('Minimum payment is ₹1'); return }
    setPaying(true); setPayError('')
    try {
      // 1. Create a Razorpay order for this boli payment.
      const { data } = await api.post(`/me/bolis/${payModal.boli_id}/pay`, { amount_paise: paise })
      const order = data.data
      if (order.mock) {
        setPayError('Payment gateway is not configured on the server yet. Please try again later.')
        setPaying(false)
        return
      }

      // 2. Open the Razorpay Standard Checkout modal.
      await openRazorpayCheckout({
        order,
        name: payModal.temple,
        description: `Boli payment — ${payModal.description}`,
        prefill: { name: user?.name ?? undefined, email: user?.email, contact: user?.mobile },
        onSuccess: async (callback) => {
          try {
            // 3. Verify the signature server-side; the boli is advanced there.
            await api.post(`/me/bolis/${payModal.boli_id}/pay/verify`, callback)
            setPayResult('Payment successful! Your boli has been updated.')
            await load()
          } catch (e) {
            setPayError(apiError(e))
          } finally {
            setPaying(false)
          }
        },
        onFailure: (msg) => { setPayError(msg); setPaying(false) },
        onDismiss: () => { setPayError('Payment cancelled.'); setPaying(false) },
      })
    } catch (e) {
      setPayError(apiError(e))
      setPaying(false)
    }
  }

  const outstanding = bolis.reduce((s, b) => s + b.outstanding_paise, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">My Bolis</h1>
        <Bell size={20} className="text-slate-600" />
      </div>

      {/* Summary */}
      {bolis.length > 0 && (
        <div className="mx-4 mt-4 card p-4 bg-orange-50 border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Total Outstanding</p>
          <p className="text-xl font-bold text-orange-700">₹{fmtPaise(outstanding)}</p>
          <p className="text-xs text-orange-500 mt-0.5">{bolis.length} boli(s) pending</p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : bolis.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No pending bolis</p>
            <p className="text-slate-400 text-xs mt-1">All your pledges are fulfilled!</p>
          </div>
        ) : (
          bolis.map(boli => {
            const paidPct = Math.round((boli.paid_amount_paise / boli.pledged_amount_paise) * 100)
            const isOverdue = new Date(boli.due_date) < new Date()
            return (
              <div key={boli.boli_id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">{boli.temple}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{boli.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={11} className="text-slate-400" />
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                        Due {format(new Date(boli.due_date), 'dd MMM yyyy')}
                        {isOverdue ? ' (Overdue)' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="text-base font-bold text-red-600">₹{fmtPaise(boli.outstanding_paise)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Paid ₹{fmtPaise(boli.paid_amount_paise)}</span>
                    <span>of ₹{fmtPaise(boli.pledged_amount_paise)}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 text-right">{paidPct}% paid</p>
                </div>
                {boli.payment_enabled !== false ? (
                  <button
                    onClick={() => { setPayModal(boli); setPayAmount(String(boli.outstanding_paise / 100)); setPayResult(null); setPayError('') }}
                    className="btn-primary w-full justify-center py-2.5"
                  >
                    <IndianRupee size={15} /> Pay Now
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Online payment isn't set up for this temple yet — please pay at the counter.
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy-900">Pay Boli</h3>
              <button onClick={() => { setPayModal(null); setPayResult(null); setPayError('') }}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600">{payModal.description}</p>
            <p className="text-sm text-slate-500">Temple: {payModal.temple}</p>
            <div>
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                min={1}
                max={payModal.outstanding_paise / 100}
              />
              <p className="text-xs text-slate-400 mt-1">
                Outstanding: ₹{fmtPaise(payModal.outstanding_paise)}
              </p>
            </div>
            {payError && <p className="text-red-600 text-sm">{payError}</p>}
            {payResult ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                {payResult}
              </div>
            ) : (
              <button
                onClick={payBoli}
                disabled={paying || !payAmount || Number(payAmount) < 1}
                className="btn-primary w-full justify-center py-3"
              >
                {paying ? 'Processing...' : `Pay ₹${payAmount || 0}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
