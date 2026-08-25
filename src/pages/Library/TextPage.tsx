import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen, ChevronRight, ExternalLink, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { ErrorPanel, SkeletonList } from '../../components/kit'
import { KIND_ICON, kindLabel } from '../../lib/library'
import { TextBlocks } from './TextBlocks'
import type { LibraryTextDetail } from '../../types'

/**
 * One text, to be read.
 *
 * ── WHY THIS IS NOT A NORMAL DETAIL PAGE ────────────────────────────────────
 * Everything else in the portal is a record to be scanned — a donation, a
 * booking, a profile. This is a thing to be RECITED, often standing in front
 * of a Jinalaya at six in the morning, on a phone held at arm's length. Three
 * consequences the rest of the app does not have to think about:
 *
 *  1. The line breaks are the text. A puja is verse; `whitespace-pre-wrap` is
 *     load-bearing, not styling. The API stores plain text with the breaks
 *     intact for exactly this.
 *  2. The type has to be bigger than the app's, and adjustable. Devanagari at
 *     14px is not readable at arm's length, and the reader's own comfortable
 *     size is not something a designer can pick for them. The choice is
 *     remembered, because nobody wants to set it every morning.
 *  3. Measure, not width. A 1400px window would give 200-character lines,
 *     which nobody can track from the end of one line to the start of the
 *     next. The reading column is capped.
 */
const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl'] as const
const SIZE_KEY = 'jainerp.library.textSize'

export function TextPage() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  /**
   * The loaded text, tagged with the slug it belongs to.
   *
   * `loading` is derived from that tag — "what I am holding is not what was
   * asked for" — rather than a flag flipped at the top of the effect. Besides
   * removing a cascading render, it fixes the flash: navigating from "read
   * next" would otherwise paint the OLD text under the new title for a frame.
   */
  const [loaded, setLoaded] = useState<
    { slug: string; text: LibraryTextDetail | null; error: string } | null
  >(null)
  const loading = loaded?.slug !== slug
  const text = loading ? null : loaded?.text ?? null
  const error = loading ? '' : loaded?.error ?? ''

  // Remembered across visits, and defensively: a browser with site data
  // blocked throws on read, and the page must still render.
  const [size, setSize] = useState(() => {
    try {
      // The raw value is checked BEFORE Number(): `Number(null)` is 0, not NaN,
      // so a first-time reader with nothing stored passed the finite check and
      // got index 0 — the smallest size — instead of the default. Devanagari at
      // 16px is exactly what this control exists to avoid.
      const raw = localStorage.getItem(SIZE_KEY)
      if (raw === null || raw === '') return 1
      const n = Number(raw)
      return Number.isInteger(n) && n >= 0 && n < SIZES.length ? n : 1
    } catch { return 1 }
  })
  useEffect(() => {
    try { localStorage.setItem(SIZE_KEY, String(size)) } catch { /* not essential */ }
  }, [size])

  useEffect(() => {
    let live = true
    api.get(`/library/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (live) setLoaded({ slug, text: data.data ?? null, error: '' })
      })
      .catch(() => {
        if (live) setLoaded({ slug, text: null, error: t('library.notFound') })
      })
    // Back to the top: navigating from "read next" at the foot of a long text
    // otherwise lands the reader at the bottom of the new one.
    window.scrollTo({ top: 0 })
    return () => { live = false }
  }, [slug, t])

  if (loading) return <div className="min-h-screen bg-slate-50 p-4"><SkeletonList rows={5} avatar={false} /></div>
  if (error || !text) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <ErrorPanel message={error || t('library.notFound')} />
        <button onClick={() => navigate('/library')} className="btn-secondary mt-3 text-xs">
          {t('library.backToLibrary')}
        </button>
      </div>
    )
  }

  const Icon = KIND_ICON[text.kind] ?? BookOpen
  const title = (lang.startsWith('hi') && text.title_hi) || text.title
  // The catalogue block, as label/value pairs, with the empty ones dropped —
  // most texts fill in three or four of the seven and a grid of blank rows
  // reads as missing data rather than as a source that simply did not record it.
  const facts: { label: string; value: string }[] = [
    { label: t('library.composer'), value: text.author ?? '' },
    { label: t('library.language'), value: text.language ?? '' },
    { label: t('library.rhythm'), value: text.rhythm ?? '' },
    { label: t('library.collection'), value: text.particulars ?? '' },
    { label: t('library.type'), value: text.text_type ?? '' },
    { label: t('library.transcribedBy'), value: text.contributed_by ?? '' },
  ].filter(f => f.value)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <button onClick={() => navigate(-1)} aria-label={t('ui.goBack')}
          className="-ml-2 rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSize(n => Math.max(0, n - 1))}
            disabled={size === 0}
            aria-label={t('library.smallerText')}
            title={t('library.smallerText')}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          ><Minus size={18} /></button>
          <button
            onClick={() => setSize(n => Math.min(SIZES.length - 1, n + 1))}
            disabled={size === SIZES.length - 1}
            aria-label={t('library.largerText')}
            title={t('library.largerText')}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          ><Plus size={18} /></button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4 space-y-4">
        <header>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
            <Icon size={12} />
            {kindLabel(t, text.kind)}
          </span>
          <h1 className="mt-2 text-xl font-bold leading-snug text-navy-900">{title}</h1>
          {/* The other script's title, when the reader's language is not the
              one the title is in. Both are usually recorded and a devotee
              searching for "Alochana Paath" needs to recognise आलोचना पाठ. */}
          {text.title_hi && text.title_hi !== title && (
            <p className="mt-0.5 text-sm text-slate-500">{text.title_hi}</p>
          )}
          {text.sant_name && (
            <button
              onClick={() => navigate(`/sant/${text.sant_id}`)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
            >
              {(lang.startsWith('hi') && text.sant_name_hi) || text.sant_name}
              <ChevronRight size={13} />
            </button>
          )}
        </header>

        {facts.length > 0 && (
          <dl className="card grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs sm:grid-cols-3">
            {facts.map(f => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wider text-slate-400">{f.label}</dt>
                <dd className="truncate font-medium text-slate-700" title={f.value}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/*
          THE TEXT.

          `whitespace-pre-wrap` is the whole point — a stotra is poetry and the
          API stores it with its breaks intact. `leading-loose` because
          Devanagari matras sit above and below the line and default leading
          collides them. Serif for the body, sans for the chrome: this is a
          reading surface, not an interface.
        */}
        <article lang={text.script === 'en' ? 'en' : 'hi'} className="card p-5">
          {text.body_blocks?.length ? (
            // Blocks: the recitation is a player, the yantra is an image and a
            // link is a link. See TextBlocks.
            <TextBlocks blocks={text.body_blocks} size={SIZES[size]} />
          ) : (
            // A text scraped before 059 has no blocks. `whitespace-pre-wrap`
            // still matters here — it is verse either way.
            <div className={`whitespace-pre-wrap font-serif leading-loose text-navy-900 ${SIZES[size]}`}>
              {text.body}
            </div>
          )}
        </article>

        {/* Provenance, stated rather than buried. This is somebody else's
            transcription and the reader is entitled to check it — a wrong
            syllable in a stotra matters to the person reciting it. */}
        <footer className="space-y-1.5 text-[11px] text-slate-400">
          {text.credit && <p>{text.credit}</p>}
          <div className="flex flex-wrap gap-3">
            {text.reference_url && (
              <a href={text.reference_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-slate-600">
                {t('library.reference')} <ExternalLink size={11} />
              </a>
            )}
            {text.source_url && (
              <a href={text.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-slate-600">
                {t('library.viewSource')} <ExternalLink size={11} />
              </a>
            )}
          </div>
        </footer>

        {text.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {text.categories.map(c => (
              <button key={c.slug} onClick={() => navigate(`/library?category=${encodeURIComponent(c.slug)}`)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-slate-300">
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* The parts of a serialised work. Shown ABOVE "read next" and instead
            of guessing: somebody on part 3 of the Bhudhar Shatak wants part 4,
            not another text that happens to share a genre. */}
        {text.parts.length > 1 && (
          <section>
            <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {text.series} · {t('library.partCount', { count: text.parts.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {text.parts.map(x => (
                <button
                  key={x.id}
                  onClick={() => navigate(`/library/${x.slug}`)}
                  aria-current={x.slug === text.slug ? 'page' : undefined}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    x.slug === text.slug
                      ? 'border-transparent bg-navy-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t('library.part', { n: x.part ?? '?' })}
                </button>
              ))}
            </div>
          </section>
        )}

        {text.related.length > 0 && (
          <section>
            <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('library.readNext')}
            </p>
            <div className="space-y-2">
              {text.related.map(r => {
                const RIcon = KIND_ICON[r.kind] ?? BookOpen
                return (
                  <button key={r.id} onClick={() => navigate(`/library/${r.slug}`)}
                    className="card flex w-full items-center gap-3 p-3 text-left hover:border-slate-300">
                    <RIcon size={15} className="flex-none text-amber-700" />
                    <span className="min-w-0 flex-1 truncate text-sm text-navy-900">{r.title}</span>
                    <ChevronRight size={15} className="flex-none text-slate-300" />
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
