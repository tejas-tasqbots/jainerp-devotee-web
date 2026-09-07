import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Bell, Clock, FileText, IndianRupee, Loader2, Search, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { api, apiError, currentFY, fmtPaise } from '../../lib/api'
import type { DonationRequest, Transaction, TransactionSummary } from '../../types'

const TYPE_LABELS: Record<string, string> = {
  donation: 'Donation', seva: 'Seva', room: 'Room', boli: 'Boli',
}

const REQUEST_BADGES: Record<DonationRequest['status'], { bg: string; fg: string; label: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e', label: 'Pending approval' },
  approved: { bg: '#dcfce7', fg: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
  cancelled: { bg: '#e2e8f0', fg: '#475569', label: 'Cancelled' },
}

/** Open an auth-protected HTML document (receipt / certificate) in a new window. */
async function openHtmlDoc(url: string) {
  const { data: html } = await api.get<string>(url, { responseType: 'text' })
  const win = window.open('', '_blank', 'width=820,height=980')
  if (!win) { alert('Popup blocked. Please allow popups for this site.'); return }
  win.document.write(html)
  win.document.close()
}

export function DonationsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState<'history' | 'requests'>('history')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [requests, setRequests] = useState<DonationRequest[]>([])
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [fy, setFy] = useState(currentFY())
  const [type, setType] = useState('')
  // `q` is what the user is typing; `search` is what has actually been sent.
  // Without the split every keystroke is a request, and the responses come
  // back out of order.
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [only80g, setOnly80g] = useState(false)
  const [sort, setSort] = useState('date_desc')
  const [filteredTotals, setFilteredTotals] = useState<{ total: number; sum: number; eligible: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => { load() }, [fy, type, page, search, only80g, sort])
  useEffect(() => { loadRequests() }, [])

  // 350ms is long enough to avoid a request per keystroke and short enough to
  // still feel live.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(q.trim()); setPage(1) }, 350)
    return () => clearTimeout(timer)
  }, [q])

  async function load() {
    setLoading(true); setError('')
    try {
      const [txnRes, sumRes] = await Promise.all([
        api.get('/me/transactions', {
          params: {
            fy, type: type || undefined, page, limit: 20, include_unsynced: true,
            q: search || undefined,
            only_80g: only80g ? 'true' : undefined,
            sort,
          },
        }),
        // The summary is always the FY's own figure. It answers a different
        // question from the filter totals below, so it is not re-filtered.
        api.get('/me/transactions/summary', { params: { fy: fy === 'all' ? currentFY() : fy } }),
      ])
      setTransactions(txnRes.data.data?.rows ?? txnRes.data.data ?? [])
      const meta = txnRes.data.meta ?? {}
      setTotal(meta.total ?? 0)
      setFilteredTotals({
        total: Number(meta.total ?? 0),
        sum: Number(meta.filtered_total_paise ?? 0),
        eligible: Number(meta.filtered_80g_paise ?? 0),
      })
      setSummary(sumRes.data.data)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  async function loadRequests() {
    try {
      const { data } = await api.get('/me/donation-requests', { params: { limit: 50 } })
      setRequests(data.data?.rows ?? data.data ?? [])
    } catch {
      setRequests([])
    }
  }

  async function cancelRequest(id: string) {
    if (!window.confirm('Cancel this donation request?')) return
    setActionId(id)
    try {
      await api.post(`/me/donation-requests/${id}/cancel`)
      await loadRequests()
    } catch (e) {
      alert(apiError(e))
    } finally {
      setActionId(null)
    }
  }

  async function openReceipt(txn: Transaction) {
    if (txn.txn_type !== 'donation') return
    const key = txn.id
    setReceiptLoading(key)
    try {
      let url: string
      if (txn.source_row_id && txn.tenant?.id) {
        // New endpoint: render HTML directly from tenant schema
        url = `/me/receipts/${txn.tenant.id}/${txn.source_row_id}`
      } else {
        // Legacy: global_transactions id
        url = `/me/receipts/${txn.id}`
      }
      await openHtmlDoc(url)
    } catch (e) {
      alert(apiError(e) || 'Could not load receipt')
    } finally {
      setReceiptLoading(null)
    }
  }

  async function openRequestReceipt(r: DonationRequest) {
    if (!r.donation_id) return
    setReceiptLoading(r.id)
    try {
      await openHtmlDoc(`/me/receipts/${r.tenant_id}/${r.donation_id}`)
    } catch (e) {
      alert(apiError(e) || 'Could not load receipt')
    } finally {
      setReceiptLoading(null)
    }
  }

  async function open80gCertificate(tenantId: string) {
    setReceiptLoading(`80g-${tenantId}`)
    try {
      await openHtmlDoc(`/me/80g-certificate/${tenantId}?fy=${fy}`)
    } catch (e) {
      alert(apiError(e) || 'Could not load 80G certificate')
    } finally {
      setReceiptLoading(null)
    }
  }

  const fyOptions = ['2026-27', '2025-26', '2024-25']
  const filtering = !!search || only80g || !!type || fy === 'all'
  function clearFilters() {
    setQ(''); setSearch(''); setOnly80g(false); setType(''); setFy(currentFY()); setSort('date_desc'); setPage(1)
  }
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const temples80g = (summary?.by_temple ?? []).filter(t => t.eligible_80g_paise > 0)
  /**
   * Does 80G exist for this devotee at all this year?
   *
   * A donation is only ever marked 80G-eligible when the temple holds an 80G
   * registration number (mandir-api's decide80gEligibility refuses otherwise),
   * so a zero here means none of this devotee's temples can issue one. That is
   * the signal every 80G control on this screen is gated on — no separate
   * per-temple lookup is needed, and none would be affordable.
   */
  const has80g = (summary?.eligible_80g_paise ?? 0) > 0 || temples80g.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('titles.myDonations')}</h1>
        <button onClick={() => navigate('/notifications')} aria-label={t('ui.notifications')} title={t('ui.notifications')} className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Summary card */}
      {summary && (
        <div className="mx-4 mt-4 card p-4" style={{ background: 'linear-gradient(135deg, #0D1B2E 0%, #1b2f4a 100%)' }}>
          <p className="text-xs text-slate-400 mb-1">Total Donated — FY {summary.fy}</p>
          <p className="text-2xl font-bold text-white">₹{fmtPaise(summary.total_paise)}</p>
          <div className="flex gap-4 mt-2">
            {/* Shown only when there IS an 80G-eligible total.
                A devotee whose temples hold no 80G approval was shown a
                permanent "80G Eligible ₹0.00" — which reads as a deduction
                they have lost rather than one that was never available, and
                sends them to the temple office to ask about it. Nothing on
                this screen should mention 80G unless 80G exists. */}
            {summary.eligible_80g_paise > 0 && (
              <div>
                <p className="text-xs text-slate-400">80G Eligible</p>
                <p className="text-sm font-semibold text-brand-gold">₹{fmtPaise(summary.eligible_80g_paise)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400">{t('ui.transactions')}</p>
              <p className="text-sm font-semibold text-white">{summary.txn_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* 80G certificate downloads (per qualifying temple) */}
      {temples80g.length > 0 && (
        <div className="mx-4 mt-3 card p-3" data-testid="cert-80g-card">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Award size={13} className="text-brand-gold" /> 80G Certificates — FY {fy}
          </p>
          <div className="space-y-1.5">
            {temples80g.map(t => (
              <div key={t.tenant_id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{t.temple_name}</p>
                  <p className="text-[10px] text-slate-400">₹{fmtPaise(t.eligible_80g_paise)} eligible</p>
                </div>
                <button
                  onClick={() => open80gCertificate(t.tenant_id)}
                  disabled={receiptLoading === `80g-${t.tenant_id}`}
                  className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark disabled:opacity-50 flex-shrink-0"
                >
                  {receiptLoading === `80g-${t.tenant_id}`
                    ? <Loader2 size={11} className="animate-spin" />
                    : <FileText size={11} />}
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="px-4 pt-3 flex gap-1 border-b border-slate-200">
        {([['history', 'History'], ['requests', `Requests${pendingCount ? ` (${pendingCount})` : ''}`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === key ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'history' && (
        <>
          {/* Search + filters */}
          <div className="px-4 pt-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="form-input w-full pl-9"
                placeholder={t('ui.searchDonations', { defaultValue: 'Search temple, category or receipt' })}
                value={q}
                onChange={e => setQ(e.target.value)}
                aria-label={t('ui.searchDonations', { defaultValue: 'Search temple, category or receipt' })}
              />
            </div>
          </div>
          <div className="px-4 py-3 flex gap-2 flex-wrap">
            <select aria-label={t('ui.financialYear')} title={t('ui.financialYear')} className="form-select flex-1" value={fy} onChange={e => { setFy(e.target.value); setPage(1) }}>
              {fyOptions.map(f => <option key={f} value={f}>{f}</option>)}
              <option value="all">{t('ui.allYears', { defaultValue: 'All years' })}</option>
            </select>
            <select aria-label={t('ui.transactionType')} title={t('ui.transactionType')} className="form-select flex-1" value={type} onChange={e => { setType(e.target.value); setPage(1) }}>
              <option value="">{t('ui.allTypes')}</option>
              <option value="donation">{t('ui.donation')}</option>
              <option value="seva">Seva</option>
              <option value="room">Room</option>
              <option value="boli">Boli</option>
            </select>
            <select
              aria-label={t('ui.sortBy', { defaultValue: 'Sort by' })}
              title={t('ui.sortBy', { defaultValue: 'Sort by' })}
              className="form-select flex-1"
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1) }}
            >
              <option value="date_desc">{t('ui.sortNewest', { defaultValue: 'Newest first' })}</option>
              <option value="date_asc">{t('ui.sortOldest', { defaultValue: 'Oldest first' })}</option>
              <option value="amount_desc">{t('ui.sortHighest', { defaultValue: 'Highest amount' })}</option>
              <option value="amount_asc">{t('ui.sortLowest', { defaultValue: 'Lowest amount' })}</option>
            </select>
            {/* Same rule as the tile: a filter that can only ever return an
                empty list is not a filter, it is a dead control. `has80g` is
                the year's total, not the current page's, so ticking it while
                a narrower filter is applied still behaves. */}
            {has80g && (
              <label className="flex items-center gap-1.5 text-sm text-slate-600 px-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={only80g}
                  onChange={e => { setOnly80g(e.target.checked); setPage(1) }}
                />
                {t('ui.only80g', { defaultValue: '80G eligible only' })}
              </label>
            )}
          </div>

          {/* What the CURRENT filter adds up to — the summary card above is
              always the whole year, which is a different question. */}
          {filteredTotals && filteredTotals.total > 0 && (
            <div className="px-4 pb-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {t('ui.showingCount', { defaultValue: '{{count}} shown', count: filteredTotals.total })}
              </span>
              {' · '}{fmtPaise(filteredTotals.sum)}
              {filteredTotals.eligible > 0 && (
                <> · {t('ui.eligible80g', { defaultValue: '{{amount}} eligible for 80G', amount: fmtPaise(filteredTotals.eligible) })}</>
              )}
            </div>
          )}

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
              // A filtered empty list is a different situation from an empty
              // ledger. Telling somebody who has just typed a search that they
              // have never donated reads as data loss.
              filtering ? (
                <div className="card p-8 text-center">
                  <Search size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {t('ui.noResults', { defaultValue: 'Nothing matches' })}
                  </p>
                  <button onClick={clearFilters} className="btn-secondary mt-4 mx-auto justify-center px-6 py-2">
                    {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
                  </button>
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <IndianRupee size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">{t('ui.noTransactions')}</p>
                  <button
                    onClick={() => navigate('/donate')}
                    className="btn-primary mt-4 mx-auto justify-center px-6 py-2"
                  >
                    {t('nav.donate')}
                  </button>
                </div>
              )
            ) : (
              <>
                {transactions.map(txn => (
                  <div key={txn.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs text-slate-400 truncate font-medium">{txn.tenant.name}</span>
                          <span className="badge badge-slate">{TYPE_LABELS[txn.txn_type] || txn.txn_type}</span>
                          {txn.is_80g_eligible && <span className="badge badge-green">80G</span>}
                          {txn.unsynced && (
                            <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px' }}>
                              Pre-sync
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 capitalize">{txn.category_or_service}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(new Date(txn.txn_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-base font-bold text-green-700">₹{fmtPaise(txn.amount_paise)}</p>
                        {txn.txn_type === 'donation' && (
                          <button
                            onClick={() => openReceipt(txn)}
                            disabled={receiptLoading === txn.id}
                            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark disabled:opacity-50"
                          >
                            {receiptLoading === txn.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <FileText size={11} />}
                            Receipt
                          </button>
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
                    >{t('ui.previous')}</button>
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
        </>
      )}

      {view === 'requests' && (
        <div className="px-4 py-3 space-y-3 pb-6" data-testid="requests-list">
          {requests.length === 0 ? (
            <div className="card p-8 text-center">
              <Clock size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{t('ui.noRequestsYet')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('ui.requestsAppear')}</p>
            </div>
          ) : (
            requests.map(r => {
              const badge = REQUEST_BADGES[r.status]
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 truncate font-medium">{r.temple_name}</span>
                        <span className="badge" style={{ background: badge.bg, color: badge.fg, fontSize: '10px' }}>{badge.label}</span>
                        {r.is_80g && <span className="badge badge-green">80G</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-700 capitalize">{r.category || 'General'} · {r.payment_mode.toUpperCase()}</p>
                      {r.utr_number && <p className="text-xs text-slate-400 font-mono mt-0.5">UTR: {r.utr_number}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                      {r.status === 'rejected' && r.review_note && (
                        <p className="text-xs text-red-600 mt-1">Reason: {r.review_note}</p>
                      )}
                      {r.status === 'approved' && r.receipt_no && (
                        <p className="text-xs text-green-700 mt-1 font-mono">Receipt {r.receipt_no}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-base font-bold text-slate-800">₹{fmtPaise(r.amount_paise)}</p>
                      {r.status === 'approved' && r.donation_id && (
                        <button
                          onClick={() => openRequestReceipt(r)}
                          disabled={receiptLoading === r.id}
                          className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark disabled:opacity-50"
                        >
                          {receiptLoading === r.id ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                          Receipt
                        </button>
                      )}
                      {r.status === 'pending' && (
                        <button
                          onClick={() => cancelRequest(r.id)}
                          disabled={actionId === r.id}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                        >
                          <XCircle size={11} />{t('ui.cancel')}</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
