import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { EmptyState, SkeletonList } from '../../components/kit'
import { KIND_ICON, kindLabel } from '../../lib/library'
import { GranthShelf } from './GranthShelf'
import type { LibraryFacets, LibraryText } from '../../types'

/**
 * The library — what a devotee actually opens the app to read.
 *
 * The directory answers "who are the ascetics and where are they". Until now
 * nothing answered "give me the Nitya Puja", which is the daily reason to open
 * a Jain app at all: 140 pujas, stotras, paath, aartis and articles.
 *
 * ── WHY THE GENRE ROW IS THE PRIMARY CONTROL ────────────────────────────────
 * A reader arrives knowing the KIND of thing they want — an aarti, today's
 * puja — far more often than its title. So the genre chips sit above the fold
 * and carry counts, and search is the secondary path rather than the only one.
 * The source's finer taxonomy (Nitya Puja, Bhudhar Shatak, Diwali Puja) is a
 * second row behind "More filters", because 28 shelves shown at once is not a
 * filter row, it is a wall.
 *
 * ── WHY THE URL CARRIES THE FILTERS ─────────────────────────────────────────
 * A text is something people send each other. `?kind=aarti` in the address bar
 * means a shelf can be shared and the back button returns to it, which matters
 * far more here than on a directory nobody links to.
 */
const PAGE_SIZE = 20


/**
 * The library shell — two shelves behind one heading.
 *
 * TEXTS are held here and can be read on the screen; BOOKS are a catalogue of
 * PDFs that live at the source and open there. Keeping them in one list would
 * mean a row whose behaviour on tap — read, or leave the app — you cannot
 * predict, and a filter row where half the controls are inert for half the
 * rows. Two tabs say which is which before you touch anything.
 */
export function LibraryPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'books' ? 'books' : 'texts'

  /**
   * Switching tabs clears the filters.
   *
   * They do not carry over: `kind=aarti` means nothing to a shelf of granths,
   * and leaving it in the URL would show an empty Books tab with an active
   * filter chip the reader never set.
   */
  function go(next: 'texts' | 'books') {
    const p = new URLSearchParams()
    if (next === 'books') p.set('tab', 'books')
    setParams(p)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <h1 className="page-title">{t('titles.library')}</h1>
      </div>

      <div className="border-b border-slate-200 bg-white px-4">
        <div className="flex gap-1" role="tablist">
          {(['texts', 'books'] as const).map(id => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => go(id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === id
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t(`library.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'books' ? <GranthShelf /> : <TextShelf />}
    </div>
  )
}

function TextShelf() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  // The URL is the state. Reading straight from it (rather than mirroring into
  // useState) is what makes the back button work: a browser history entry
  // restores the whole filter set for free.
  const query = params.get('q') ?? ''
  const kind = params.get('kind') ?? ''
  const category = params.get('category') ?? ''
  const script = params.get('script') ?? ''
  const author = params.get('author') ?? ''
  const sort = params.get('sort') ?? 'title'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [draft, setDraft] = useState(query)
  const [showFilters, setShowFilters] = useState(false)
  const [facets, setFacets] = useState<LibraryFacets | null>(null)

  /**
   * One key for the whole filter set, and the result tagged with the key it
   * answers.
   *
   * `loading` is then DERIVED — "what I am holding is not what was asked for" —
   * rather than a second piece of state to flip on before every fetch. That
   * removes the flip (a setState inside an effect body, which cascades a
   * render) and, more usefully, removes the way the two can disagree: a
   * rejected request that forgets to clear the flag leaves a spinner forever.
   */
  const key = JSON.stringify([query, kind, category, script, author, sort, page])
  const [result, setResult] = useState<{ key: string; rows: LibraryText[]; total: number } | null>(null)
  const loading = result?.key !== key
  const rows = result?.rows ?? []
  const total = result?.total ?? 0

  /**
   * Keep the search box in step with a query that arrived from elsewhere — the
   * back button, or a link into a shelf.
   *
   * Adjusted DURING RENDER rather than in an effect. React documents this as
   * the way to reset state when an input changes: the component re-renders
   * immediately with the new value and the browser never paints the stale one,
   * where an effect would paint the old text first and correct it after.
   */
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setDraft(query)
  }

  /**
   * Write one filter into the URL.
   *
   * Every filter change resets to page one. Without it a reader on page 4 who
   * picks a genre with two texts gets an empty screen and no clue why — the
   * filter is right, the page is simply past the end of it.
   */
  function setFilter(next: Record<string, string>) {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v)
      else merged.delete(k)
    }
    if (!('page' in next)) merged.delete('page')
    setParams(merged, { replace: false })
  }

  /** Toggle behaviour on the chips: tapping the active one clears it. */
  const toggle = (k: string, v: string) =>
    setFilter({ [k]: params.get(k) === v ? '' : v })

  // The search box is debounced into the URL rather than fired per keystroke:
  // a history entry per character would make the back button useless.
  useEffect(() => {
    if (draft === query) return
    const handle = setTimeout(() => setFilter({ q: draft }), 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  useEffect(() => {
    let live = true
    api.get('/library', {
      params: { q: query, kind, category, script, author, sort, page, limit: PAGE_SIZE },
    })
      // Tagged with the key it answers, so a slow response for an abandoned
      // filter cannot overwrite a newer one.
      .then(({ data }) => {
        if (live) setResult({ key, rows: data.data ?? [], total: data.meta?.total ?? 0 })
      })
      .catch(() => { if (live) setResult({ key, rows: [], total: 0 }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    api.get('/library/facets', { params: { q: query, kind, category, script, author } })
      .then(({ data }) => setFacets(data.data ?? null))
      .catch(() => setFacets(null))
  }, [query, kind, category, script, author])

  const activeCount = [kind, category, script, author].filter(Boolean).length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const activeChips = useMemo(() => {
    const out: { key: string; label: string }[] = []
    if (kind) out.push({ key: 'kind', label: kindLabel(t, kind) })
    if (category) {
      const c = facets?.categories?.find(x => x.value === category)
      out.push({ key: 'category', label: c?.label ?? category })
    }
    if (script) out.push({ key: 'script', label: t(`library.script.${script}`) })
    if (author) out.push({ key: 'author', label: author })
    return out
  }, [kind, category, script, author, facets, t])

  function goPage(next: number) {
    setFilter({ page: String(Math.min(pages, Math.max(1, next))) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <p className="px-4 pt-3 text-xs text-slate-400">
        {t('library.countTexts', { count: total })}
      </p>
      <div className="p-4 pt-2 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={t('library.searchPlaceholder')}
            className="form-input pl-9"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={t('library.searchPlaceholder')}
          />
        </div>

        {/* ── genre row ────────────────────────────────────────────────────
            Horizontally scrollable rather than wrapped to three lines: on a
            phone a wrapped chip row pushes the results themselves below the
            fold, and the reader cannot see that there are any. */}
        {facets && facets.kinds.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex w-max gap-2">
              <ChipButton active={!kind} onClick={() => setFilter({ kind: '' })}>
                {t('library.allKinds')}
              </ChipButton>
              {facets.kinds.map(k => {
                const Icon = KIND_ICON[k.value] ?? BookOpen
                return (
                  <ChipButton key={k.value} active={kind === k.value}
                    onClick={() => toggle('kind', k.value)}>
                    <Icon size={13} className="flex-none" />
                    {kindLabel(t, k.value)}
                    <span className="opacity-60">{k.count}</span>
                  </ChipButton>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={14} />
            {t('sant.filters')}
            {activeCount > 0 && (
              <span className="badge badge-red text-[9px] ml-0.5">{activeCount}</span>
            )}
          </button>
          <select
            className="form-input h-auto py-1.5 text-xs w-auto"
            value={sort}
            onChange={e => setFilter({ sort: e.target.value })}
            aria-label={t('library.sortBy')}
          >
            <option value="title">{t('library.sortTitle')}</option>
            <option value="shortest">{t('library.sortShortest')}</option>
            <option value="longest">{t('library.sortLongest')}</option>
            <option value="recent">{t('library.sortRecent')}</option>
          </select>
        </div>

        {/* Active filters as removable chips. Without these a reader who set a
            filter, scrolled, and forgot has no way to see why the shelf is
            nearly empty except by re-opening the filter panel. */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map(c => (
              <button key={c.key} onClick={() => setFilter({ [c.key]: '' })}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
                {c.label}
                <X size={11} className="text-slate-400" />
              </button>
            ))}
            <button onClick={() => setParams(new URLSearchParams(), { replace: false })}
              className="text-[11px] text-brand-red underline underline-offset-2 px-1">
              {t('sant.clearFilters')}
            </button>
          </div>
        )}

        {showFilters && facets && (
          <div className="card p-3 space-y-3">
            <FacetGroup
              title={t('library.collection')}
              options={facets.categories.map(c => ({ value: c.value, label: c.label, count: c.count }))}
              value={category}
              onPick={v => toggle('category', v)}
            />
            {facets.scripts.length > 1 && (
              <FacetGroup
                title={t('library.language')}
                options={facets.scripts.map(s => ({
                  value: s.value, label: t(`library.script.${s.value}`), count: s.count,
                }))}
                value={script}
                onPick={v => toggle('script', v)}
              />
            )}
            {facets.authors.length > 0 && (
              <FacetGroup
                title={t('library.composer')}
                options={facets.authors.map(a => ({ value: a.value, label: a.value, count: a.count }))}
                value={author}
                onPick={v => toggle('author', v)}
              />
            )}
          </div>
        )}

        {loading ? (
          <SkeletonList rows={6} avatar={false} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('library.emptyTitle')}
            hint={query || activeCount ? t('library.emptyFiltered') : t('library.emptySubtitle')}
          />
        ) : (
          <div className="space-y-2">
            {rows.map(text => {
              const Icon = KIND_ICON[text.kind] ?? BookOpen
              return (
                <button
                  key={text.id}
                  onClick={() => navigate(`/library/${text.slug}`)}
                  className="card w-full p-3 text-left hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* The Devanagari title leads for a Hindi reader and the
                          transliteration for everyone else, rather than one
                          fixed order — most of these titles carry both, and
                          which half is useful depends entirely on the reader. */}
                      {/* A collapsed series is labelled by the WORK, not by
                          whichever part happens to sort first — "Muni Aahar
                          Procedure", not "1. Muni Aahar Procedure". */}
                      <p className="text-sm font-semibold text-navy-900 leading-snug">
                        {text.part_count > 1
                          ? text.series
                          : (lang.startsWith('hi') && text.title_hi) || text.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                        <span>
                          {[kindLabel(t, text.kind), text.particulars, text.author]
                            .filter(Boolean).join(' · ')}
                        </span>
                        {text.part_count > 1 && (
                          <span className="rounded bg-slate-100 px-1.5 py-px font-medium text-slate-600">
                            {t('library.partCount', { count: text.part_count })}
                          </span>
                        )}
                      </p>
                      {text.preview && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {text.preview}
                        </p>
                      )}
                      {text.sant_name && (
                        <p className="mt-1 truncate text-[11px] text-amber-700">
                          {(lang.startsWith('hi') && text.sant_name_hi) || text.sant_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="mt-1 flex-none text-slate-300" />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Rendered outside the loading branch so the pager does not vanish and
            re-appear on every page change — that jump is what makes a
            paginated list feel broken even when it works. */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => goPage(page - 1)} disabled={page === 1 || loading}
              className="btn-secondary text-xs px-3 py-1.5">{t('sant.prevPage')}</button>
            <span className="text-xs text-slate-400">
              {t('sant.pageOf', { page, pages })}
            </span>
            <button onClick={() => goPage(page + 1)} disabled={page >= pages || loading}
              className="btn-secondary text-xs px-3 py-1.5">{t('sant.nextPage')}</button>
          </div>
        )}
      </div>
    </>
  )
}

function ChipButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-transparent bg-brand-red text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * One block of the filter panel.
 *
 * Capped at twelve with a "show all" — the collection facet has 28 entries and
 * a panel that opens to a full screen of checkboxes is a worse control than
 * the search box beside it.
 */
function FacetGroup({ title, options, value, onPick }: {
  title: string
  options: { value: string; label: string; count: number | string }[]
  value: string
  onPick: (v: string) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (options.length === 0) return null
  const shown = expanded ? options : options.slice(0, 12)
  return (
    <div>
      <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map(o => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            aria-pressed={value === o.value}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              value === o.value
                ? 'border-transparent bg-navy-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {o.label} <span className="opacity-60">{o.count}</span>
          </button>
        ))}
        {options.length > 12 && (
          <button onClick={() => setExpanded(v => !v)}
            className="px-2 py-1 text-[11px] text-brand-red underline underline-offset-2">
            {expanded ? t('library.showFewer') : t('library.showAll', { count: options.length })}
          </button>
        )}
      </div>
    </div>
  )
}
