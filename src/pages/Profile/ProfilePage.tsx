import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, CheckCircle, Link, LogOut, Save, User, XCircle } from 'lucide-react'
import { api, apiError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import type { DevoteeUser, Temple } from '../../types'

interface TempleInvite {
  id: string
  temple_name: string
  temple_city?: string
  temple_state?: string
  created_at: string
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [profile, setProfile] = useState<DevoteeUser | null>(null)
  const [temples, setTemples] = useState<Temple[]>([])
  const [invites, setInvites] = useState<TempleInvite[]>([])
  const [notifPrefs, setNotifPrefs] = useState({ push: true, sms: true, whatsapp: true })
  const [loading, setLoading] = useState(true)
  const [inviteActionId, setInviteActionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [linkSlug, setLinkSlug] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [pRes, tRes, nRes, iRes] = await Promise.all([
        api.get('/me'),
        api.get('/me/temples'),
        api.get('/me/notification-preferences'),
        api.get('/me/invites'),
      ])
      const p = pRes.data.data
      setProfile(p)
      setName(p.name ?? '')
      setEmail(p.email ?? '')
      setCity(p.city ?? '')
      setTemples(tRes.data.data ?? [])
      setNotifPrefs(nRes.data.data ?? { push: true, sms: true, whatsapp: true })
      setInvites(iRes.data.data ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function saveProfile() {
    setSaving(true); setSaveMsg('')
    try {
      await api.patch('/me', { name, email, city })
      setSaveMsg('Profile saved!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      setSaveMsg(apiError(e))
    } finally {
      setSaving(false)
    }
  }

  async function saveNotifPrefs() {
    try {
      await api.patch('/me/notification-preferences', notifPrefs)
    } catch { /* ignore */ }
  }

  async function linkTemple() {
    if (!linkSlug.trim()) return
    setLinking(true); setLinkMsg('')
    try {
      const { data } = await api.post('/me/temples/link', { tenant_slug: linkSlug.trim() })
      setLinkMsg(`Request sent to ${data.data.temple}`)
      setLinkSlug('')
    } catch (e) {
      setLinkMsg(apiError(e))
    } finally {
      setLinking(false)
    }
  }

  async function respondToInvite(inviteId: string, accept: boolean) {
    setInviteActionId(inviteId)
    try {
      await api.post(`/me/invites/${inviteId}/${accept ? 'accept' : 'reject'}`)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      if (accept) {
        const { data } = await api.get('/me/temples')
        setTemples(data.data ?? [])
      }
    } catch { /* ignore */ }
    finally { setInviteActionId(null) }
  }

  function doLogout() {
    api.post('/auth/logout').catch(() => {})
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* User info */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <User size={28} className="text-brand-red" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{name || 'Your Name'}</p>
                <p className="text-sm text-slate-500">{user?.mobile}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input className="form-input" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              {saveMsg && (
                <p className={`text-sm ${saveMsg.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMsg}
                </p>
              )}
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full justify-center">
                <Save size={15} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Temple Invitations */}
          {invites.length > 0 && (
            <div className="card p-4 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={15} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Temple Invitations</h3>
                <span className="ml-auto text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">{invites.length}</span>
              </div>
              <div className="space-y-3">
                {invites.map(invite => (
                  <div key={invite.id} className="bg-white rounded-lg p-3 flex items-center justify-between gap-3 border border-amber-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{invite.temple_name}</p>
                      {invite.temple_city && (
                        <p className="text-xs text-slate-500">{invite.temple_city}{invite.temple_state ? `, ${invite.temple_state}` : ''}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => respondToInvite(invite.id, true)}
                        disabled={inviteActionId === invite.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle size={12} /> Accept
                      </button>
                      <button
                        onClick={() => respondToInvite(invite.id, false)}
                        disabled={inviteActionId === invite.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked temples */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Linked Temples</h3>
            </div>
            {temples.length === 0 ? (
              <p className="text-xs text-slate-400">No temples linked yet. Donate to a temple to link automatically.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {temples.map(t => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/temples/${t.slug}`)}
                    className="w-full flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:text-brand-red transition-colors"
                  >
                    <span className="text-sm text-slate-700">{t.name}</span>
                    <span className="text-xs text-slate-400">{t.city}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                placeholder="Temple slug (e.g. shree-jain-derasar-surat)"
                value={linkSlug}
                onChange={e => setLinkSlug(e.target.value)}
              />
              <button onClick={linkTemple} disabled={linking} className="btn-secondary flex-shrink-0">
                <Link size={14} /> {linking ? '...' : 'Link'}
              </button>
            </div>
            {linkMsg && (
              <p className={`text-xs mt-1 ${linkMsg.includes('Request') ? 'text-green-600' : 'text-red-600'}`}>
                {linkMsg}
              </p>
            )}
          </div>

          {/* Notification preferences */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Notification Preferences</h3>
            {([
              { key: 'push', label: 'Push Notifications' },
              { key: 'sms', label: 'SMS Notifications' },
              { key: 'whatsapp', label: 'WhatsApp Notifications' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 cursor-pointer">
                <span className="text-sm text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={e => {
                    const newPrefs = { ...notifPrefs, [key]: e.target.checked }
                    setNotifPrefs(newPrefs)
                    api.patch('/me/notification-preferences', newPrefs).catch(() => {})
                  }}
                  className="w-4 h-4 rounded accent-brand-red"
                />
              </label>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={doLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
