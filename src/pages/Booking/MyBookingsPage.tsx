import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Calendar, ChevronRight, Search, Users } from 'lucide-react'
import { api, apiError, fmtPaise } from '../../lib/api'
import { EmptyState } from '../../components/kit'

/**
 * Every room this devotee has booked, across every temple.
 *
 * This page did not exist. `/bookings/:slug/:id` rendered a single ticket, so
 * once the confirmation screen was dismissed there was no route back to it —
 * a devotee on a phone at a dharamshala gate had no way to show their booking.
 * The mobile app has had this list; the web app was answering fewer questions
 * than the app it is meant to back up.
 *
 * Filtering is server-side (`q`, `status`, `when`, `sort`), so what is on
 * screen is the whole answer rather than a slice of one.
 */
interface Booking {
  id: string
  temple?: { id?: string; slug?: string; name?: string }
  check_in_date: string
  check_out_date: string
  nights: number
  persons_count: number
  total_paise: number
  refund_paise?: number
  status: string
  invoice_no?: string | null
  ticket_code?: string | null
  room_number?: string
  room_name?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  booked: 'badge-blue',
  checked_in: 'badge-green',
  checked_out: 'badge-gray',
  cancelled: 'badge-red',
}

/** The IST calendar day — a stay ending today has not ended at 05:30 local. */
function istToday(): string {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
}

function dayOf(value: string): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 10)
}

function fmtDay(value: string): string {
  const d = dayOf(value)
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[Number(m) - 1] ?? ''} ${y}`
}

export function MyBookingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [when, setWhen] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => { load() }, [search, when, status])

  // Debounced, so typing a temple name is one request rather than one per key.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 350)
    return () => clearTimeout(timer)
  }, [q])

  async function load() {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/me/bookings', {
        params: {
          q: search || undefined,
          when: when || undefined,
          status: status || undefined,
        },
      })
      setBookings(data.data ?? [])
    } catch (e) {
      setError(apiError(e))
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const filtering = !!search || !!when || !!status
  const today = istToday()
  // Upcoming first — that is what somebody opens this page to find. The server
  // has already applied `when`, so this only groups what came back.
  const upcoming = bookings.filter(
    b => b.status !== 'cancelled' && b.status !== 'checked_out' && dayOf(b.check_in_date) >= today,
  )
  const earlier = bookings.filter(b => !upcoming.includes(b))

  function card(b: Booking) {
    return (
      <button
        key={b.id}
        onClick={() => navigate(`/bookings/${b.temple?.slug}/${b.id}`)}
        className="card p-4 w-full text-left hover:border-brand-red transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <BedDouble size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-800 truncate">{b.temple?.name ?? '—'}</p>
              <span className={STATUS_STYLES[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {[b.room_name, b.room_number && `#${b.room_number}`].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                {fmtDay(b.check_in_date)} → {fmtDay(b.check_out_date)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} />{b.persons_count}
              </span>
              <span className="font-semibold text-slate-700">₹{fmtPaise(b.total_paise)}</span>
            </div>
            {b.ticket_code && (
              <p className="text-[11px] text-slate-400 mt-1">{b.ticket_code}</p>
            )}
          </div>
          <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('titles.myBookings', { defaultValue: 'My Bookings' })}</h1>
      </div>

      <div className="px-4 pt-4 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="form-input w-full pl-9"
            placeholder={t('ui.searchStays', { defaultValue: 'Search temple, room or ticket' })}
            aria-label={t('ui.searchStays', { defaultValue: 'Search temple, room or ticket' })}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="form-select flex-1"
            aria-label={t('ui.stay', { defaultValue: 'Stay' })}
            title={t('ui.stay', { defaultValue: 'Stay' })}
            value={when}
            onChange={e => setWhen(e.target.value)}
          >
            <option value="">{t('ui.allStays', { defaultValue: 'All stays' })}</option>
            <option value="upcoming">{t('ui.upcoming', { defaultValue: 'Upcoming' })}</option>
            <option value="past">{t('ui.past', { defaultValue: 'Past' })}</option>
          </select>
          <select
            className="form-select flex-1"
            aria-label={t('ui.status', { defaultValue: 'Status' })}
            title={t('ui.status', { defaultValue: 'Status' })}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">{t('ui.allStatuses', { defaultValue: 'Any status' })}</option>
            <option value="booked">{t('ui.statusBooked', { defaultValue: 'Booked' })}</option>
            <option value="checked_in">{t('ui.statusCheckedIn', { defaultValue: 'Checked in' })}</option>
            <option value="checked_out">{t('ui.statusCheckedOut', { defaultValue: 'Checked out' })}</option>
            <option value="cancelled">{t('ui.statusCancelled', { defaultValue: 'Cancelled' })}</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-8">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : bookings.length === 0 ? (
          // A filtered empty list is a different situation from never having
          // booked, and the wrong one reads as data loss.
          filtering ? (
            <EmptyState
              icon={Search}
              title={t('ui.noResults', { defaultValue: 'Nothing matches' })}
              hint={t('ui.noResultsHint', { defaultValue: 'Try a different search, or clear it.' })}
              action={
                <button
                  onClick={() => { setQ(''); setSearch(''); setWhen(''); setStatus('') }}
                  className="btn-secondary px-6 py-2"
                >
                  {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={BedDouble}
              title={t('ui.noBookingsYet', { defaultValue: 'No room bookings yet' })}
              hint={t('ui.noBookingsHint', {
                defaultValue: 'Rooms you book at any temple appear here, with the ticket to show at the gate.',
              })}
              action={
                <button onClick={() => navigate('/stays')} className="btn-primary px-6 py-2">
                  {t('ui.findAStay', { defaultValue: 'Find a dharamshala' })}
                </button>
              }
            />
          )
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  {t('ui.upcoming', { defaultValue: 'Upcoming' })}
                </p>
                {upcoming.map(card)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase pt-2">
                  {t('ui.earlier', { defaultValue: 'Earlier' })}
                </p>
                {earlier.map(card)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
