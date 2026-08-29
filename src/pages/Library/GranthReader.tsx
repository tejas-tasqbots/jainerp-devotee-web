import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink, X } from 'lucide-react'

/**
 * Read a granth without leaving the app.
 *
 * ── WHY AN IFRAME, BEFORE AND AFTER THE MIRROR ──────────────────────────────
 * It was an iframe because it had to be. The source's URLs redirect three hops
 * deep and only the last one sends CORS headers, so the bytes were unreachable
 * from the browser and pdf.js was impossible; Drive's `…/file/d/<id>/preview`
 * embed was the only thing that would render.
 *
 * It stays an iframe because it is now the best option rather than the only
 * one. Once a book is on our origin the browser's built-in PDF viewer renders
 * it from a plain `src` — no library to ship, no worker to host, no fonts to
 * bundle, and a viewer the reader already knows how to drive. pdf.js would earn
 * its weight if we wanted page-jump, search or annotations across the whole
 * catalogue; until then it is several hundred kilobytes to reimplement what
 * every browser already does.
 *
 * ── WHAT `mirrored` CHANGES ─────────────────────────────────────────────────
 * Two real differences, not cosmetic ones:
 *
 *   sandbox   Our own PDF is inert content and gets a sandboxed frame. Drive's
 *             embed is an application and would break under sandbox, so it does
 *             not get one — which is the honest reason the escape hatch below
 *             matters more in that case.
 *   download  A mirrored book saves straight off our origin. An un-mirrored one
 *             can only be sent to the source, because we do not hold the file.
 *
 * The mirror fills in book by book, so both states are live at once and neither
 * is a temporary branch to delete on the next release.
 */
export function GranthReader({
  title,
  readerUrl,
  downloadUrl,
  mirrored,
  onClose,
}: {
  title: string
  readerUrl: string
  downloadUrl?: string | null
  mirrored?: boolean
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

        {downloadUrl && (
          <a
            href={downloadUrl}
            // `download` is a same-origin promise: on our own origin it saves
            // the file, and on a cross-origin URL the browser ignores it and
            // navigates instead. Only asserted where it is true.
            {...(mirrored ? { download: '' } : { target: '_blank', rel: 'noopener noreferrer' })}
            className="flex flex-none items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-white/10"
          >
            {mirrored
              ? <><Download size={13} /> {t('library.download')}</>
              : <><ExternalLink size={13} /> {t('library.openAtSource')}</>}
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
        // Sandboxed only for our own files — see the header. `allow-downloads`
        // keeps the viewer's own save button working inside the sandbox.
        {...(mirrored
          ? { sandbox: 'allow-same-origin allow-downloads allow-scripts' }
          : { allow: 'autoplay' })}
      />
    </div>
  )
}
