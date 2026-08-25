import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, X } from 'lucide-react'

/**
 * Read a granth without leaving the app.
 *
 * ── WHY IT IS AN IFRAME AND NOT A PDF VIEWER ────────────────────────────────
 * The obvious build is pdf.js over the file's bytes. That cannot work here:
 * the stored URLs redirect twice — the source's Use-your-Drive endpoint, then
 * drive.google.com, then drive.usercontent.google.com — and only the LAST hop
 * sends CORS headers. A cross-origin fetch needs every hop to permit it, so
 * the bytes are unreachable from the browser.
 *
 * What is reachable is Drive's own embed, `…/file/d/<id>/preview`, which sends
 * no X-Frame-Options and is built to be framed. The API derives it from the
 * Drive file id already sitting in every download URL.
 *
 * ── WHY WE DO NOT HOST THE FILES ────────────────────────────────────────────
 * The catalogue is 4,498 books and roughly 77 GB. They are catalogued, not
 * mirrored, and this keeps that true while still letting a devotee read one.
 *
 * ── THE SOURCE LINK STAYS ───────────────────────────────────────────────────
 * `sandbox` on a Google Drive embed would break its own scripts, so the frame
 * is not sandboxed — which is a reason to keep the escape hatch honest: the
 * "open at source" link is always offered, it is what a devotee needs to
 * download rather than read, and it is the fallback for any book whose row
 * carries no Drive id.
 */
export function GranthReader({
  title,
  readerUrl,
  sourceUrl,
  onClose,
}: {
  title: string
  readerUrl: string
  sourceUrl?: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-2 bg-navy-900 px-3 py-2 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-none items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-white/10"
          >
            <ExternalLink size={13} /> {t('library.openAtSource')}
          </a>
        )}
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex-none rounded-lg p-1.5 hover:bg-white/10"
        >
          <X size={18} />
        </button>
      </div>

      <iframe
        src={readerUrl}
        title={title}
        className="min-h-0 flex-1 border-0 bg-white"
        allow="autoplay"
      />
    </div>
  )
}
