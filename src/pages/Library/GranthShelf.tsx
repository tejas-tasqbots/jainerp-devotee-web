import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookMarked, BookOpen, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { EmptyState, SkeletonList } from '../../components/kit'
import type { Granth, GranthFacets } from '../../types'
import { GranthReader } from './GranthReader'

/**
 * The granth shelf — several thousand Digambar Jain books.
 *
 * ── WHY THESE ROWS LEAVE THE APP ────────────────────────────────────────────
 * The app holds the CATALOGUE, not the files. They are scans belonging to
 * other people, published for download at digjainwiki and credited there to
 * three named contributors, so a row here opens the source rather than
 * pretending to be a reader. Every row therefore carries the external-link
 * mark and opens in a new tab: a devotee should know before they tap that they
 * are leaving, and should not lose their place in the shelf when they do.
 *
 * ── WHY AUTHOR IS THE PRIMARY FILTER, NOT SHELF ─────────────────────────────
 * The Drive's own folders are filing codes — "100-D-Granths-n-Books" — except
 * where they name an ascetic. Authors are what a devotee actually browses by
 * ("everything Gyanmati Mataji wrote"), so the author chips lead and the shelf
 * chips sit behind the filter panel.
 */
const PAGE_SIZE = 20

export function GranthShelf() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [params, setParams] = useSearchParams()

  const query = params.get('q') ?? ''
  const author = params.get('author') ?? ''
  const shelf = params.get('shelf') ?? ''
  const sort = params.get('sort') ?? 'title'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [draft, setDraft] = useState(query)
  const [showFilters, setShowFilters] = useState(false)
  const [facets, setFacets] = useState<GranthFacets | null>(null)

  // Derived, not stored: "what I am holding is not what was asked for". Keeps
  // the spinner and the data from ever disagreeing.
  const key = JSON.stringify([query, author, shelf, sort, page])
  const [result, setResult] = useState<{ key: string; rows: Granth[]; total: number } | null>(null)
  const loading = result?.key !== key
  const rows = result?.rows ?? []
  const total = result?.total ?? 0

  // Adjusted during render rather than in an effect, so a query arriving from
  // the back button never paints the stale text first.
  const [lastQuery, setLastQuery] = useState(query)
  // The book being read in place, or null. Not a route: the shelf's
  // scroll position and filters are the thing a reader comes back to.
  const [reading, setReading] = useState<Granth | null>(null)
  if (query !== lastQuery) { setLastQuery(query); setDraft(query) }

  function setFilter(next: Record<string, string>) {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v)
      else merged.delete(k)
    }
    merged.set('tab', 'books')
    if (!('page' in next)) merged.delete('page')
    setParams(merged, { replace: false })
  }
  const toggle = (k: string, v: string) =>
    setFilter({ [k]: params.get(k) === v ? '' : v })

  useEffect(() => {
    if (draft === query) return
    const handle = setTimeout(() => setFilter({ q: draft }), 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  useEffect(() => {
    let live = true
    api.get('/granths', { params: { q: query, author, shelf, sort, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (live) setResult({ key, rows: data.data ?? [], total: data.meta?.total ?? 0 })
      })
      .catch(() => { if (live) setResult({ key, rows: [], total: 0 }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    api.get('/granths/facets', { params: { q: query, author, shelf } })
      .then(({ data }) => setFacets(data.data ?? null))
      .catch(() => setFacets(null))
  }, [query, author, shelf])

  const activeCount = [author, shelf].filter(Boolean).length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function goPage(next: number) {
    setFilter({ page: String(Math.min(pages, Math.max(1, next))) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <p className="px-4 pt-3 text-xs text-slate-400">
        {t('library.countBooks', { count: total })}
      </p>

      <div className="p-4 pt-2 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={t('library.searchBooksPlaceholder')}
            className="form-input pl-9"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={t('library.searchBooksPlaceholder')}
          />
        </div>

        {/* Authors lead. Scrollable rather than wrapped so the books stay above
            the fold on a phone. */}
        {facets && facets.authors.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex w-max gap-2">
              {facets.authors.map(a => (
                <button
                  key={a.value}
                  onClick={() => toggle('author', a.value)}
                  aria-pressed={author === a.value}
                  className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    author === a.value
                      ? 'border-transparent bg-brand-red text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {a.value}
                  <span className="opacity-60">{a.count}</span>
                </button>
              ))}
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
            className="form-input h-auto w-auto py-1.5 text-xs"
            value={sort}
            onChange={e => setFilter({ sort: e.target.value })}
            aria-label={t('library.sortBy')}
          >
            <option value="title">{t('library.sortTitle')}</option>
            <option value="author">{t('library.composer')}</option>
          </select>
        </div>

        {(author || shelf) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[['author', author], ['shelf', shelf]].filter(([, v]) => v).map(([k, v]) => (
              <button key={k} onClick={() => setFilter({ [k as string]: '' })}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
                {v}
                <X size={11} className="text-slate-400" />
              </button>
            ))}
            <button onClick={() => setParams(new URLSearchParams({ tab: 'books' }))}
              className="px-1 text-[11px] text-brand-red underline underline-offset-2">
              {t('sant.clearFilters')}
            </button>
          </div>
        )}

        {showFilters && facets && facets.shelves.length > 0 && (
          <div className="card p-3">
            <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('library.collection')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {facets.shelves.map(sh => (
                <button
                  key={sh.value}
                  onClick={() => toggle('shelf', sh.value)}
                  aria-pressed={shelf === sh.value}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    shelf === sh.value
                      ? 'border-transparent bg-navy-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {sh.value} <span className="opacity-60">{sh.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonList rows={6} avatar={false} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title={t('library.emptyTitle')}
            hint={query || activeCount ? t('library.emptyFiltered') : t('library.emptyBooks')}
          />
        ) : (
          <div className="space-y-2">
            {rows.map(g => (
              // An anchor, not a button: this leaves the app, and a devotee is
              // entitled to the browser's own affordances — long-press, open in
              // a new tab, copy the link. `noopener` because the target is not
              // ours to trust with `window.opener`.
              // A BUTTON when the book can be read here, an anchor when it
              // cannot. The distinction is deliberate: an anchor promises the
              // browser's own affordances (long-press, open in a new tab) and
              // must keep that promise, so it is only used where the row really
              // does leave the app.
              <RowTag
                key={g.id}
                {...(g.reader_url
                  ? { as: 'button' as const, onClick: () => setReading(g) }
                  : {
                    as: 'a' as const,
                    href: g.download_url ?? '#',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
                className="card block w-full p-3 text-left transition-colors hover:border-slate-300"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                    <BookMarked size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-navy-900">
                      {(lang.startsWith('hi') && g.title_hi) || g.title}
                    </p>
                    {/* The other script's title, when there is one and it is not
                        already the one shown. */}
                    {g.title_hi && ((lang.startsWith('hi') && g.title_hi) || g.title) !== g.title_hi && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{g.title_hi}</p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                      {g.author && <span className="truncate">{g.author}</span>}
                      {g.sant_relation === 'about' && (
                        // Said out loud: a book ABOUT an ascetic must never read
                        // as a book BY them.
                        <span className="rounded bg-slate-100 px-1.5 py-px text-slate-600">
                          {t('library.aboutSant')}
                        </span>
                      )}
                    </p>
                  </div>
                  {g.reader_url
                    ? <BookOpen size={15} className="mt-1 flex-none text-slate-300" />
                    : <ExternalLink size={15} className="mt-1 flex-none text-slate-300" />}
                </div>
              </RowTag>
            ))}
          </div>
        )}

        {/* Said once, at the foot of the shelf rather than on every row.
            Which sentence depends on where the books on THIS page actually come
            from: while the mirror is filling in, a shelf can hold both, and
            promising "opens at source" for a book we now serve ourselves would
            be as wrong as the reverse. Credit for the scans is kept either way
            — it is owed to the contributors whether or not we hold the file. */}
        {rows.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-slate-400">
            {rows.every(g => g.mirrored)
              ? t('library.creditSource')
              : t('library.hostedAtSource')}
          </p>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => goPage(page - 1)} disabled={page === 1 || loading}
              className="btn-secondary px-3 py-1.5 text-xs">{t('sant.prevPage')}</button>
            <span className="text-xs text-slate-400">{t('sant.pageOf', { page, pages })}</span>
            <button onClick={() => goPage(page + 1)} disabled={page >= pages || loading}
              className="btn-secondary px-3 py-1.5 text-xs">{t('sant.nextPage')}</button>
          </div>
        )}
      </div>

      {reading?.reader_url && (
        <GranthReader
          title={reading.title}
          readerUrl={reading.reader_url}
          downloadUrl={reading.download_url}
          mirrored={reading.mirrored}
          onClose={() => setReading(null)}
        />
      )}
    </>
  )
}

/**
 * A row that is an `<a>` when it leaves the app and a `<button>` when it does
 * not. Written out rather than always using an anchor with a click handler:
 * an anchor advertises long-press, "open in a new tab" and a copyable URL, and
 * a row that opens a modal can honour none of those.
 */
function RowTag(
  props:
    | ({ as: 'a' } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ as: 'button' } & React.ButtonHTMLAttributes<HTMLButtonElement>),
) {
  if (props.as === 'a') {
    const { as: _a, ...rest } = props
    return <a {...rest} />
  }
  const { as: _b, ...rest } = props
  return <button type="button" {...rest} />
}
