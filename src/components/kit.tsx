import type { LucideIcon } from 'lucide-react'

/**
 * Shared building blocks for the devotee app.
 *
 * Every page had its own spinner, its own "No X yet" paragraph and its own
 * skeleton markup, so loading and empty states looked different on each
 * screen. These are the one implementation of each.
 *
 * Mobile-first: the devotee app is used on a phone, so targets are >=44px and
 * nothing relies on hover.
 */

/** Screen heading. Optional back button + right-aligned action. */
export function ScreenHeader({
  title, subtitle, onBack, action,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 mb-4">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold text-navy-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/**
 * Skeleton rows — used instead of a spinner so the page doesn't jump when
 * data arrives.
 */
export function SkeletonList({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex gap-3 items-center">
            {avatar && <div className="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0" />}
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-200 rounded w-2/5" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
            <div className="h-4 w-14 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Consistent "nothing here" panel with an optional next step. */
export function EmptyState({
  icon: Icon, title, hint, action,
}: {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card py-12 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Icon size={24} />
        </div>
      )}
      <p className="font-semibold text-navy-900">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Section heading used between blocks on the home screen and detail pages. */
export function SectionTitle({
  children, action,
}: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{children}</h2>
      {action}
    </div>
  )
}

/** Error panel matching the shared danger tokens. */
export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 text-sm text-red-700 px-4 py-3" role="alert">
      {message}
    </div>
  )
}

/** Money, always from integer paise — never format rupees by hand. */
export function Amount({
  paise, className = '', tone,
}: { paise: number; className?: string; tone?: 'good' | 'due' }) {
  const toneClass = tone === 'good' ? 'text-brand-green' : tone === 'due' ? 'text-brand-red' : ''
  return (
    <span className={`font-semibold tabular-nums ${toneClass} ${className}`}>
      ₹{(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}
