import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Building2, Calendar, Camera, Heart, MapPin, Navigation, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { api, fmtPaise } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import type { Temple } from '../../types'
import { Fact, ProfileLinks, Publications } from '../../components/ProfileBlocks'

export function TempleDetails() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [temple, setTemple] = useState<Temple | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [gallery, setGallery] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (slug) load() }, [slug])

  async function load() {
    setLoading(true)
    try {
      const [tRes, eRes, gRes] = await Promise.all([
        api.get(`/temples/${slug}`),
        api.get(`/temples/${slug}/events`, { params: { status: 'upcoming' } }),
        api.get(`/temples/${slug}/gallery`),
      ])
      const detail = tRes.data.data
      setTemple(detail)
      // A trust that never bought the Events module has no event calendar, so
      // hide the section rather than render an empty "Upcoming Events" heading
      // that suggests the temple simply has nothing planned (migration 031).
      const modules: string[] = detail?.modules ?? []
      setEvents(modules.length && !modules.includes('events') ? [] : eRes.data.data ?? [])
      setGallery(gRes.data.data ?? [])
    } catch {
      // keep nulls
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} /></button>
          <div className="h-5 bg-slate-200 rounded w-40 animate-pulse" />
          <div />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!temple) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">{t('ui.templeNotFound')}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary mt-3 text-xs">{t('ui.goBackCaps')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} aria-label={t('ui.goBack')} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="page-title flex-1 text-center truncate px-2">{temple.name}</h1>
        <div className="w-8" />
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-navy-900 to-navy-700 p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Building2 size={28} className="text-brand-gold" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{temple.name}</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-slate-300" />
              <span className="text-sm text-slate-300">{temple.city}, {temple.state}</span>
            </div>
          </div>
        </div>
        {temple.registration_80g && (
          <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs">
            <span className="text-brand-gold">✓</span> 80G: {temple.registration_80g}
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Book a room — gated on the trust actually HAVING a room, not merely
            being entitled to the module. A trust can hold `dharamshala` and own
            nothing: this button used to take the devotee to a search that could
            only ever answer "no rooms free", which is a dead end dressed up as
            an offer. `facilities.dharamshala.bookable` is the server's answer to
            "is there genuinely a room"; an older API that sends no `facilities`
            falls back to the module flag, i.e. the previous behaviour. */}
        {(temple.facilities
          ? temple.facilities.dharamshala?.bookable
          : (temple.modules ?? []).includes('dharamshala')) && (
          <button
            onClick={() => navigate(`/temples/${temple.slug}/book`)}
            className="btn-secondary w-full"
          >
            <BedDouble size={18} /> Book a room
            {temple.facilities?.dharamshala?.from_paise != null && (
              <span className="text-slate-500 font-normal">
                — from ₹{fmtPaise(temple.facilities.dharamshala.from_paise).replace(/\.00$/, '')}/night
              </span>
            )}
          </button>
        )}

        {/* What this trust actually runs. A Dharamshala trust or a Gaushala
            trust is not a mandir with things switched off — it is its own kind
            of organisation, and its page should say so in counts a devotee
            understands, never in module names. */}
        {temple.facilities && Object.keys(temple.facilities).length > 0 && (
          <div className="card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('ui.whatTrustRuns')}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {(temple.facilities.dharamshala?.rooms ?? 0) > 0 && (
                <li className="flex items-center gap-2">
                  <BedDouble size={14} className="text-slate-400" />
                  Dharamshala — {temple.facilities.dharamshala!.rooms} rooms
                  {(temple.facilities.dharamshala!.halls ?? 0) > 0 &&
                    ` · ${temple.facilities.dharamshala!.halls} halls`}
                </li>
              )}
              {(temple.facilities.gaushala?.cattle ?? 0) > 0 && (
                <li>🐄 Gaushala — {temple.facilities.gaushala!.cattle} cattle in care</li>
              )}
              {(temple.facilities.seva?.sevas ?? 0) > 0 && (
                <li>🙏 Seva — {temple.facilities.seva!.sevas} offered</li>
              )}
              {(temple.facilities.prasad?.items ?? 0) > 0 && (
                <li>🍚 Prasad — {temple.facilities.prasad!.items} items</li>
              )}
              {temple.facilities.bhojanshala?.runs && <li>🍽 Bhojanshala — community dining</li>}
            </ul>
          </div>
        )}

        {/* Links */}
        <ProfileLinks links={temple.links} />

        {/* About this trust, in its own words */}
        {temple.about && (
          <div className="card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('ui.about')}</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{temple.about}</p>
          </div>
        )}

        {(temple.main_deity || temple.founded_year || temple.darshan_timings ||
          temple.profile_languages?.length) && (
          <div className="card p-4">
            <dl className="divide-y divide-slate-100">
              <Fact label="Mulnayak" value={temple.main_deity} />
              <Fact label="Founded" value={temple.founded_year} />
              <Fact label="Darshan" value={temple.darshan_timings} />
              <Fact label="Languages" value={temple.profile_languages?.join(', ')} />
            </dl>
          </div>
        )}

        {!!temple.publications?.length && (
          <div className="card p-4">
            <Publications publications={temple.publications} />
          </div>
        )}

        {/* Donate CTA */}
        <button
          onClick={() => navigate('/donate')}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          <Heart size={18} /> Donate to {temple.name}
        </button>

        {/* Gallery */}
        {gallery.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">{t('ui.gallery')}</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {gallery.map((img: any) => (
                <div key={img.id} className="flex-shrink-0 w-28 h-28 rounded-xl bg-slate-200 overflow-hidden">
                  {img.url ? (
                    <img src={img.url} alt={img.title || 'Gallery'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={24} className="text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">{t('ui.upcomingEvents')}</h3>
            </div>
            <div className="space-y-2">
              {events.map((e: any) => (
                <div key={e.id} className="card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{e.name}</p>
                      {e.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{e.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-brand-gold">
                        {format(new Date(e.start_date), 'dd MMM')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(e.start_date), 'yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sadhu-Sadhvi associated with this temple */}
        {temple.maharaj && temple.maharaj.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">{t('titles.maharajMataji')} here</h3>
            </div>
            <div className="space-y-2">
              {temple.maharaj.map(m => (
                <button key={m.id} onClick={() => navigate(`/sant/${m.id}`)} className="card p-3 w-full text-left hover:border-brand-red transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* List payload carries photo_url only — see Images_And_Photos.md §6.3. */}
                    {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" loading="lazy" /> : <Sparkles size={16} className="text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.samuday}{m.note ? ` · ${m.note}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Map */}
        {temple.lat != null && temple.lng != null && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">{t('ui.location')}</h3>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <iframe
                title="temple map"
                className="w-full h-48"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(temple.lng) - 0.02}%2C${Number(temple.lat) - 0.02}%2C${Number(temple.lng) + 0.02}%2C${Number(temple.lat) + 0.02}&layer=mapnik&marker=${temple.lat}%2C${temple.lng}`}
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${temple.lat},${temple.lng}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-brand-red hover:bg-red-50"
              >
                <Navigation size={14} />{t('ui.getDirections')}</a>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
