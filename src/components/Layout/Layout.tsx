import { Outlet } from 'react-router-dom'
import { BottomNav } from '../BottomNav/BottomNav'
import { Sidebar } from './Sidebar'

/**
 * App shell — one layout, two shapes.
 *
 * Below `lg`: the phone layout it was built as. Bottom tab bar, one column,
 * full bleed.
 *
 * From `lg`: sidebar instead of tab bar, and the content gets a desktop measure.
 *
 * ── WHY THE WHOLE SHELL IS CENTRED, NOT JUST THE CONTENT ──────────────────
 * The first attempt capped the content with `mx-auto max-w-5xl` INSIDE the
 * flex row. On a 1920px screen that centred a 1024px column inside the 1680px
 * left over after the sidebar — leaving a 328px empty band on each side, so the
 * content floated in the middle of the page visually disconnected from the nav
 * pinned to the far left. Measured, not guessed: sidebar ended at x=240, content
 * started at x=568.
 *
 * Centring the shell as a UNIT keeps the sidebar against the content at any
 * width, and the empty space falls outside both — where it reads as a margin
 * rather than a gap.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] bg-slate-50 lg:shadow-xl">
        <Sidebar />

        {/* `min-w-0`: without it a flex child refuses to shrink below its
            content, so one long temple name pushes the page into horizontal
            scroll instead of truncating. */}
        <div className="min-w-0 flex-1">
          <main className="w-full pb-20 lg:pb-10">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
