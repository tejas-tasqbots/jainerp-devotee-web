import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SanghMember } from '../../types'

/**
 * The sangh, arranged by who initiated whom.
 *
 * ── WHAT IT REPLACED ────────────────────────────────────────────────────────
 * Fifty names in one flat list. A sangh IS a structure of relations — that is
 * what the word means — and the page showed it as a directory dump in which
 * the head and their disciples were indistinguishable except for a badge.
 *
 * ── THE SHAPE THE DATA ACTUALLY HAS ─────────────────────────────────────────
 * The API resolves each member's `guru_name` to another member where it can.
 * Measured across all 2,606 ascetics in a sangh this links 46% of them, never
 * cycles, and is never more than two deep — which is not a shortcoming of the
 * matching but the real shape of a sangh: one acharya, and the disciples
 * gathered around them.
 *
 * The 54% whose guru is not in the group are not hidden and not guessed at.
 * Their guru is genuinely elsewhere — deceased, or heading another sangh — so
 * they sit at the top level alongside the head.
 *
 * Each guru with disciples collapses. A head with thirty disciples is the
 * common case, and the point of the tree is to show that they ARE thirty
 * disciples of one teacher, not to make the reader scroll past all of them.
 */
export function SanghTree({ members }: { members: SanghMember[] }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language

  const children = new Map<string, SanghMember[]>()
  for (const m of members) {
    if (!m.guru_id) continue
    if (!children.has(m.guru_id)) children.set(m.guru_id, [])
    children.get(m.guru_id)!.push(m)
  }
  // A member sits at the top level when their guru is outside this sangh, and
  // also when their guru is the ascetic whose page this is — that one is not in
  // `members`, so a disciple of the profile owner would otherwise vanish.
  const byId = new Set(members.map(m => m.id))
  const roots = members.filter(m => !m.guru_id || !byId.has(m.guru_id))

  return (
    <ul className="divide-y divide-slate-100">
      {roots.map(m => (
        <Row key={m.id} m={m} kids={children} lang={lang} t={t} navigate={navigate} depth={0} />
      ))}
    </ul>
  )
}

function Row({
  m, kids, lang, t, navigate, depth,
}: {
  m: SanghMember
  kids: Map<string, SanghMember[]>
  lang: string
  t: (k: string, o?: Record<string, unknown>) => string
  navigate: (to: string) => void
  depth: number
}) {
  const mine = kids.get(m.id) ?? []
  // Open at the top level so the structure is visible on arrival; nested groups
  // start closed so a large sangh still fits on a screen.
  const [open, setOpen] = useState(depth === 0)

  return (
    <li>
      <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 14}px` }}>
        {mine.length > 0 ? (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={t(open ? 'sant.collapse' : 'sant.expand')}
            className="flex-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <span aria-hidden className="w-[21px] flex-none" />
        )}

        <button
          className="flex flex-1 items-center gap-2 rounded py-2 text-left hover:bg-slate-50"
          onClick={() => navigate(`/sant/${m.id}`)}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-slate-800">
              {(lang.startsWith('hi') && m.name_hi) || m.name_en || m.name}
            </span>
            {m.current_city && (
              <span className="block text-[11px] text-slate-400">
                {[m.current_city, m.current_state].filter(Boolean).join(', ')}
              </span>
            )}
          </span>
          {mine.length > 0 && (
            <span className="flex-none text-[10px] text-slate-400">
              {t('sant.discipleCount', { count: mine.length })}
            </span>
          )}
          {m.is_sangh_head && (
            <span className="badge badge-gold text-[9px]">{t('sant.sanghHead')}</span>
          )}
          <ChevronRight size={14} className="flex-shrink-0 text-slate-300" />
        </button>
      </div>

      {open && mine.length > 0 && (
        <ul className="divide-y divide-slate-100 border-l border-slate-100 ml-[10px]">
          {mine.map(c => (
            <Row
              key={c.id} m={c} kids={kids} lang={lang} t={t}
              navigate={navigate} depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
