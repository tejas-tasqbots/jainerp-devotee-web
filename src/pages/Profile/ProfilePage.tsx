import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, CheckCircle, Link, LogOut, Save, XCircle } from 'lucide-react'
import { api, apiError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { StateSelect, CitySelect, CountrySelect } from '../../components/GeoSelect'
import type { DevoteeUser, Temple } from '../../types'

interface TempleInvite {
  id: string
  temple_name: string
  temple_city?: string
  temple_state?: string
  created_at: string
}

export function ProfilePage() {
  const { t } = useTranslation()
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
  const [gotra, setGotra] = useState('')
  const [pan, setPan] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('India')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  // Registration promises "You can change it later", so it has to be editable
  // here. '' is "Prefer not to say" and the API maps it back to NULL.
  const [sect, setSect] = useState('')
  const [subSect, setSubSect] = useState('')
  const [linkSlug, setLinkSlug] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    // allSettled: one failing call must not blank the whole profile
    const [pRes, tRes, nRes, iRes] = await Promise.allSettled([
      api.get('/me'),
      api.get('/me/temples'),
      api.get('/me/notification-preferences'),
      api.get('/me/invites'),
    ])
    if (pRes.status === 'fulfilled') {
      const p = pRes.value.data.data
      setProfile(p)
      setName(p.name ?? '')
      setEmail(p.email ?? '')
      setGotra(p.gotra ?? '')
      setPan(p.pan_masked ?? '')
      setCity(p.city ?? '')
      setState(p.state ?? '')
      setCountry(p.country ?? 'India')
      setAddress(p.address ?? '')
      setPincode(p.pincode ?? '')
      setSect(p.sect ?? '')
      setSubSect(p.sub_sect ?? '')
    }
    if (tRes.status === 'fulfilled') setTemples(tRes.value.data.data ?? [])
    if (nRes.status === 'fulfilled') setNotifPrefs(nRes.value.data.data ?? { push: true, sms: true, whatsapp: true })
    if (iRes.status === 'fulfilled') setInvites(iRes.value.data.data ?? [])
    setLoading(false)
  }

  async function saveProfile() {
    // The field shows the MASKED pan (ABXXXXX34F) when one is on file — only a
    // newly typed full PAN is sent; the masked form must never be written back.
    const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
    const isMasked = /X{3,}/.test(pan)
    let panPatch: string | undefined
    if (!pan && profile?.pan_masked) panPatch = '' // explicit clear
    else if (pan && !isMasked) {
      if (!PAN_RE.test(pan)) { setSaveMsg('Invalid PAN — format is ABCDE1234F'); return }
      panPatch = pan
    }
    setSaving(true); setSaveMsg('')
    try {
      await api.patch('/me', {
        name, email, gotra, city, state, country, address, pincode,
        pan: panPatch,
        sect, sub_sect: subSect,
      })
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
        <h1 className="page-title">{t('titles.myProfile')}</h1>
        <button onClick={() => navigate('/notifications')} aria-label="Notifications" title="Notifications" className="p-2 rounded-full hover:bg-slate-100">
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
          <div className="card overflow-hidden">
            <div className="hero-saffron px-4 py-5 text-white flex items-center gap-3 relative">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold">{(name || 'Y')[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg leading-tight truncate">{name || 'Your Name'}</p>
                <p className="text-sm text-white/80">{user?.mobile}</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label htmlFor="pf-name" className="form-label">Full Name *</label>
                <input id="pf-name" className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-email" className="form-label">Email</label>
                <input id="pf-email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Gotra</label>
                  <input className="form-input" placeholder="e.g. Kashyap" value={gotra} onChange={e => setGotra(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">PAN</label>
                  <input className="form-input uppercase" placeholder="ABCDE1234F" maxLength={10}
                    value={pan} onChange={e => setPan(e.target.value.toUpperCase())} />
                </div>
              </div>
              {/* Sampradaya. Registration says "You can change it later", and
                  this is the later. It also has to be un-settable: once sect
                  filtering is enforced a wrong value hides a devotee's own
                  temples and blocks donating to them, and "Prefer not to say"
                  is the self-serve way back to seeing everything. */}
              <div>
                <label className="form-label">Sampradaya</label>
                <div className="flex gap-2">
                  {[
                    { value: '', label: 'Prefer not to say' },
                    { value: 'digambar', label: 'Digambar' },
                    { value: 'shwetambar', label: 'Shwetambar' },
                  ].map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSect(o.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        sect === o.value
                          ? 'border-brand-red bg-brand-red/10 text-brand-red'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Used to show you temples and sants of your own tradition.
                </p>
              </div>
              {sect !== '' && (
                <div>
                  <label className="form-label">Panth / Gaccha <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    className="form-input"
                    maxLength={40}
                    placeholder={sect === 'digambar' ? 'Terapanth, Bisapanth, Taran Panth…' : 'Murtipujak, Sthanakvasi, Terapanth…'}
                    value={subSect}
                    onChange={e => setSubSect(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="form-label">Country</label>
                <CountrySelect value={country} onChange={c => { setCountry(c); setState(''); setCity('') }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">State</label>
                  {country === 'India' ? (
                    <StateSelect value={state} onChange={s => { setState(s); setCity('') }} />
                  ) : (
                    <input className="form-input" placeholder="State / Province" value={state}
                      onChange={e => setState(e.target.value)} />
                  )}
                </div>
                <div>
                  <label className="form-label">City</label>
                  {country === 'India' ? (
                    <CitySelect state={state} value={city} onChange={setCity} />
                  ) : (
                    <input className="form-input" placeholder="City" value={city}
                      onChange={e => setCity(e.target.value)} />
                  )}
                </div>
              </div>
              <div>
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="House / Street / Locality" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="form-label">{country === 'India' ? 'Pincode' : 'Postal code'}</label>
                <input className="form-input" placeholder={country === 'India' ? '400001' : 'Postal code'}
                  inputMode={country === 'India' ? 'numeric' : 'text'} maxLength={country === 'India' ? 6 : 12}
                  value={pincode}
                  onChange={e => setPincode(country === 'India' ? e.target.value.replace(/\D/g, '') : e.target.value)} />
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
