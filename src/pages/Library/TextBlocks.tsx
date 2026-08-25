import { useTranslation } from 'react-i18next'
import type { TextBlock, TextSpan } from '../../types'

/**
 * Render a text as blocks.
 *
 * ── WHY NOT HTML ────────────────────────────────────────────────────────────
 * The obvious way to keep a recitation playable and a yantra visible would be
 * to store the source's markup and drop it in with `dangerouslySetInnerHTML`.
 * That is somebody else's HTML, scraped from a site we do not control, and it
 * would arrive with their stylesheets' assumptions and any script they ever
 * add. The API sends a small closed set of blocks instead, and this walks it
 * and builds our own widgets. A bad source can produce a bad link; it can
 * never produce a script.
 *
 * ── WHAT EACH BLOCK IS FOR ──────────────────────────────────────────────────
 * `verse` is the shloka and the only block whose whitespace is significant.
 * `prose` is the anvayarth and bhavarth around it. `audio` is a recitation —
 * these pages carry eight of them — and `image` is the yantra or illustration
 * that belongs beside the verse it follows.
 */
export function TextBlocks({ blocks, size }: { blocks: TextBlock[]; size: string }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => <Block key={i} b={b} size={size} />)}
    </div>
  )
}

function Block({ b, size }: { b: TextBlock; size: string }) {
  const { t } = useTranslation()

  switch (b.t) {
    case 'heading':
      // The verse number and its name ("09. सर्वभय निवारक"), which is how a
      // reader finds the one they came for in a page of eight.
      return (
        <h2 className="border-t border-slate-200 pt-4 text-sm font-bold tracking-wide text-brand-red first:border-0 first:pt-0">
          <Spans spans={b.spans ?? []} />
        </h2>
      )

    case 'verse':
      // `whitespace-pre-wrap` is load-bearing: this is the only block where a
      // line break carries meaning. Centred and a step larger than the prose,
      // because on the source page the shloka is the thing and the commentary
      // is around it.
      return (
        <p className={`whitespace-pre-wrap text-center font-serif leading-loose text-navy-900 ${size}`}>
          {b.text}
        </p>
      )

    case 'audio':
      // A real player. `preload="none"` because a page carries eight of them
      // and a reader on mobile data should pay for the one they press, not for
      // all eight on arrival.
      return (
        <figure className="rounded-xl border border-slate-200 bg-white p-3">
          <figcaption className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {t('library.recitation')}
          </figcaption>
          <audio controls preload="none" src={b.url ?? undefined} className="w-full">
            {/* Only reached by a browser with no <audio> at all. */}
            <a href={b.url ?? '#'} target="_blank" rel="noopener noreferrer">
              {t('library.recitation')}
            </a>
          </audio>
        </figure>
      )

    case 'image':
      return (
        <figure className="text-center">
          <img
            src={b.url ?? undefined}
            alt={b.caption ?? t('library.illustration')}
            // Lazy, because a Bhaktamar page holds sixteen of these and they
            // are ~242 KB each — four megabytes nobody has scrolled to yet.
            loading="lazy"
            // Capped at 22rem. On the source these sit in a narrow column
            // BESIDE the verse; given the full width of a reading column they
            // become a full screen each, and a page with sixteen of them turns
            // into a slideshow you have to scroll past to reach the text.
            className="mx-auto max-h-[22rem] w-auto max-w-xs rounded-lg border border-slate-200"
          />
          {b.caption && (
            <figcaption className="mt-1 text-[11px] text-slate-400">{b.caption}</figcaption>
          )}
        </figure>
      )

    case 'item':
      return (
        <p className="flex gap-2 text-sm leading-relaxed text-slate-700">
          <span aria-hidden className="text-slate-300">•</span>
          <span><Spans spans={b.spans ?? []} /></span>
        </p>
      )

    default:
      return (
        <p className="text-sm leading-relaxed text-slate-700">
          <Spans spans={b.spans ?? []} />
        </p>
      )
  }
}

/**
 * Inline runs. A span with an href is a real anchor — the source's references
 * read "Audio : Bhaktambar Stotra by Ravindra Jain – Link", and before this the
 * word "Link" was plain text that linked nowhere.
 */
function Spans({ spans }: { spans: TextSpan[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.href ? (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-red underline underline-offset-2 hover:opacity-80"
          >
            {s.s}
          </a>
        ) : (
          <span key={i}>{s.s}</span>
        ),
      )}
    </>
  )
}
