import {
  BookOpen, Flame, FileText, Feather, Landmark, ListChecks, Mic, Music, ScrollText, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TFunction } from 'i18next'

/**
 * Genre → icon.
 *
 * Deliberately distinct glyphs rather than a book for everything: in a list of
 * twenty rows the icon is the only thing a reader can scan at a glance, and
 * twenty identical icons carry no information at all.
 *
 * Keyed by the `kind` CHECK values in migration 053. An unknown genre falls
 * back to BookOpen at the call site rather than throwing — a new genre added
 * to the API must not blank the list before the web app ships.
 */
export const KIND_ICON: Record<string, LucideIcon> = {
  puja: Flame,
  stotra: Sparkles,
  paath: ScrollText,
  aarti: Flame,
  bhajan: Music,
  vidhan: Landmark,
  pravachan: Mic,
  article: FileText,
  procedure: ListChecks,
  swadhyay: Feather,
  other: BookOpen,
}

/**
 * The reader-facing name of a genre.
 *
 * Translated, but falling back to the raw value rather than to a missing-key
 * placeholder: these are Sanskrit-derived words that a Jain reader recognises
 * untranslated, so "vidhan" is a far better failure than "library.kind.vidhan".
 */
export function kindLabel(t: TFunction, kind: string): string {
  const key = `library.kind.${kind}`
  const label = t(key)
  return label === key ? kind : label
}
