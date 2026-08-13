/**
 * Ascetic ranks, posts and sects — mirrors `apps/sant-api/src/profiles/ascetic.ts`
 * and `apps/sant-web/src/lib/ascetic.ts`.
 *
 * The API resolves `type_display` / `pad_display` on every response, so prefer
 * those. These constants exist for the FILTER pickers, which have to render
 * options before any row has been fetched.
 */

export const ASCETIC_TYPES = [
  { value: 'muni', title: 'Maharaj Ji', rank: 'Muni Shri' },
  { value: 'aryika', title: 'Mataji', rank: 'Aryika Shri' },
  { value: 'kshullak', title: 'Kshullak Ji', rank: 'Kshullak Shri' },
  { value: 'kshullika', title: 'Kshullika Ji', rank: 'Kshullika Shri' },
  { value: 'ailak', title: 'Ailak Ji', rank: 'Ailak Shri' },
] as const

/**
 * Posts, distinct from ranks (migration 039). An Acharya is a Muni who leads a
 * sangh — he does not stop being a Muni — so this never replaces `type`.
 * 'none' is excluded here: it is a valid stored value but never a filter.
 */
export const PADS = [
  { value: 'acharya', label: 'Acharya' },
  { value: 'elacharya', label: 'Elacharya' },
  { value: 'upadhyaya', label: 'Upadhyaya' },
  { value: 'ganini', label: 'Ganini' },
] as const

export const SECTS = [
  { value: 'digambar', label: 'Digambar' },
  { value: 'shwetambar', label: 'Shwetambar' },
] as const

/** Falls back to the raw value so an unknown rank never renders blank. */
export function asceticTitle(type?: string | null): string {
  if (!type) return ''
  return ASCETIC_TYPES.find(t => t.value === type)?.title ?? type
}

export function asceticRank(type?: string | null): string {
  if (!type) return ''
  return ASCETIC_TYPES.find(t => t.value === type)?.rank ?? type
}

export function padLabel(pad?: string | null): string {
  if (!pad || pad === 'none') return ''
  return PADS.find(p => p.value === pad)?.label ?? pad
}

export function sectKey(sect?: string | null): 'digambar' | 'shwetambar' | null {
  const s = (sect ?? '').toLowerCase().trim()
  if (!s) return null
  if (s.startsWith('digamb')) return 'digambar'
  if (s.startsWith('shwetamb') || s.startsWith('shvetamb') || s.startsWith('svetamb')) {
    return 'shwetambar'
  }
  return null
}

export function sectLabel(sect?: string | null): string {
  if (!sect) return ''
  return SECTS.find(s => s.value === sectKey(sect))?.label ?? sect
}

/**
 * The name as it should be read: post, then honorific-bearing name.
 * "Acharya Shri Vidyasagar Ji Maharaj" is built from three stored fields, and
 * every screen that hand-assembles it gets a different answer.
 */
export function santDisplayName(p: {
  name: string
  pad?: string | null
  pad_display?: string | null
}): string {
  const pad = p.pad_display ?? padLabel(p.pad)
  return pad ? `${pad} ${p.name}` : p.name
}

export const EVENT_TYPES = [
  { value: 'pravachan', label: 'Pravachan' },
  { value: 'panchkalyanak', label: 'Panchkalyanak' },
  { value: 'pratishtha', label: 'Pratishtha' },
  { value: 'diksha', label: 'Diksha' },
  { value: 'vidhan', label: 'Vidhan' },
  { value: 'shibir', label: 'Shibir' },
  { value: 'chaturmas_sthapana', label: 'Chaturmas Sthapana' },
  { value: 'other', label: 'Other' },
] as const

export function eventTypeLabel(type?: string | null): string {
  if (!type) return ''
  return EVENT_TYPES.find(t => t.value === type)?.label ?? type
}
