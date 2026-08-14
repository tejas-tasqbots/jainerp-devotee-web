import { Outlet } from 'react-router-dom'
import { BottomNav } from '../BottomNav/BottomNav'

/**
 * App shell.
 *
 * This is a phone-first PWA, and it used to render edge-to-edge at whatever
 * width the window happened to be. On a laptop that meant a 1900px-wide column:
 * the quick-action icons drifted hundreds of pixels apart, every card became a
 * letterbox, and lines of body text ran the full screen. It read as a broken
 * page rather than an app.
 *
 * The content is now a centred column of phone-to-tablet width, on a tinted
 * canvas, with the bottom nav constrained to match — so on a desktop it reads
 * as a deliberate app window, and on a phone (where the column is wider than
 * the viewport) nothing changes at all.
 *
 * `max-w-2xl` rather than something wider: the whole layout — bottom tab bar,
 * stacked cards, full-width buttons — is designed for one thumb. Stretching it
 * to a desktop content width would need a different layout, not a bigger box.
 */
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="mx-auto w-full max-w-2xl flex-1 bg-slate-50 pb-20 shadow-sm sm:shadow-xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
