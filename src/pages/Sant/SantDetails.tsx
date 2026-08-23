import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Bell, BellOff, Calendar, CalendarDays, Cake, ChevronRight, Clock,
  MapPin, Megaphone, Navigation, Send, Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { api } from '../../lib/api'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import type { MaharajProfile } from '../../types'
import { Fact, ProfileLinks, Publications } from '../../components/ProfileBlocks'
import { altNameFor, eventTypeLabel, nameFor, santDisplayName } from '../../lib/ascetic'
import { ReportLocationDialog } from './ReportLocationDialog'

export function SantDetails() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MaharajProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/sant/${id}`)
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
        await api.delete(`/sant/${profile.id}/follow`)
        setFollowing(false)
      } else {
        await api.post(`/sant/${profile.id}/follow`)
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
          <p className="text-slate-500 text-sm">{t('ui.profileNotFound')}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary mt-3 text-xs">{t('ui.goBackCaps')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <button onClick={() => navigate(-1)} aria-label={t('ui.goBack')} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="page-title flex-1 text-center truncate px-2">{nameFor(profile, lang)}</h1>
        <div className="w-8" />
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-navy-900 to-navy-700 p-6 text-white">
        <div className="flex items-start gap-4">
          <PhotoAvatar
            name={nameFor(profile, lang)}
            photoBase64={profile.photo_base64}
            photoUrl={profile.photo_url}
            className="w-20 h-20"
            textClassName="text-3xl"
            variant="onDark"
          />
          <div className="flex-1">
            {/* "Acharya Shri …" — the post reads as part of the name. */}
            <h2 className="font-bold text-xl leading-tight">{santDisplayName(profile, lang)}</h2>
            {/* The other script. A devotee who knows this ascetic by their
                Devanagari name should see it on the profile they landed on,
                whichever language the app is set to. */}
            {altNameFor(profile, lang) && (
              <p className="text-white/70 text-base leading-tight">{altNameFor(profile, lang)}</p>
            )}
            <p className="text-white/80 text-sm mt-0.5">{profile.samuday}</p>
            {profile.diksha_year && (
              <p className="text-white/60 text-xs mt-0.5">Diksha: {profile.diksha_year}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {/* Honorific resolved server-side; the raw rank enum is never shown. */}
              <span className="badge bg-brand-gold text-navy-900">
                {(lang === 'hi' ? profile.type_display_hi : profile.type_display) ?? profile.type}
              </span>
              {profile.sect_display && (
                <span className="badge bg-white/20 text-white">
                  {(lang === 'hi' ? profile.sect_display_hi : profile.sect_display) ?? profile.sect_display}
                </span>
              )}
              {/* Kept in the directory on purpose — the record is the point —
                  so the profile has to say plainly that this ascetic is no
                  longer travelling, or a devotee reads the vihar history as
                  current and sets out for darshan. */}
              {profile.is_samadhistha && (
                <span className="badge bg-white/20 text-white">{t('sant.statusSamadhisthaShort')}</span>
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
        {/* Links — the first thing a devotee looks for after the name. */}
        <ProfileLinks links={profile.links} />

        {/* About. `about` is the long form (migration 034); `bio` is the older
            one-liner. Both render, longest first, because a profile written
            before the long field existed must not suddenly go blank. */}
        {(profile.about || profile.bio) && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('ui.about')}</h3>
            <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
              {profile.about || profile.bio}
            </p>
          </div>
        )}

        {/* Life and study */}
        {(profile.lineage || profile.diksha_place || profile.education || profile.honours) && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('ui.lifeStudy')}</h3>
            <dl className="divide-y divide-slate-100">
              <Fact label="Lineage" value={profile.lineage} />
              <Fact label="Diksha place" value={profile.diksha_place} />
              <Fact label="Diksha year" value={profile.diksha_year} />
              <Fact label="Study" value={profile.education} />
              {/* A conferred title, never the canonical rank shown in the header. */}
              <Fact label="Titles" value={profile.honours} />
            </dl>
          </div>
        )}

        {/* The sangh, and who else is in it.
            `sangh` has been on the API response since migration 047 and nothing
            rendered it — a column written and never read, which reads as data
            loss rather than as a missing feature. This is the question the
            sangh model exists to answer: who travels with this Acharya. */}
        {profile.sangh && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {t('sant.sangh')}
            </h3>
            <p className="text-sm font-medium text-slate-800">
              {(lang.startsWith('hi') && profile.sangh.name_hi) || profile.sangh.name_en}
            </p>
            {profile.sangh.parampara && (
              <p className="text-xs text-slate-500 mt-0.5">{profile.sangh.parampara}</p>
            )}
            {!!profile.sangh.members?.length && (
              <>
                <p className="text-[11px] text-slate-400 mt-3 mb-1">
                  {t('sant.sanghOthers', { count: profile.sangh.members.length })}
                </p>
                <ul className="divide-y divide-slate-100">
                  {profile.sangh.members.map(mem => (
                    <li key={mem.id}>
                      <button
                        className="w-full text-left py-2 flex items-center gap-2 hover:bg-slate-50 rounded"
                        onClick={() => navigate(`/sant/${mem.id}`)}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-slate-800 truncate">
                            {(lang.startsWith('hi') && mem.name_hi) || mem.name_en || mem.name}
                          </span>
                          {/* Where they are NOW, paired with its own state — the
                              two halves must come from the same place. */}
                          {mem.current_city && (
                            <span className="block text-[11px] text-slate-400">
                              {[mem.current_city, mem.current_state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </span>
                        {mem.is_sangh_head && (
                          <span className="badge badge-gold text-[9px]">{t('sant.sanghHead')}</span>
                        )}
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Published works */}
        {!!profile.publications?.length && (
          <div className="card p-4">
            <Publications publications={profile.publications} title={t('ui.publishedWorks')} />
          </div>
        )}

        {/* Current location */}
        {profile.current_location && (
          <div className="card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={15} className="text-brand-red" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ui.currentLocation')}</h3>
                {profile.current_location.chaturmas && <span className="badge badge-red">{t('ui.chaturmas')}</span>}
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
                  <Navigation size={14} />{t('ui.getDirections')}</a>
              </>
            )}
          </div>
        )}

        {/* A memorial says so, once, in plain words.
            The profile is deliberately kept and deliberately complete, so
            without this a devotee reads the vihar history and the chaturmas
            record as current and sets out for darshan. */}
        {profile.is_samadhistha && (
          <div className="card p-4 bg-slate-50 border-slate-200">
            <p className="text-sm font-semibold text-slate-800">
              {profile.samadhi_date
                ? t('sant.samadhiOn', { date: new Date(profile.samadhi_date).toLocaleDateString() })
                : t('sant.statusSamadhisthaShort')}
            </p>
            {profile.tithi_note && (
              <p className="text-xs text-slate-500 mt-0.5">{profile.tithi_note}</p>
            )}
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{t('sant.samadhiNote')}</p>
          </div>
        )}

        {/* Report a sighting.
            A devotee who has actually seen the Sant is the fastest source of a
            location update, and until now had no way to say so. This does NOT
            change the location — it queues a proposal the Sant's own
            sangh representative approves, exactly like a mandir's (migration 016). */}
        {/* Keyed on the state, not the date. Many samadhistha records carry no
            date at all (migration 045), and gating on the date offered every
            one of them a "report a sighting" button. */}
        {!profile.is_samadhistha && (
          <button
            onClick={() => setReporting(true)}
            className="w-full card p-3 flex items-center justify-center gap-2 text-sm
                       font-medium text-brand-red hover:bg-red-50"
          >
            <Send size={15} />{t('sant.reportSeen')}
          </button>
        )}

        {/* Anniversaries — derived from the profile's dates, never stored. */}
        {!!profile.anniversaries?.length && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cake size={15} className="text-navy-700" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('sant.anniversaries')}
              </h3>
            </div>
            <div className="space-y-2">
              {profile.anniversaries.map(a => (
                <div key={a.kind} className="flex items-center justify-between py-1.5
                                             border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{a.label}</p>
                    {/* Observance follows the tithi, not the Gregorian date, so
                        the tithi is shown next to it wherever it is recorded. */}
                    {a.tithi_note && <p className="text-[11px] text-slate-400">{a.tithi_note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600">{formatIsoDay(a.date)}</p>
                    {a.next_on && (
                      <p className="text-[11px] text-slate-400">
                        {t('sant.nextOn', { date: formatIsoDay(a.next_on) })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        {!!profile.events?.length && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={15} className="text-navy-700" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('sant.upcomingEvents')}
              </h3>
            </div>
            <div className="space-y-3">
              {profile.events.map(e => (
                <div key={e.id} className="border-l-2 border-brand-gold pl-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                    <span className="badge badge-gold text-[9px]">{eventTypeLabel(e.type)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[e.place, e.city, e.state].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatIsoDay(e.starts_on)}{e.ends_on ? ` – ${formatIsoDay(e.ends_on)}` : ''}</span>
                    {e.starts_at_time && (
                      <span className="flex items-center gap-0.5"><Clock size={10} />{e.starts_at_time}</span>
                    )}
                  </p>
                  {e.description && (
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{e.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Varshayog history — the monsoons already recorded for this profile. */}
        {!!profile.chaturmas_history?.length && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={15} className="text-brand-red" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('sant.chaturmasHistory')}
              </h3>
            </div>
            <div className="space-y-1.5">
              {profile.chaturmas_history.map(c => (
                <div key={c.id} className="flex items-baseline gap-3 py-1.5
                                           border-b border-slate-100 last:border-0">
                  <span className="text-xs font-bold text-navy-700 w-10 shrink-0">
                    {c.chaturmas_year ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{c.place}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[c.city, c.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vihar plan */}
        {profile.vihar_plan && profile.vihar_plan.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={15} className="text-navy-700" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ui.upcomingVihar')}</h3>
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
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('ui.requirements')}</h3>
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
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ui.recentUpdates')}</h3>
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

      {reporting && (
        <ReportLocationDialog
          santId={profile.id}
          santName={nameFor(profile, lang)}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}

/**
 * Formats a Postgres `YYYY-MM-DD` without a timezone round-trip.
 *
 * `new Date('2026-09-14')` parses as UTC midnight and renders in local time,
 * which prints the previous day anywhere west of Greenwich. `date-fns` format
 * on that value has the same problem — this repo has already shipped one
 * off-by-one date bug of exactly this shape.
 */
function formatIsoDay(iso: string): string {
  const [y, m, d] = (iso ?? '').slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso ?? ''
  return format(new Date(y, m - 1, d), 'dd MMM yyyy')
}
