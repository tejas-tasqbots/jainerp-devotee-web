/**
 * Tradition (sampradaya) scoping on the client.
 *
 * The API scopes every discovery list to the devotee's own sampradaya unless
 * the request says `traditions=all`. This holds the devotee's choice of which
 * of those two they want, and the labels for rendering it.
 *
 * The choice is **shared across screens and remembered**: someone who switched
 * to "All traditions" to find a temple in another tradition has not asked to do
 * that again on the sant list and again after every reload. It is a browsing
 * preference, not a filter belonging to one page — the same reason the API
 * takes it per request rather than storing it on the profile.
 *
 * Mirrors `sect-scope.util.ts` in devotee-api (`meta.sect_scope`).
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sectKey, sectLabel } from './ascetic'

export type TraditionScope = 'mine' | 'all'

/** `meta.sect_scope` — what the server actually applied to the list it sent. */
export interface SectScopeMeta {
  scope: TraditionScope
  /** The devotee's own sampradaya, or null when they never recorded one. */
  viewer_sect: string | null
  /** The sect the list was scoped to; null means nothing was scoped out. */
  applied: string | null
}

const STORAGE_KEY = 'devotee_traditions'

/** Everything not literally 'all' is 'mine', matching the server's parser. */
function readStored(): TraditionScope {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'all' ? 'all' : 'mine'
  } catch {
    return 'mine' // privacy mode — the default is the safe one either way
  }
}

/**
 * The current scope plus a setter that persists it.
 *
 * `storage` events keep two open tabs in step; without that, switching on one
 * and navigating on the other shows two different answers to the same question.
 */
export function useTraditionScope(): [TraditionScope, (next: TraditionScope) => void] {
  const [scope, setScopeState] = useState<TraditionScope>(readStored)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setScopeState(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setScope = useCallback((next: TraditionScope) => {
    setScopeState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  return [scope, setScope]
}

/**
 * Only send the parameter when it changes the answer.
 *
 * `traditions=mine` is the server default, so leaving it off keeps request URLs
 * (and any cache keyed on them) identical to what every other client sends.
 */
export function traditionsParam(scope: TraditionScope): { traditions?: 'all' } {
  return scope === 'all' ? { traditions: 'all' } : {}
}

/**
 * A localised sampradaya label: "Digambar" / "दिगंबर" / "દિગંબર".
 *
 * Falls back to the English constant, then to the raw stored value, so an
 * un-translated or hand-typed sect renders as itself rather than as a blank —
 * `sant_profiles.sect` predates the CHECK constraint and holds free text.
 */
export function useSectLabel(): (sect?: string | null) => string {
  const { t } = useTranslation()
  return useCallback(
    (sect?: string | null) => {
      const key = sectKey(sect)
      if (!key) return sect ?? ''
      return t(`ui.sect_${key}`, { defaultValue: sectLabel(sect) })
    },
    [t],
  )
}
