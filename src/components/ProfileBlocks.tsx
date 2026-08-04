import {
  BookOpen, Facebook, Globe, Instagram, Linkedin, Mail, MessageCircle,
  Phone, Send, Youtube,
} from 'lucide-react'

export interface ProfileLink { id: string; kind: string; label?: string | null; url: string }
export interface Publication {
  id: string
  title: string
  kind: string
  language?: string | null
  year?: number | null
  publisher?: string | null
  description?: string | null
  url?: string | null
  has_cover?: boolean
}

const ICONS: Record<string, typeof Globe> = {
  website: Globe,
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  phone: Phone,
}

/** `x` has no lucide icon and `other` is by definition unknown. */
function iconFor(kind: string) {
  return ICONS[kind] ?? Globe
}

function labelFor(l: ProfileLink) {
  if (l.label) return l.label
  if (l.kind === 'other' || l.kind === 'website') {
    try { return new URL(l.url).hostname.replace(/^www\./, '') } catch { return l.url }
  }
  return l.kind === 'x' ? 'X' : l.kind[0].toUpperCase() + l.kind.slice(1)
}

/**
 * The links row on a public profile.
 *
 * `rel="noreferrer"` on every one: these URLs are typed by trustees and sant
 * reps, so they are user content leaving our page, and the referrer should not
 * follow. The API already refuses any scheme other than http/https/mailto/tel,
 * which is what stops a `javascript:` URL becoming script execution here.
 */
export function ProfileLinks({ links }: { links?: ProfileLink[] }) {
  if (!links?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(l => {
        const Icon = iconFor(l.kind)
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            <Icon size={14} className="text-slate-400" />
            {labelFor(l)}
          </a>
        )
      })}
    </div>
  )
}

/**
 * Published works.
 *
 * Covers are deliberately not fetched here: the list endpoint sends only
 * `has_cover`, so a profile with twenty books stays one small payload
 * (Images_And_Photos.md §6.3). A title with no cover still reads perfectly —
 * which is why the placeholder is a glyph, not a spinner waiting on bytes.
 */
export function Publications({
  publications,
  title = 'Books & publications',
}: {
  publications?: Publication[]
  title?: string
}) {
  if (!publications?.length) return null
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="space-y-2">
        {publications.map(p => {
          const meta = [
            p.kind !== 'book' ? p.kind : null,
            p.language,
            p.year,
            p.publisher,
          ].filter(Boolean).join(' · ')
          const body = (
            <>
              <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-slate-100">
                <BookOpen size={16} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{p.title}</p>
                {meta && <p className="mt-0.5 text-xs capitalize text-slate-500">{meta}</p>}
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                )}
              </div>
            </>
          )
          return p.url ? (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer"
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300">
              {body}
            </a>
          ) : (
            <div key={p.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** One labelled fact on a profile — omitted entirely when there is no value. */
export function Fact({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-800">{value}</dd>
    </div>
  )
}
