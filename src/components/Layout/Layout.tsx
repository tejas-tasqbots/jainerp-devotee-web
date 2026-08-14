import { Outlet } from 'react-router-dom'
import { BottomNav } from '../BottomNav/BottomNav'
import { Sidebar } from './Sidebar'

/**
 * App shell — one layout, two shapes.
 *
 * The portal was written phone-only: a bottom tab bar, single-column stacking,
 * and not one desktop breakpoint across its 21 pages. Rendered on a laptop it
 * was that same phone UI stretched to the window: icons marooned in enormous
 * cells, cards letterboxed, body text running the full screen.
 *
 * Below `lg` nothing has changed — bottom tab bar, full-bleed column, exactly
 * as a phone had it.
 *
 * From `lg` the tab bar is replaced by a sidebar and the content gets a real
 * desktop measure. `max-w-5xl` rather than the full window: even with room to
 * spare, a single column of donation rows reading 1400px wide is harder to
 * scan, not easier — the pages that genuinely benefit from the width (home,
 * the directories) opt into multiple columns themselves.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      {/* `min-w-0`: without it a flex child refuses to shrink below its content
          and any wide row (a long temple name, a table) pushes the whole page
          into horizontal scroll instead of truncating. */}
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-2xl bg-slate-50 pb-20 shadow-sm sm:shadow-xl lg:max-w-5xl lg:bg-transparent lg:pb-8 lg:shadow-none">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
