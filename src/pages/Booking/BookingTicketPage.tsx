import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, XCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { api, apiError, fmtPaise } from '../../lib/api'

interface Ticket {
  id: string
  check_in_date: string
  check_out_date: string
  /**
   * When the guest may arrive and must vacate, and when they actually did.
   * The ticket showed DATES only — so "19 Sep to 21 Sep" and nothing about the
   * hour, which is the one thing a guest arriving off a night train needs.
   */
  planned_check_in_at: string | null
  planned_check_out_at: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  nights: number
  persons_count: number
  tariff_per_night_paise: number
  subtotal_paise: number
  cgst_paise: number
  sgst_paise: number
  total_paise: number
  status: string
  invoice_no: string | null
  ticket_code: string | null
  room_number: string
  room_name: string | null
  guest_name: string | null
  guest_mobile: string | null
  temple: { name: string; address: string; mobile: string | null; gstin: string | null }
  qr_payload: string | null
}

const day = (v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * A date with the time of day, pinned to IST.
 *
 * The zone is fixed rather than left to the device: a devotee opening their
 * ticket while travelling must read the time the MANDIR means, not the time
 * where their phone happens to be.
 */
const dayTime = (v: string | null | undefined) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })
}

/**
 * The devotee's booking ticket.
 *
 * The QR encodes the **ticket code**, not a URL: the front desk scans it at a
 * counter that may have no internet, and a code they can also read aloud is
 * worth more than a link. Rendering and printing stay client-side, like every
 * other receipt in the product.
 */
export function BookingTicketPage() {
  const { t } = useTranslation()
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { load() }, [slug, id])

  async function load() {
    if (!slug || !id) return
    try {
      const { data } = await api.get(`/temples/${slug}/rooms/bookings/${id}/ticket`)
      setTicket(data.data)
    } catch (e) {
      setError(apiError(e))
    }
  }

  useEffect(() => {
    if (ticket?.qr_payload && qrRef.current) {
      QRCode.toCanvas(qrRef.current, ticket.qr_payload, { width: 160, margin: 1 }).catch(() => {})
    }
  }, [ticket])

  async function cancel() {
    if (!slug || !id) return
    setCancelling(true)
    try {
      const { data } = await api.post(`/temples/${slug}/rooms/bookings/${id}/cancel`, {})
      setError('')
      alert(data.data?.refund_note ?? 'Booking cancelled.')
      load()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setCancelling(false)
    }
  }

  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>
  if (!ticket) return <div className="p-4 text-sm text-slate-500">{t('ui.loading')}</div>

  const cancelled = ticket.status === 'cancelled'

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3 shadow-sm print:hidden">
        <button onClick={() => navigate(-1)} aria-label={t('ui.goBack')} className="p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-800">{t('ui.yourBooking')}</h1>
      </header>

      <div className="space-y-4 p-4">
        <div className={`card overflow-hidden ${cancelled ? 'opacity-60' : ''}`}>
          <div className="border-b border-dashed border-slate-200 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-400">{ticket.temple.name}</p>
            <p className="mt-2 text-2xl font-bold tracking-widest text-slate-800">
              {ticket.ticket_code ?? '—'}
            </p>
            <p className="text-xs text-slate-500">{t('ui.showAtDesk')}</p>
            {cancelled && <p className="mt-2 text-sm font-semibold text-red-600">{t('ui.cancelled')}</p>}
            <canvas ref={qrRef} className="mx-auto mt-3" />
          </div>

          <dl className="space-y-2 p-4 text-sm">
            <Row label="Room" value={`${ticket.room_number}${ticket.room_name ? ` · ${ticket.room_name}` : ''}`} />
            {/* The actual arrival once they have checked in, the planned time
                before that — a confirmation and a record answer different
                questions. Falls back to the bare date for a stay booked before
                times were recorded. */}
            <Row
              label="Check in"
              value={dayTime(ticket.checked_in_at ?? ticket.planned_check_in_at) ?? day(ticket.check_in_date)}
            />
            <Row
              label="Check out"
              value={dayTime(ticket.checked_out_at ?? ticket.planned_check_out_at) ?? day(ticket.check_out_date)}
            />
            <Row label="Nights" value={String(ticket.nights)} />
            <Row label="Guests" value={String(ticket.persons_count)} />
            <Row label="Guest" value={ticket.guest_name ?? '—'} />
            {ticket.invoice_no && <Row label="Receipt no." value={ticket.invoice_no} />}
          </dl>

          <div className="space-y-1 border-t border-slate-100 p-4 text-sm">
            <Row label="Room charges" value={`₹${fmtPaise(ticket.subtotal_paise)}`} />
            {ticket.cgst_paise > 0 && <Row label="CGST" value={`₹${fmtPaise(ticket.cgst_paise)}`} />}
            {ticket.sgst_paise > 0 && <Row label="SGST" value={`₹${fmtPaise(ticket.sgst_paise)}`} />}
            <div className="flex justify-between pt-1 font-bold text-slate-800">
              <span>{t('ui.totalPaid')}</span><span>₹{fmtPaise(ticket.total_paise)}</span>
            </div>
          </div>

          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
            {ticket.temple.address}
            {ticket.temple.mobile && ` · ${ticket.temple.mobile}`}
          </p>
        </div>

        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-secondary flex-1">
            <Download size={14} />{t('ui.saveOrPrint')}</button>
          {!cancelled && ticket.status !== 'checked_out' && (
            <button onClick={cancel} disabled={cancelling} className="btn-secondary flex-1 text-red-600">
              <XCircle size={14} /> {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  )
}
