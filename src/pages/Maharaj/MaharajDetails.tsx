import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Calendar, MapPin, Megaphone, Navigation, Users } from 'lucide-react'
import { format } from 'date-fns'
import { api } from '../../lib/api'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import type { MaharajProfile } from '../../types'

export function MaharajDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MaharajProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/maharaj/${id}`)
      setProfile(data.data)
      setFollowing(data.data?.is_following ?? false)
    } catch {
      // keep null
    } finally {
      setLoading(false)
    }
  }

  async function toggleFollow() {
    if (!profile) return
    setToggling(true)
    try {
      if (following) {
        await api.delete(`/maharaj/${profile.id}/follow`)
        setFollowing(false)
      } else {
        await api.post(`/maharaj/${profile.id}/follow`)
        setFollowing(true)
      }
    } catch { /* keep state */ }
    finally { setToggling(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="page-header">
          <button onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <div className="h-5 bg-slate-200 rounded w-40 animate-pulse" />
          <div />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2].map(i => <div key={i} className="card h-32 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 text-sm">Profile not found</p>
          <button onClick={() => navigate(-1)} className="btn-secondary mt-3 text-xs">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="page-title flex-1 text-center truncate px-2">{profile.name}</h1>
        <div className="w-8" />
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-navy-800 to-navy-600 p-6 text-white">
        <div className="flex items-start gap-4">
          <PhotoAvatar
            name={profile.name}
            photoBase64={profile.photo_base64}
            photoUrl={profile.photo_url}
            className="w-20 h-20"
            textClassName="text-3xl"
            variant="onDark"
          />
          <div className="flex-1">
            <h2 className="font-bold text-xl leading-tight">{profile.name}</h2>
            <p className="text-white/80 text-sm mt-0.5">{profile.samuday}</p>
            {profile.diksha_year && (
              <p className="text-white/60 text-xs mt-0.5">Diksha: {profile.diksha_year}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {/* Honorific resolved server-side; the raw rank enum is never shown. */}
              <span className="badge bg-brand-gold text-navy-900">
                {profile.type_display ?? profile.type}
              </span>
              {profile.sect_display && (
                <span className="badge bg-white/20 text-white">{profile.sect_display}</span>
              )}
              {profile.followers_count !== undefined && (
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Users size={12} /> {profile.followers_count} {profile.followers_count === 1 ? 'follower' : 'followers'}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={toggleFollow}
          disabled={toggling}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            following
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white text-navy-800 hover:bg-navy-50'
          }`}
        >
          {following ? <BellOff size={16} /> : <Bell size={16} />}
          {following ? 'Unfollow' : 'Follow for Updates'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Bio */}
        {profile.bio && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">About</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Current location */}
        {profile.current_location && (
          <div className="card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={15} className="text-brand-red" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Location</h3>
                {profile.current_location.chaturmas && <span className="badge badge-red">Chaturmas</span>}
              </div>
              <p className="text-sm font-semibold text-slate-800">{profile.current_location.place}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {[profile.current_location.city, profile.current_location.state].filter(Boolean).join(', ')}
              </p>
              {profile.current_location.from_date && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(profile.current_location.from_date), 'dd MMM')} –{' '}
                  {profile.current_location.to_date ? format(new Date(profile.current_location.to_date), 'dd MMM yyyy') : '—'}
                </p>
              )}
              {profile.current_location.notes && (
                <p className="text-xs text-slate-500 mt-1 italic">{profile.current_location.notes}</p>
              )}
            </div>
            {profile.current_location.lat != null && profile.current_location.lng != null && (
              <>
                <iframe
                  title="location map"
                  className="w-full h-44 border-t border-slate-100"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.current_location.lng) - 0.02}%2C${Number(profile.current_location.lat) - 0.02}%2C${Number(profile.current_location.lng) + 0.02}%2C${Number(profile.current_location.lat) + 0.02}&layer=mapnik&marker=${profile.current_location.lat}%2C${profile.current_location.lng}`}
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${profile.current_location.lat},${profile.current_location.lng}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-brand-red hover:bg-red-50"
                >
                  <Navigation size={14} /> Get Directions
                </a>
              </>
            )}
          </div>
        )}

        {/* Vihar plan */}
        {profile.vihar_plan && profile.vihar_plan.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={15} className="text-navy-700" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Vihar Plan</h3>
            </div>
            <div className="space-y-2">
              {profile.vihar_plan.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-8 text-center">
                    <p className="text-xs font-bold text-navy-700">
                      {format(new Date(v.expected_from), 'dd')}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {format(new Date(v.expected_from), 'MMM')}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{v.place}</p>
                    <p className="text-xs text-slate-400">{v.city}, {v.state}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        {profile.requirements && profile.requirements.length > 0 && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Requirements</h3>
            <div className="space-y-2">
              {profile.requirements.map(r => (
                <div key={r.id} className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-red">{r.type}</span>
                    <span className="text-xs text-slate-400">{r.city}</span>
                  </div>
                  <p className="text-sm text-slate-700">{r.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Needed: {format(new Date(r.needed_on), 'dd MMM yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent broadcasts / updates */}
        {profile.broadcasts && profile.broadcasts.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={15} className="text-navy-700" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Updates</h3>
            </div>
            <div className="space-y-3">
              {profile.broadcasts.map(b => (
                <div key={b.id} className="border-l-2 border-brand-red pl-3">
                  {b.title && <p className="text-sm font-semibold text-slate-800">{b.title}</p>}
                  <p className="text-sm text-slate-600">{b.message}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{format(new Date(b.created_at), 'dd MMM yyyy, h:mm a')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vihar note */}
        {profile.guru_name && (
          <p className="text-center text-xs text-slate-400">Guru: {profile.guru_name}</p>
        )}
      </div>
    </div>
  )
}
