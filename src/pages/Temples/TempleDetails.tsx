import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, Camera, Heart, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { api } from '../../lib/api'
import type { Temple } from '../../types'

export function TempleDetails() {
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
      setTemple(tRes.data.data)
      setEvents(eRes.data.data ?? [])
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
          <p className="text-slate-500 text-sm">Temple not found</p>
          <button onClick={() => navigate(-1)} className="btn-secondary mt-3 text-xs">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
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
              <h3 className="text-sm font-semibold text-slate-700">Gallery</h3>
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
              <h3 className="text-sm font-semibold text-slate-700">Upcoming Events</h3>
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
      </div>
    </div>
  )
}
