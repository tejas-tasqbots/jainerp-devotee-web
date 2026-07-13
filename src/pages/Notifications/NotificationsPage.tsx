import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { api, apiError } from '../../lib/api'
import type { Notification } from '../../types'

/** Parse the notification's JSON `data` payload (stored as a string). */
function parseData(n: Notification): Record<string, string> {
  if (!n.data) return {}
  try {
    const parsed = typeof n.data === 'string' ? JSON.parse(n.data) : n.data
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/me/notifications', { params: { page: 1, limit: 50 } })
      setNotifications(data.data ?? [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/me/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } catch { /* ignore */ }
  }

  /** Approved-donation notifications deep-link straight to the receipt. */
  async function openReceipt(tenantId: string, donationId: string) {
    try {
      const { data: html } = await api.get<string>(`/me/receipts/${tenantId}/${donationId}`, { responseType: 'text' })
      const win = window.open('', '_blank', 'width=820,height=980')
      if (!win) { alert('Popup blocked. Please allow popups for this site.'); return }
      win.document.write(html)
      win.document.close()
    } catch (e) {
      alert(apiError(e) || 'Could not load receipt')
    }
  }

  function onTap(n: Notification) {
    if (!n.read_at) markRead(n.id)
    const d = parseData(n)
    if (n.type === 'donation_approved' && d.tenant_id && d.donation_id) {
      openReceipt(d.tenant_id, d.donation_id)
    } else if (n.type === 'donation_rejected') {
      navigate('/donations')
    }
  }

  const unread = notifications.filter(n => !n.read_at)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="page-title">Notifications</h1>
        {unread.length > 0 && (
          <span className="badge badge-red">{unread.length}</span>
        )}
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-full" />
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="card p-8 text-center">
            <Bell size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const d = parseData(n)
            const hasReceipt = n.type === 'donation_approved' && d.tenant_id && d.donation_id
            return (
              <button
                key={n.id}
                onClick={() => onTap(n)}
                className={`w-full card p-4 text-left transition-colors ${
                  !n.read_at ? 'border-brand-blue bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-2 ${!n.read_at ? 'bg-brand-blue' : 'bg-transparent'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${!n.read_at ? 'text-slate-800' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400">
                        {format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                      {hasReceipt && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                          <FileText size={11} /> View receipt
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
