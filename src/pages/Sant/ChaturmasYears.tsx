import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { ChaturmasEntry } from '../../types'

/**
 * Where an ascetic spent each monsoon, as the table it always was.
 *
 * ── WHAT IT REPLACED ────────────────────────────────────────────────────────
 * Acharya Vidyasagarji's card held 53 years of varshayog — 1968 to 2020, most
 * of what a devotee opens that profile to find — as one unbroken line:
 *
 *   Serial No-Year -Place Name 53 2020 Foundation Trust, Pratibhasthali
 *   Revathi Range Indore 52 2019 Shri Digambar Jain Rewat Siddodaya Siddha
 *   Kshetra Trust: Nemawar, District Dewas (M.P.) 51 2018 Khajuraho (MP) ...
 *
 * The header the source left behind says what it is: a three-column table,
 * joined with spaces. The year is the row key and the only column a reader
 * needs; the serial is a counter in somebody's spreadsheet and is dropped.
 *
 * ── HOW IT IS DRAWN ─────────────────────────────────────────────────────────
 * Year in a fixed-width column so the eye can run down it, place beside it.
 * Not a `<table>`: two columns of short text wrap better as a definition list
 * on a phone, which is where this is read.
 *
 * Collapsed to the most recent twelve. A 53-row table is the whole page
 * otherwise, and the rows a devotee wants are at the end the source put first.
 */
const OPEN_AT = 12

export function ChaturmasYears({ entries }: { entries: ChaturmasEntry[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const long = entries.length > OPEN_AT
  const shown = long && !open ? entries.slice(0, OPEN_AT) : entries

  return (
    <div>
      <dl className="divide-y divide-slate-100">
        {shown.map((e, i) => (
          <div key={`${e.year}-${i}`} className="flex gap-3 py-1.5">
            <dt className="w-12 flex-none text-sm font-semibold tabular-nums text-brand-red">
              {e.year}
            </dt>
            <dd className="min-w-0 flex-1 text-sm text-slate-700">{e.place}</dd>
          </div>
        ))}
      </dl>

      {long && (
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-red hover:opacity-80"
        >
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? t('sant.showLess') : t('sant.showAllYears', { count: entries.length })}
        </button>
      )}
    </div>
  )
}
