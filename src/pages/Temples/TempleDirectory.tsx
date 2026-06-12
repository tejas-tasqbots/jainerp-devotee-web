import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronRight, Search } from 'lucide-react'
import { api } from '../../lib/api'
import type { Temple } from '../../types'

export function TempleDirectory() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [temples, setTemples] = useState<Temple[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [page])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [query])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/temples/directory', { params: { q: query, page, limit: 15 } })
      setTemples(data.data ?? [])
      setTotal(data.meta?.total ?? 0)
    } catch {
      setTemples([])
    } finally {
      setLoading(false)
    }
  }

  const TYPE_COLORS: Record<string, string> = {
    jain: 'badge-gold',
    temple: 'badge-red',
    mandir: 'badge-blue',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">Temple Directory</h1>
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or city..."
            className="form-input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <p className="text-xs text-slate-400">{total} temples found</p>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : temples.length === 0 ? (
          <div className="card p-8 text-center">
            <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No temples found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {temples.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/temples/${t.slug}`)}
                className="w-full card p-4 text-left hover:border-brand-red transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-brand-red" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">{t.city}, {t.state}</p>
                      {t.temple_type && (
                        <span className={`badge ${TYPE_COLORS[t.temple_type] ?? 'badge-slate'}`}>
                          {t.temple_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </div>
              </button>
            ))}
            {total > 15 && (
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5"
                >Prev</button>
                <span className="text-xs text-slate-400">Page {page} of {Math.ceil(total / 15)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 15 >= total}
                  className="btn-secondary text-xs px-3 py-1.5"
                >Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
