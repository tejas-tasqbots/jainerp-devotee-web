import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { ParamparaNode } from '../../types'

/**
 * The teacher-lineage, drawn as the descent it describes.
 *
 * ── WHAT IT REPLACED ────────────────────────────────────────────────────────
 * One wrapped paragraph, which on a real profile read:
 *
 *   1.Aacharya Shri 108 Aadi Sagar (Anklikar) 1809 2.Aacharya Shri 108
 *   Mahaveerkirti Ji 1910 3.Ganadhipati ... 1.Aacharya Shri 108 Gunnandi Ji
 *   Maharaj 1967 2.Aacharya Shri 108 Gupti Nandi Ji Maharaj 1972 ...
 *
 * Every generation was in there and none of it was legible, least of all the
 * one thing the section exists to show: who came after whom.
 *
 * ── HOW IT IS DRAWN ─────────────────────────────────────────────────────────
 * A rail down the left with a node on it per generation, because descent is
 * the relation being shown and a vertical line is what a reader already reads
 * as "and then". Depth is indentation: a `3.1` sits inside `3`, so two
 * disciples of the third acharya are visibly siblings rather than the fourth
 * and fifth generations.
 *
 * A second chain gets its own block. The source concatenates a line of descent
 * with the disciples under its last member, both numbered from 1, and running
 * them together is what made the numbering look broken. They are separated,
 * and NOT labelled — the parse knows there is a second chain, not what the
 * source meant by it, and inventing a heading would be asserting more than the
 * data says.
 *
 * Long lineages collapse. The median is 5 nodes but the corpus runs to 55, and
 * a profile should not open on a screen and a half of names.
 */
const OPEN_AT = 8

export function ParamparaTree({ nodes }: { nodes: ParamparaNode[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const groups: ParamparaNode[][] = []
  for (const n of nodes) {
    if (!groups[n.group - 1]) groups[n.group - 1] = []
    groups[n.group - 1].push(n)
  }

  const long = nodes.length > OPEN_AT
  const shown = long && !open ? nodes.slice(0, OPEN_AT) : nodes
  const visible = groups
    .map(g => g.filter(n => shown.includes(n)))
    .filter(g => g.length)

  return (
    <div>
      {visible.map((group, gi) => (
        <div key={gi} className={gi ? 'mt-3 border-t border-dashed border-slate-200 pt-3' : ''}>
          {group.map((n, i) => (
            <div
              key={`${n.group}-${n.path.join('.')}-${i}`}
              className="relative flex gap-2.5 pb-2.5 last:pb-0"
              style={{ paddingLeft: `${(n.depth - 1) * 18}px` }}
            >
              {/* The rail. Drawn per row and stopped on the last one, so the
                  line connects the generations without dangling past the end. */}
              {i < group.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-4 w-px bg-slate-200"
                  style={{ left: `${(n.depth - 1) * 18 + 5}px`, bottom: 0 }}
                />
              )}
              <span
                aria-hidden
                className={`relative z-10 mt-1.5 h-2.5 w-2.5 flex-none rounded-full border-2 ${
                  n.depth === 1
                    ? 'border-brand-red bg-white'
                    : 'border-slate-300 bg-white'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug text-slate-800">{n.name}</span>
                {n.year && (
                  <span className="block text-[11px] text-slate-400">{n.year}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}

      {long && (
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-red hover:opacity-80"
          aria-expanded={open}
        >
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
          {open
            ? t('sant.showLess')
            : t('sant.showAllGenerations', { count: nodes.length })}
        </button>
      )}
    </div>
  )
}
