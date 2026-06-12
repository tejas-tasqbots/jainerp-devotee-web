import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Download, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import { api, apiError, currentFY, fmtPaise } from '../../lib/api'
import type { Transaction, TransactionSummary } from '../../types'

const TYPE_LABELS: Record<string, string> = {
  donation: 'Donation', seva: 'Seva', room: 'Room', boli: 'Boli'
}

export function DonationsList() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [fy, setFy] = useState(currentFY())
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => { load() }, [fy, type, page])

  async function load() {
    setLoading(true); setError('')
    try {
      const [txnRes, sumRes] = await Promise.all([
        api.get('/me/transactions', { params: { fy, type: type || undefined, page, limit: 20, include_unsynced: true } }),
        api.get('/me/transactions/summary', { params: { fy } }),
      ])
      setTransactions(txnRes.data.data ?? [])
      setTotal(txnRes.data.meta?.total ?? 0)
      setSummary(sumRes.data.data)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  const fyOptions = ['2026-27', '2025-26', '2024-25']

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Donations</h1>
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Summary card */}
      {summary && (
        <div className="mx-4 mt-4 card p-4" style={{ background: 'linear-gradient(135deg, #0D1B2E 0%, #1b2f4a 100%)' }}>
          <p className="text-xs text-slate-400 mb-1">Total Donated — FY {summary.fy}</p>
          <p className="text-2xl font-bold text-white">₹{fmtPaise(summary.total_paise)}</p>
          <div className="flex gap-4 mt-2">
            <div>
              <p className="text-xs text-slate-400">80G Eligible</p>
              <p className="text-sm font-semibold text-brand-gold">₹{fmtPaise(summary.eligible_80g_paise)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Transactions</p>
              <p className="text-sm font-semibold text-white">{summary.txn_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2">
        <select className="form-select flex-1" value={fy} onChange={e => { setFy(e.target.value); setPage(1) }}>
          {fyOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="form-select flex-1" value={type} onChange={e => { setType(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          <option value="donation">Donation</option>
          <option value="seva">Seva</option>
          <option value="room">Room</option>
          <option value="boli">Boli</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 space-y-3 pb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-20" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="card p-6 text-center text-red-600 text-sm">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="card p-8 text-center">
            <IndianRupee size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No transactions found</p>
          </div>
        ) : (
          <>
            {transactions.map(txn => (
              <div key={txn.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-slate-400 truncate">{txn.tenant.name}</span>
                      <span className="badge badge-slate">{TYPE_LABELS[txn.txn_type] || txn.txn_type}</span>
                      {txn.is_80g_eligible && <span className="badge badge-green">80G</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-700 capitalize">{txn.category_or_service}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(txn.txn_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-green-700">₹{fmtPaise(txn.amount_paise)}</p>
                    {txn.receipt_url && (
                      <a
                        href={txn.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline"
                      >
                        <Download size={11} /> Receipt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">Page {page} of {Math.ceil(total / 20)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
