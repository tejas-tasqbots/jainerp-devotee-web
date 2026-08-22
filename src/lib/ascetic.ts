/**
 * Ascetic ranks, posts and sects — mirrors `apps/sant-api/src/profiles/ascetic.ts`
 * and `apps/sant-web/src/lib/ascetic.ts`.
 *
 * The API resolves `type_display` / `pad_display` on every response, so prefer
 * those. These constants exist for the FILTER pickers, which have to render
 * options before any row has been fetched.
 */

/**
 * TWO GAPS CLOSED BY MIGRATION 044.
 *
 *   1. The Shwetambar ranks were missing here. Migration 040 added `sadhu` and
 *      `sadhvi` to the database and to sant-api, but not to this copy — so the
 *      rank filter never offered them, and a Sadhvi's row fell back to the raw
 *      column value where a Digambara one read "Mataji".
 *   2. Nothing was translated. This app renders in five languages and still
 *      printed "Maharaj Ji · Digambar" in Latin letters beside a Devanagari
 *      name. Every label now carries its Devanagari form and the caller passes
 *      the active language.
 */
export const ASCETIC_TYPES = [
  { value: 'muni', title: 'Maharaj Ji', titleHi: 'महाराज जी', rank: 'Muni Shri', rankHi: 'मुनि श्री' },
  { value: 'aryika', title: 'Mataji', titleHi: 'माताजी', rank: 'Aryika Shri', rankHi: 'आर्यिका श्री' },
  { value: 'kshullak', title: 'Kshullak Ji', titleHi: 'क्षुल्लक जी', rank: 'Kshullak Shri', rankHi: 'क्षुल्लक श्री' },
  { value: 'kshullika', title: 'Kshullika Ji', titleHi: 'क्षुल्लिका जी', rank: 'Kshullika Shri', rankHi: 'क्षुल्लिका श्री' },
  { value: 'ailak', title: 'Ailak Ji', titleHi: 'ऐलक जी', rank: 'Ailak Shri', rankHi: 'ऐलक श्री' },
  { value: 'sadhu', title: 'Maharaj Saheb', titleHi: 'महाराज साहेब', rank: 'Sadhu Shri', rankHi: 'साधु श्री' },
  { value: 'sadhvi', title: 'Sadhviji', titleHi: 'साध्वीजी', rank: 'Sadhvi Shri', rankHi: 'साध्वी श्री' },
] as const

/**
 * Posts, distinct from ranks (migration 039, widened by 044). An Acharya is a
 * Muni who leads a sangh — he does not stop being a Muni — so this never
 * replaces `type`. 'none' is excluded here: it is a valid stored value but
 * never a filter.
 *
 * The Shwetambar half arrived with 044; before that a Panyas, Gani, Pravartak,
 * Pravartini, Mahattara or Sadhvi Pramukha had no post to be filtered by.
 */
export const PADS = [
  { value: 'acharya', label: 'Acharya', labelHi: 'आचार्य' },
  { value: 'upadhyaya', label: 'Upadhyaya', labelHi: 'उपाध्याय' },
  { value: 'elacharya', label: 'Elacharya', labelHi: 'ऐलाचार्य' },
  { value: 'ganini', label: 'Ganini', labelHi: 'गणिनी' },
  { value: 'bhattarak', label: 'Bhattarak', labelHi: 'भट्टारक' },
  { value: 'panyas', label: 'Panyas', labelHi: 'पंन्यास' },
  { value: 'gani', label: 'Gani', labelHi: 'गणि' },
  { value: 'pravartak', label: 'Pravartak', labelHi: 'प्रवर्तक' },
  { value: 'pravartini', label: 'Pravartini', labelHi: 'प्रवर्तिनी' },
  { value: 'mahattara', label: 'Mahattara', labelHi: 'महत्तरा' },
  { value: 'sadhvi_pramukha', label: 'Sadhvi Pramukha', labelHi: 'साध्वी प्रमुखा' },
] as const

export const SECTS = [
  { value: 'digambar', label: 'Digambar', labelHi: 'दिगंबर' },
  { value: 'shwetambar', label: 'Shwetambar', labelHi: 'श्वेतांबर' },
] as const

/** Falls back to the raw value so an unknown rank never renders blank. */
export function asceticTitle(type?: string | null, lang?: string): string {
  if (!type) return ''
  const f = ASCETIC_TYPES.find(t => t.value === type)
  if (!f) return type
  return lang === 'hi' ? f.titleHi : f.title
}

export function asceticRank(type?: string | null, lang?: string): string {
  if (!type) return ''
  const f = ASCETIC_TYPES.find(t => t.value === type)
  if (!f) return type
  return lang === 'hi' ? f.rankHi : f.rank
}

export function padLabel(pad?: string | null, lang?: string): string {
  if (!pad || pad === 'none') return ''
  const f = PADS.find(p => p.value === pad)
  if (!f) return pad
  return lang === 'hi' ? f.labelHi : f.label
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

export function sectLabel(sect?: string | null, lang?: string): string {
  if (!sect) return ''
  const f = SECTS.find(s => s.value === sectKey(sect))
  if (!f) return sect
  return lang === 'hi' ? f.labelHi : f.label
}

/**
 * The ascetic's name in the reader's script (migration 044).
 *
 * Falls back rather than blanking: a profile curated only in Devanagari must
 * still show something to a reader in English, and vice versa. `name` — the
 * pre-044 single column — is the last resort and is never empty.
 */
export function nameFor(
  p: { name?: string | null; name_en?: string | null; name_hi?: string | null } | null | undefined,
  lang?: string,
): string {
  if (!p) return ''
  const hi = (p.name_hi ?? '').trim()
  const en = (p.name_en ?? '').trim()
  const legacy = (p.name ?? '').trim()
  if (lang === 'hi') return hi || en || legacy
  return en || legacy || hi
}

/**
 * The name in the OTHER script, when the profile carries one and it differs.
 *
 * Shown as a secondary line. A devotee who knows an ascetic by their Devanagari
 * name and one who knows the transliteration are looking for the same person;
 * showing both is what makes a search result recognisable to either of them.
 * Empty when the two are identical — printing the same string twice reads as a
 * rendering bug, not as helpfulness.
 */
export function altNameFor(
  p: { name?: string | null; name_en?: string | null; name_hi?: string | null } | null | undefined,
  lang?: string,
): string {
  if (!p) return ''
  const primary = nameFor(p, lang)
  const other = lang === 'hi' ? (p.name_en ?? '').trim() : (p.name_hi ?? '').trim()
  return other && other !== primary ? other : ''
}

/**
 * The name as it should be read: post, then honorific-bearing name.
 * "Acharya Shri Vidyasagar Ji Maharaj" is built from three stored fields, and
 * every screen that hand-assembles it gets a different answer.
 */
export function santDisplayName(
  p: {
    name: string
    name_en?: string | null
    name_hi?: string | null
    pad?: string | null
    pad_display?: string | null
    pad_display_hi?: string | null
  },
  lang?: string,
): string {
  // The API resolves both scripts of the post; prefer whichever matches the
  // reader, and fall back to the local table only for a value it did not send.
  const pad = (lang === 'hi' ? p.pad_display_hi : p.pad_display) ?? padLabel(p.pad, lang)
  const name = nameFor(p, lang)
  if (!pad) return name
  // Real sant lists write the post INTO the name — "Acharya Vidyasagar Ji" is
  // how it appears on every printed directory — and `pad` records the same fact
  // as a filterable column. Prefixing unconditionally rendered "Acharya Acharya
  // Vidyasagar Ji", which reads as a bug to a devotee and would appear on every
  // imported row.
  return alreadyPrefixed(name, pad) ? name : `${pad} ${name}`
}

/** Case- and space-insensitive "does this name already open with that word?". */
function alreadyPrefixed(name: string, pad: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ')
  const p = pad.trim().toLowerCase().replace(/\s+/g, ' ')
  return !!p && (n === p || n.startsWith(`${p} `))
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
