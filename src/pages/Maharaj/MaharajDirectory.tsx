import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, MapPin, Search, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { PhotoAvatar } from '../../components/PhotoAvatar'
import { EmptyState, SkeletonList } from '../../components/kit'
import { useTranslation } from 'react-i18next'
import type { MaharajProfile } from '../../types'

export function MaharajDirectory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [samuday, setSamuday] = useState('')
  const [city, setCity] = useState('')
  const [profiles, setProfiles] = useState<MaharajProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
  }, [query, samuday, city])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/maharaj', { params: { q: query, samuday, city, limit: 20 } })
      setProfiles(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('titles.maharajMataji')}</h1>
        <button onClick={() => navigate('/notifications')} aria-label="Notifications" title="Notifications" className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            className="form-input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Samuday..."
            className="form-input flex-1"
            value={samuday}
            onChange={e => setSamuday(e.target.value)}
          />
          <input
            type="text"
            placeholder="City..."
            className="form-input flex-1"
            value={city}
            onChange={e => setCity(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400">{total} profiles</p>

        {loading ? (
          <SkeletonList rows={4} />
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={Search}
            title={query || samuday || city ? t('maharaj.noMatches') : t('maharaj.emptyTitle')}
            hint={query || samuday || city ? t('maharaj.noMatchesHint') : t('maharaj.emptyHint')}
            action={(query || samuday || city) ? (
              <button className="btn-secondary"
                onClick={() => { setQuery(''); setSamuday(''); setCity('') }}>
                {t('maharaj.clearFilters')}
              </button>
            ) : undefined}
          />
        ) : (
          profiles.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/maharaj/${p.id}`)}
              className="w-full card p-4 text-left hover:border-navy-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PhotoAvatar name={p.name} photoUrl={p.photo_url} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.samuday}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.city && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <MapPin size={10} /> {p.city}
                      </span>
                    )}
                    {p.followers_count !== undefined && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <Users size={10} /> {p.followers_count}
                      </span>
                    )}
                    {/* type_display is resolved server-side from ascetic.ts —
                        never render the raw rank enum ('muni') at the user. */}
                    <span className="badge badge-gold text-[9px]">
                      {p.type_display ?? p.type}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
