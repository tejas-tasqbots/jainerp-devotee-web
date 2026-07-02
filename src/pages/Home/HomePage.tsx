import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, Calendar, Heart, IndianRupee, Megaphone, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { api, apiError, fmtPaise } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import type { FeedItem } from '../../types'

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    try {
      const { data } = await api.get('/me/feed')
      setFeed(data.data ?? [])
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { label: 'Donate Now', icon: Heart, color: 'bg-brand-red text-white', path: '/donate' },
    { label: 'My Donations', icon: IndianRupee, color: 'bg-green-600 text-white', path: '/donations' },
    { label: 'My Bolis', icon: Calendar, color: 'bg-amber-500 text-white', path: '/bolis' },
    { label: 'Find Temple', icon: Building2, color: 'bg-navy-700 text-white', path: '/temples' },
    { label: 'Maharaj / Mataji', icon: Sparkles, color: 'bg-purple-600 text-white', path: '/maharaj' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="page-header">
        <div>
          <p className="text-xs text-slate-400">Welcome back</p>
          <h1 className="text-base font-bold text-navy-900">
            {user?.name || 'Jai Jinendra 🙏'}
          </h1>
        </div>
        <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} className="text-slate-600" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Quick actions */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map(a => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon size={18} />
                </span>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">My Temple Feed</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="card p-8 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">No temple feed yet</p>
              <p className="text-slate-400 text-xs mt-1">Donate to a temple to start receiving their updates</p>
              <button
                onClick={() => navigate('/temples')}
                className="btn-primary mt-4 mx-auto"
              >
                Find Temples
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map(item => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === 'event' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {item.type === 'event' ? <Calendar size={15} /> : <Megaphone size={15} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-400 truncate">{item.temple_name}</span>
                        <span className={`badge text-[9px] ${item.type === 'event' ? 'badge-gold' : 'badge-blue'}`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      {item.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.body}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(item.date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
