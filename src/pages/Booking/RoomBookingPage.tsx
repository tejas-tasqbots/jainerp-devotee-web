import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Clock, Users } from 'lucide-react'
import { api, apiError, fmtPaise } from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { useAuthStore } from '../../store/authStore'

interface RoomQuote {
  room_id: string
  room_number: string
  name: string | null
  room_type: string | null
  capacity_persons: number
  tariff_per_night_paise: number
  nights: number
  subtotal_paise: number
  cgst_paise: number
  sgst_paise: number
  total_paise: number
}

const isoDay = (offset: number) =>
  new Date(Date.now() + offset * 86400000 + 330 * 60000).toISOString().slice(0, 10)

/**
 * `ac_double` → `AC double`. The column is free text holding whatever the
 * temple's staff typed, so it reached the devotee raw — `capitalize` on
 * `ac_double` renders "Ac_double", underscore and all. Only the ac/non-ac
 * fragments are special-cased; the rest stays in the temple's own words.
 */
function roomTypeLabel(raw: string) {
  return raw
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => (w.toLowerCase() === 'ac' ? 'AC' : /^non-?ac$/i.test(w) ? 'non-AC' : w.toLowerCase()))
    .join(' ')
}

/**
 * Search → hold → pay → ticket, the way a hotel or bus booking already works.
 *
 * The hold is what makes this honest: the room is genuinely reserved while the
 * devotee pays, so the "available" they saw is still true at checkout. The
 * countdown is shown rather than hidden, because a silent expiry followed by a
 * failed payment is the worst version of this flow.
 */
export function RoomBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const user = useAuthStore(s => s.user)

  const [from, setFrom] = useState(params.get('from') || isoDay(1))
  const [to, setTo] = useState(params.get('to') || isoDay(2))
  const [persons, setPersons] = useState(Number(params.get('persons') || 1))

  const [rooms, setRooms] = useState<RoomQuote[] | null>(null)
  const [templeName, setTempleName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<string | null>(null)

  // A live hold, with the deadline the server set — never one this client guessed.
  const [hold, setHold] = useState<{ booking_id: string; expires_at: string; total_paise: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!hold) return
    const tick = () => {
      const left = Math.max(0, Math.floor((Date.parse(hold.expires_at) - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        setHold(null)
        setError('That hold expired. Please search again — the room may still be free.')
        search()
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [hold])

  async function search() {
    if (!slug) return
    setLoading(true); setError(''); setRooms(null)
    try {
      const { data } = await api.get(`/temples/${slug}/rooms/availability`, {
        params: { from, to, persons },
      })
      setRooms(data.data?.rooms ?? [])
      setTempleName(data.data?.temple?.name ?? '')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [slug])

  async function bookRoom(room: RoomQuote) {
    if (!slug) return
    setPaying(room.room_id); setError('')
    try {
      // 1. Hold it. From here the room is ours until the timer runs out.
      const { data: heldRes } = await api.post(`/temples/${slug}/rooms/hold`, {
        room_id: room.room_id, from, to, persons,
      })
      const held = heldRes.data
      setHold({ booking_id: held.booking_id, expires_at: held.expires_at, total_paise: held.total_paise })

      // 2. Order.
      const { data: orderRes } = await api.post(`/temples/${slug}/rooms/bookings/${held.booking_id}/order`)
      const order = orderRes.data

      // 3. Pay. The webhook also confirms, so a closed browser still ends with
      //    a confirmed booking — verify is just the fast path.
      await openRazorpayCheckout({
        order,
        name: templeName || 'Room booking',
        description: `Room ${room.room_number} · ${room.nights} night${room.nights > 1 ? 's' : ''}`,
        prefill: { name: user?.name ?? undefined, contact: user?.mobile ?? undefined },
        onSuccess: async (cb) => {
          try {
            await api.post(`/temples/${slug}/rooms/bookings/${held.booking_id}/verify`, cb)
            setHold(null)
            navigate(`/bookings/${slug}/${held.booking_id}`, { replace: true })
          } catch (e) {
            setError(apiError(e))
          } finally {
            setPaying(null)
          }
        },
        onFailure: (msg) => { setError(msg); setPaying(null) },
        onDismiss: () => {
          setPaying(null)
          setError('Payment cancelled. The room stays held until the timer runs out.')
        },
      })
    } catch (e) {
      setError(apiError(e))
      setPaying(null)
    }
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">Book a room</h1>
          {templeName && <p className="text-xs text-slate-500">{templeName}</p>}
        </div>
      </header>

      <div className="space-y-4 p-4">
        <div className="card p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Check in</label>
              <input type="date" className="form-input" value={from} min={isoDay(0)}
                onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Check out</label>
              <input type="date" className="form-input" value={to} min={from}
                onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Guests</label>
            <input type="number" min={1} max={20} className="form-input" value={persons}
              onChange={e => setPersons(Math.max(1, Number(e.target.value)))} />
          </div>
          <button onClick={search} disabled={loading} className="btn-primary mt-3 w-full">
            {loading ? 'Checking…' : 'Check availability'}
          </button>
        </div>

        {hold && secondsLeft > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Clock size={16} />
            Room held — {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} to pay
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {rooms?.length === 0 && (
          <div className="card p-6 text-center">
            <BedDouble size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">No rooms free for those dates</p>
            <p className="mt-1 text-xs text-slate-500">Try different dates, or fewer guests.</p>
          </div>
        )}

        {rooms?.map(room => (
          <div key={room.room_id} className="card p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Room {room.room_number}{room.name ? ` · ${room.name}` : ''}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <Users size={12} /> sleeps {room.capacity_persons}
                  {room.room_type && <span>· {roomTypeLabel(room.room_type)}</span>}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ₹{fmtPaise(room.tariff_per_night_paise)} × {room.nights} night{room.nights > 1 ? 's' : ''}
                  {room.cgst_paise + room.cgst_paise > 0 && ' + GST'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-slate-800">₹{fmtPaise(room.total_paise)}</p>
                <p className="text-xs text-slate-400">total</p>
              </div>
            </div>
            <button
              onClick={() => bookRoom(room)}
              disabled={!!paying}
              className="btn-primary mt-3 w-full"
            >
              {paying === room.room_id ? 'Holding…' : 'Book this room'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
