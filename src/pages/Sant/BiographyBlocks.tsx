import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { BioBlock, BioSpan } from '../../types'

/**
 * The life, in paragraphs.
 *
 * ── WHAT IT REPLACED ────────────────────────────────────────────────────────
 * One `<p>` holding the whole biography. The source writes it as a single
 * unbroken run — not one of the 1,876 English biographies contains a newline —
 * so the card was a slab of text that opened with the ascetic's own name
 * repeated twice under a header that had just printed it.
 *
 * Running inside that slab were a numbered list of temple events, four map
 * links that were not links, and the contributor credit, all as plain prose.
 *
 * ── HOW IT IS DRAWN ─────────────────────────────────────────────────────────
 * Paragraphs read as paragraphs. The numbered run becomes a list. URLs become
 * links. The "Information last updated / Contributor / Reference" tail is
 * provenance rather than biography, so it sits at the foot in the muted style
 * the card already uses for its source credit. The source's own `______` rule
 * becomes a real divider.
 *
 * Long lives collapse. The median biography is a single paragraph, but the
 * corpus runs to 119 of them, and a profile should open on a life rather than
 * on a scroll bar.
 */
const OPEN_AT = 3

export function BiographyBlocks({ blocks }: { blocks: BioBlock[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const paraCount = blocks.filter(b => b.t === 'para').length
  const long = paraCount > OPEN_AT

  let seen = 0
  const shown = !long || open
    ? blocks
    : blocks.filter(b => {
      if (b.t !== 'para') return false
      seen += 1
      return seen <= OPEN_AT
    })

  return (
    <div className="text-sm leading-relaxed text-slate-700">
      {shown.map((b, i) => {
        if (b.t === 'rule') {
          return <hr key={i} className="my-3 border-slate-100" />
        }
        if (b.t === 'meta') {
          return (
            <p key={i} className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              <Spans spans={b.spans ?? []} />
            </p>
          )
        }
        if (b.t === 'item') {
          return (
            <p key={i} className="mt-1.5 flex gap-2">
              <span aria-hidden className="text-slate-300">•</span>
              <span><Spans spans={b.spans ?? []} /></span>
            </p>
          )
        }
        return (
          <p key={i} className="mt-2 first:mt-0">
            <Spans spans={b.spans ?? []} />
          </p>
        )
      })}

      {long && (
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-red hover:opacity-80"
        >
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? t('sant.showLess') : t('sant.readFullLife')}
        </button>
      )}
    </div>
  )
}

/** Inline runs. A span with an href is a real link — the source wrote bare URLs. */
function Spans({ spans }: { spans: BioSpan[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.href ? (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-brand-red underline underline-offset-2 hover:opacity-80"
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
