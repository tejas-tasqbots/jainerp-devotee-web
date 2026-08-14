import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { SectScopeMeta, TraditionScope } from '../lib/traditions'
import { useSectLabel } from '../lib/traditions'

/**
 * "My tradition / All traditions" — the one control that makes sect scoping
 * visible.
 *
 * Scoping a list silently is the failure mode this exists to prevent: a
 * Digambar devotee who cannot find a Shwetambar temple they know exists must be
 * able to see *why* and undo it in one tap, rather than concluding the temple
 * is not on JainERP.
 *
 * Three states, driven by what the server says it applied:
 *
 *  - **scoped** — the devotee has a sampradaya and the list was narrowed to it.
 *  - **all** — they asked for everything; the switch stays visible to go back.
 *  - **no sampradaya recorded** — no switch at all, because there is nothing to
 *    switch between. Instead, a one-line prompt to their profile: this is the
 *    only place in the app where the value's absence is actually costing them
 *    something, so it is the honest place to ask for it.
 */
export function TraditionSwitch({
  meta,
  scope,
  onChange,
}: {
  meta: SectScopeMeta | null | undefined
  scope: TraditionScope
  onChange: (next: TraditionScope) => void
}) {
  const { t } = useTranslation()
  const sectLabel = useSectLabel()

  // Until the first response lands we do not know whether they have a
  // sampradaya, and guessing would flash a control that then disappears.
  if (!meta) return null

  if (!meta.viewer_sect) {
    return (
      <p className="text-xs text-slate-400">
        {t('ui.setSampradayaHint')}{' '}
        <Link to="/profile" className="font-semibold text-brand-red hover:underline">
          {t('ui.setSampradayaCta')}
        </Link>
      </p>
    )
  }

  const own = sectLabel(meta.viewer_sect)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        role="group"
        aria-label={t('ui.sampradaya')}
        className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
      >
        <button
          type="button"
          aria-pressed={scope === 'mine'}
          onClick={() => onChange('mine')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            scope === 'mine' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {own}
        </button>
        <button
          type="button"
          aria-pressed={scope === 'all'}
          onClick={() => onChange('all')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            scope === 'all' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('ui.allTraditions')}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        {scope === 'all' ? t('ui.allTraditionsHint') : t('ui.myTraditionHint', { sect: own })}
      </p>
    </div>
  )
}

/**
 * The sampradaya of one row, as a badge.
 *
 * Renders nothing when the sect is unknown — a temple that never recorded one
 * is shown to everybody, and labelling it "—" would suggest a tradition called
 * that rather than an unanswered question.
 */
export function SectBadge({ sect }: { sect?: string | null }) {
  const sectLabel = useSectLabel()
  const label = sectLabel(sect)
  if (!label) return null
  return <span className="badge badge-gold">{label}</span>
}
