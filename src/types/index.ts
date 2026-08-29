import type { SectScopeMeta } from '../lib/traditions'

export interface Transaction {
  id: string
  tenant: { id: string; name: string }
  txn_type: 'donation' | 'seva' | 'room' | 'boli'
  category_or_service: string
  amount_paise: number
  txn_date: string
  fy: string
  is_80g_eligible: boolean
  status: string
  receipt_url?: string | null
  source_table?: string | null
  source_row_id?: string | null
  receipt_available?: boolean
  unsynced?: boolean
}

export interface TransactionSummary {
  fy: string
  total_paise: number
  eligible_80g_paise: number
  txn_count: number
  by_temple: {
    tenant_id: string
    temple_name: string
    total_paise: number
    txn_count: number
    eligible_80g_paise: number
  }[]
}

export interface Boli {
  boli_id: string
  id: string
  temple: string
  temple_id: string
  temple_slug: string
  description: string
  boli_type: string
  pledged_amount_paise: number
  paid_amount_paise: number
  outstanding_paise: number
  status: string
  pledge_date: string
  due_date: string
  pay_link?: string
  /** False while Razorpay isn't configured on the server — hide Pay Now rather than let the devotee hit a mocked payment. */
  payment_enabled?: boolean
}

export interface Temple {
  id: string
  slug: string
  name: string
  temple_type: string
  /**
   * Sampradaya (migration 032). Null for a Jain trust that never recorded one,
   * and for every non-Jain trust — read `sect_applicable` on the detail
   * response to tell those apart. Renders as a badge; never used to hide a row.
   */
  sect?: string | null
  sub_sect?: string | null
  city: string
  state: string
  address?: Record<string, string>
  registration_80g?: string
  custom_domain?: string
  global_sync_enabled?: boolean
  lat?: number | string | null
  lng?: number | string | null
  maharaj?: { id: string; name: string; type: string; samuday?: string; photo_url?: string; has_photo?: boolean; note?: string }[]
  /**
   * Modules this trust runs (migration 031). The portal renders its actions
   * from this — offering "Book a room" for a trust with no Dharamshala module
   * is a link straight to a dead end. Empty/absent means "not known", which is
   * treated as "show everything" rather than hiding real features.
   */
  modules?: string[]
  /** Public profile (migration 034) — what a devotee reads before giving. */
  about?: string | null
  founded_year?: number | null
  main_deity?: string | null
  darshan_timings?: string | null
  profile_languages?: string[]
  links?: { id: string; kind: string; label?: string | null; url: string }[]
  publications?: {
    id: string; title: string; kind: string; language?: string | null
    year?: number | null; publisher?: string | null; description?: string | null
    url?: string | null; has_cover?: boolean
  }[]
  /**
   * What the trust can actually give a devotee **today** — inventory, not
   * entitlement, and the two are different in a way users can see. A trust may
   * hold the `dharamshala` module and own no rooms; gating "Book a room" on the
   * module sent devotees to a search that could only answer "none free".
   *
   * Absent on an older API, which is why every read falls back to `modules`
   * rather than treating a missing block as "nothing here".
   */
  facilities?: {
    dharamshala?: { rooms: number; halls: number; bookable: boolean; from_paise: number | null }
    gaushala?: { cattle: number; sponsorable: boolean }
    prasad?: { items: number }
    seva?: { sevas: number; bookable: boolean }
    bhojanshala?: { runs: boolean }
  }
}

/** One dharamshala in the cross-temple stay search. */
export interface StayResult {
  tenant_id: string
  slug: string
  name: string
  temple_type: string
  sect: string | null
  city: string | null
  state: string | null
  area: string | null
  lat: number | null
  lng: number | null
  /** Only when the search carried coordinates. Kilometres, one decimal. */
  distance_km: number | null
  rooms_total: number | null
  rooms_available: number
  /** Cheapest nightly tariff, before GST. */
  from_paise: number | null
  sleeps_max: number | null
  nights: number | null
  /** from_paise × nights — the number devotees actually compare on. */
  from_total_paise: number | null
}

export interface StaySearchMeta {
  page: number
  limit: number
  total: number
  /** The shortlist was capped: say "refine your search", never imply this is all. */
  truncated: boolean
  searched: number
  from: string | null
  to: string | null
  nights: number | null
  persons: number
  sort: 'distance' | 'price' | 'name'
  near: { lat: number; lng: number; radius_km: number | null } | null
  /** Which sampradaya scope produced this list — see lib/traditions.ts. */
  sect_scope?: SectScopeMeta
}

export interface MaharajProfile {
  id: string
  /**
   * The canonical display name — what every reader falls back to. Migration 044
   * added the two per-script columns below; use `nameFor()` rather than reading
   * any of the three directly, so a profile curated in one script still renders
   * for a reader of the other.
   */
  name: string
  name_en?: string | null
  name_hi?: string | null
  /**
   * Canonical ascetic RANK, not the honorific — 'maharaj'/'mataji' were never
   * valid values (see doc-v2/Glossary_And_Naming.md). Render `type_display`,
   * which the API resolves from ascetic.ts.
   *
   * The Shwetambar pair arrived with migration 040 and was missing from this
   * union, so a Sadhvi's row was untypeable and fell through to the raw value.
   */
  type: 'muni' | 'aryika' | 'kshullak' | 'kshullika' | 'ailak' | 'sadhu' | 'sadhvi'
  /** Honorific for display: "Maharaj Ji", "Mataji", "Ailak Ji", … */
  type_display?: string
  /** The same in Devanagari. Both are sent; the client picks by locale. */
  type_display_hi?: string
  /** The formal rank: "Muni Shri", "Aryika Shri", … */
  rank_display?: string
  rank_display_hi?: string
  /**
   * POST held (migration 039, widened by 044) — not the rank. An Acharya is
   * still a Muni, which is why this is separate from `type`. 'none' is a real
   * answer, not a missing one.
   */
  pad?: 'acharya' | 'upadhyaya' | 'elacharya' | 'ganini' | 'bhattarak'
      | 'panyas' | 'gani' | 'pravartak' | 'pravartini' | 'mahattara' | 'sadhvi_pramukha'
      | 'none'
  /** "Acharya", "Upadhyaya", … Empty string when pad is 'none'. */
  pad_display?: string
  pad_display_hi?: string
  sect?: 'digambar' | 'shwetambar'
  sect_display?: string
  sect_display_hi?: string
  /**
   * Whether the ascetic has attained samadhi (migration 045). THIS, not
   * `samadhi_date`, is the state: most historical entries record the fact and
   * no date. A samadhistha profile stays fully in the directory — the record is
   * why it is kept — but has no sangh representative and no current whereabouts, and
   * the directory's `status` filter is built on this.
   */
  is_samadhistha?: boolean
  samuday: string
  /** Home/base city. */
  city?: string
  /**
   * Where they are now, denormalised from the current location row. Returned by
   * the list endpoint since migration 002 and never typed, so no screen showed
   * it — a directory that knows where someone is and prints their home city
   * instead is answering the wrong question.
   */
  current_city?: string | null
  /**
   * The state `current_city` is in — migration 046. Pair it with current_city
   * and NEVER with `state`, which is the home state: that pairing rendered
   * "Sangli, Jammu and Kashmir" for an ascetic based in J&K who is travelling
   * in Maharashtra.
   */
  current_state?: string | null
  // ── migration 048: the rest of what a profile page is for ──────────────
  /** The life in Hindi and in English. NOT translations of each other. */
  bio_hi?: string | null
  bio_en?: string | null
  sangh_text?: string | null
  chaturmas_text?: string | null
  updates_text?: string | null
  name_before_diksha?: string | null
  fathers_name?: string | null
  mothers_name?: string | null
  family_initiated?: string | null
  /** Vikram Samvat, as recorded. Never converted — it would be ~57 years out. */
  birth_date_indian?: string | null
  brahmacharya_year?: number | null
  brahmacharya_place?: string | null
  brahmacharya_guru?: string | null
  acharya_pad_date?: string | null
  acharya_pad_place?: string | null
  acharya_pad_by?: string | null
  sallekhana_place?: string | null
  cover_url?: string | null
  gallery_urls?: string[] | null
  source_references?: string | null
  source_credit?: string | null
  /**
   * The stages of initiation, earliest first. An ascetic may take kshullak,
   * then ailak, then muni — `diksha_date` holds only the first.
   */
  diksha_stages?: Array<{
    stage: string
    taken_on: string | null
    taken_year: number | null
    place: string | null
    guru_name: string | null
  }>

  /** Sangh membership (migration 047). */
  sangh_id?: string | null
  sangh_name?: string | null
  sangh_name_hi?: string | null
  /** One of this sangh's head ascetics. A sangh commonly has several. */
  is_sangh_head?: boolean
  /**
   * The sangh itself, with its other members — sent by `GET /sant/:id` only,
   * never by the list. This answers "who else travels with this Acharya",
   * which is the question the sangh model exists for.
   */
  sangh?: {
    id: string
    name_en: string
    name_hi: string | null
    parampara: string | null
    sect: string | null
    about: string | null
    members: SanghMember[]
  } | null
  /**
   * The teacher-lineage parsed out of `sangh_text`, or null when the source
   * wrote prose instead of a numbered list (1,098 of 2,407 profiles). Null
   * means "render the paragraph", not "something failed".
   */
  parampara?: ParamparaNode[] | null
  /** The life, parsed into paragraphs/list/provenance. Null = render the raw string. */
  bio_blocks?: BioBlock[] | null
  bio_blocks_hi?: BioBlock[] | null
  /** The varshayog table recovered from `chaturmas_text`; null = render prose. */
  chaturmas_years?: ChaturmasEntry[] | null
  chaturmas_blocks?: BioBlock[] | null
  updates_blocks?: BioBlock[] | null
  state?: string
  photo_url?: string
  /** Inline photo — detail endpoint only; lists send `has_photo` instead (see Images_And_Photos.md §6.3). */
  photo_base64?: string
  has_photo?: boolean
  bio?: string
  diksha_year?: number
  guru_name?: string
  /** Long-form public profile (migration 034). `bio` is the older one-liner. */
  about?: string | null
  diksha_place?: string | null
  education?: string | null
  /** Conferred titles — never the canonical `type` rank. */
  honours?: string | null
  lineage?: string | null
  /**
   * Anniversary dates (migration 039). Nullable: for most historical ascetics
   * only `diksha_year` is known, and a guessed day would be fabricated record.
   */
  birth_date?: string | null
  diksha_date?: string | null
  /** Non-null means the profile is historical — no current location is shown. */
  samadhi_date?: string | null
  /** The observed date in the Jain calendar, in words. */
  tithi_note?: string | null
  links?: { id: string; kind: string; label?: string | null; url: string }[]
  publications?: {
    id: string; title: string; kind: string; language?: string | null
    year?: number | null; publisher?: string | null; description?: string | null
    url?: string | null; has_cover?: boolean
  }[]
  /**
   * Texts filed under this ascetic (migration 053) — readable in the library,
   * unlike `publications`, which is a curator-entered bibliography of printed
   * books that may not exist here at all.
   */
  texts?: {
    id: string; slug: string; title: string; title_hi: string | null
    kind: string; script: string; particulars: string | null
    body_length: number | string
  }[]
  /**
   * Books linked to this ascetic (migration 056), kept apart by what the link
   * claims: `by` is authorship, `about` is a biography written of them. A
   * profile that lists the second under the first makes a false claim.
   */
  granths?: {
    by: SantGranthLink[]
    about: SantGranthLink[]
  }
  /** The wiki page this profile was collated from, for a reader to check. */
  source_url?: string | null
  languages?: string[]
  verified: boolean
  followers_count?: number
  is_following?: boolean
  current_location?: {
    place: string
    city: string
    state?: string
    from_date: string
    to_date: string
    lat?: number | string | null
    lng?: number | string | null
    chaturmas?: boolean
    notes?: string
  }
  /** Varshayog history — every chaturmas recorded against this profile. */
  chaturmas_history?: ChaturmasStay[]
  /** Upcoming public events. */
  events?: SantEvent[]
  /** Derived from the dates above — never stored as rows. */
  anniversaries?: SantAnniversary[]
  vihar_plan?: {
    id: string
    place: string
    city: string
    state: string
    expected_from: string
    expected_to: string
  }[]
  requirements?: {
    id: string
    type: string
    description: string
    needed_on: string
    city: string
    status: string
  }[]
  broadcasts?: {
    id: string
    title?: string
    message: string
    type: string
    link?: string
    created_at: string
  }[]
}

export interface FeedItem {
  id: string
  temple_name: string
  temple_id: string
  type: 'announcement' | 'event'
  title: string
  body?: string
  date: string
}

export interface Notification {
  id: string
  type?: string | null
  title: string
  body: string
  /** JSON string with deep-link context (e.g. { tenant_id, donation_id }) */
  data?: string | null
  created_at: string
  read_at: string | null
}

/** Mirrors the RETURNING list of `PATCH /me` in devotee-api profile.service.ts. */
export interface DevoteeUser {
  id: string
  mobile: string
  name: string | null
  email?: string
  city?: string
  state?: string
  country?: string | null
  gotra?: string | null
  address?: string | null
  pincode?: string | null
  pan_masked?: string | null
  /** Sampradaya (migration 032). NULL = "not told us", which sees every tradition. */
  sect?: 'digambar' | 'shwetambar' | null
  /** Panth/gaccha — free text by design, the regional list varies. */
  sub_sect?: string | null
}

/** Donor-facing payment details for the manual bank/UPI donation flow */
export interface TemplePaymentDetails {
  tenant_id: string
  slug: string
  name: string
  accept_donor_requests: boolean
  upi_id?: string | null
  bank_account_name?: string | null
  bank_account_no?: string | null
  bank_ifsc?: string | null
  bank_name?: string | null
  /**
   * False until a platform reviewer has approved the account the trust
   * nominated, and false again the moment the trust edits it. Nothing about
   * where to send money is shown to a devotee without this.
   */
  bank_verified?: boolean
  is_80g_registered?: boolean
}

/** A manual bank/UPI donation submitted for temple approval */
export interface DonationRequest {
  id: string
  tenant_id: string
  temple_name: string
  temple_slug?: string
  amount_paise: number
  category?: string | null
  payment_mode: string
  utr_number?: string | null
  paid_at?: string | null
  is_80g: boolean
  remarks?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  donation_id?: string | null
  receipt_no?: string | null
  review_note?: string | null
  reviewed_at?: string | null
  created_at: string
  has_proof?: boolean
}

// ── Sant directory: discovery (migration 039) ───────────────────────────────

/** A chaturmas (varshayog) stay — one monsoon, one place. */
export interface ChaturmasStay {
  id: string
  chaturmas_year: number | null
  place: string
  city?: string | null
  state?: string | null
  from_date?: string | null
  to_date?: string | null
  lat?: number | string | null
  lng?: number | string | null
}

/** A chaturmas row joined to the ascetic who spent it there. */
export interface ChaturmasEntry extends ChaturmasStay {
  sant_id: string
  name: string
  /** Both scripts (migration 044) — read them through nameFor(). */
  name_en?: string | null
  name_hi?: string | null
  type: string
  type_display?: string
  type_display_hi?: string
  pad?: string
  pad_display?: string
  pad_display_hi?: string
  sect?: string | null
  sect_display?: string
  sect_display_hi?: string
  /** A varshayog record is largely historical, so many of these are memorials. */
  is_samadhistha?: boolean
  samuday?: string | null
  photo_url?: string | null
  has_photo?: boolean
}

export interface SantEvent {
  id: string
  title: string
  type: string
  description?: string | null
  place?: string | null
  city?: string | null
  state?: string | null
  lat?: number | string | null
  lng?: number | string | null
  starts_on: string
  ends_on?: string | null
  /** Free text — real programmes start "after aahar" as often as at a clock time. */
  starts_at_time?: string | null
  tithi_note?: string | null
  status?: string
  /** Present on the cross-ascetic feed, absent on a profile's own events. */
  sant_id?: string
  sant_name?: string
  sant_type?: string
  sant_pad?: string
  photo_url?: string | null
}

/** Derived from the profile's dates at query time, never stored. */
export interface SantAnniversary {
  kind: 'janma_jayanti' | 'diksha_jayanti' | 'punya_tithi'
  label: string
  date: string
  year: number
  /** Next occurrence, or null once the ascetic has attained samadhi. */
  next_on: string | null
  tithi_note?: string | null
}

/** One pin on the discovery map. */
export interface SantMapMarker {
  sant_id: string
  name: string
  type: string
  type_display?: string
  pad?: string
  pad_display?: string
  sect?: string | null
  photo_url?: string | null
  location_id: string
  place: string
  city?: string | null
  state?: string | null
  lat: number | string
  lng: number | string
  chaturmas?: boolean
  from_date?: string | null
  to_date?: string | null
}

/** Distinct filter values with counts, so the UI never offers an empty option. */
export interface SantFacets {
  types: { value: string; count: number }[]
  pads: { value: string; count: number }[]
  sects: { value: string; count: number }[]
  states: { value: string; count: number }[]
  /**
   * Cities that actually hold an ascetic right now, counted on
   * COALESCE(current_city, city) — "who is in Surat" means who is THERE.
   */
  cities?: { value: string; count: number }[]
  /**
   * living / samadhistha counts. Unlike the others this facet deliberately
   * IGNORES the current status filter — its whole job is to say how many are on
   * the other side of it.
   */
  statuses?: { value: string; count: number }[]
  /**
   * Sanghs (migration 047) — the group an ascetic belongs to.
   *
   * The only facet whose `value` is an id rather than the label itself: two
   * sanghs can be named for the same Acharya in different paramparas, so the
   * filter matches on the id and the label is carried alongside it.
   */
  sanghs?: {
    value: string; label: string; label_hi: string | null;
    parampara: string | null; count: number
  }[]
  /** The lineage behind a sangh. Broader than any single sangh. */
  paramparas?: { value: string; count: number }[]
}

/** Outcome of a devotee's location report. */
export interface SantLocationReport {
  id: string
  place: string
  city?: string | null
  state?: string | null
  from_date?: string | null
  chaturmas?: boolean
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  decided_at?: string | null
  decision_note?: string | null
  sant_id: string
  sant_name: string
  sant_type?: string
  photo_url?: string | null
}

// ── the library (migrations 053–055) ────────────────────────────────────────

/**
 * A text as the LIST returns it.
 *
 * No `body`: 20 texts averaging 4 KB is most of a megabyte a page on a mobile
 * connection, for text nobody has opened. The list carries a one-line preview
 * and the length so a card can say how long the read is.
 */
export interface LibraryText {
  id: string
  slug: string
  title: string
  title_hi: string | null
  /** Genre — one of the closed list in migration 053. */
  kind: string
  /** Script of the body: hi | en | both. */
  script: string
  author: string | null
  language: string | null
  particulars: string | null
  text_type: string | null
  body_length: number | string
  preview: string | null
  /**
   * A serialised work — "Muni Aahar Procedure" is one document published as
   * fourteen posts. The list collapses those to ONE row: `series` is the work's
   * name and `part_count` how many parts matched the current filters.
   * Null on a standalone text, which is most of them.
   */
  series: string | null
  part: number | null
  part_count: number
  sant_id: string | null
  sant_name: string | null
  sant_name_hi: string | null
  category_slugs: string[]
}

/** One inline run. `href` present means it is a real link. */
export interface TextSpan { s: string; href?: string }

/**
 * One block of a text (migration 059).
 *
 * Deliberately NOT HTML: the API sends a small closed set of blocks and the
 * client builds its own widgets, so a scraped source can produce a bad link but
 * never a script. `verse` is the only block whose whitespace is significant.
 */
export interface TextBlock {
  t: 'heading' | 'prose' | 'verse' | 'item' | 'audio' | 'image'
  spans?: TextSpan[]
  text?: string
  /** Source URL. A `mirror` may appear later; prefer it when it does. */
  url?: string
  mirror?: string
  caption?: string | null
}

/** A text as the DETAIL returns it — the only shape that carries the body. */
export interface LibraryTextDetail extends Omit<LibraryText, 'preview' | 'category_slugs'> {
  /**
   * Plain text with its line breaks intact. A stotra is poetry: render it in a
   * `whitespace-pre-wrap` block and never collapse the whitespace.
   */
  body: string
  /**
   * The same content as ordered blocks — recitations, yantras and links intact.
   * Null on a text scraped before 059; render `body` when it is.
   */
  body_blocks: TextBlock[] | null
  excerpt: string | null
  rhythm: string | null
  contributed_by: string | null
  reference_url: string | null
  credit: string | null
  source: string | null
  source_url: string | null
  published_at: string | null
  categories: { slug: string; name: string }[]
  /** The other parts of a serialised work, in order. Empty for a standalone. */
  /**
   * `part_no` is the position in the series (1..N) and is what a chip is
   * labelled with. `part` is the starting verse the source wrote into the
   * title, which is why chips once read "Part 8, Part 15, Part 22".
   */
  parts: { id: string; slug: string; title: string; part: number | null;
    part_no: number; body_length: number | string }[]
  related: { id: string; slug: string; title: string; kind: string; particulars: string | null }[]
}

/** Counts behind each filter control, each counted under every filter but itself. */
export interface LibraryFacets {
  kinds: { value: string; count: number | string }[]
  categories: { value: string; label: string; count: number | string }[]
  scripts: { value: string; count: number | string }[]
  authors: { value: string; count: number | string }[]
}

/**
 * A book in the granth catalogue (migrations 056/057, mirrored by 075/076).
 *
 * `mirrored` decides how a row behaves. True and both URLs are ours, so the
 * book reads and saves without leaving our origin. False and it is still one of
 * the source's — the mirror fills in book by book, and a client must handle
 * both for as long as that is running.
 */
export interface Granth {
  id: string
  title: string
  title_hi: string | null
  author: string | null
  language: string | null
  shelf: string | null
  sant_id: string | null
  /** 'by' = the linked ascetic wrote it; 'about' = it was written about them. */
  sant_relation: 'by' | 'about' | null
  sant_name: string | null
  sant_name_hi: string | null
  /**
   * Where the book downloads from. Ours when `mirrored`, the source's when not.
   * The API never sends the source's `preview_url` — it carries the library
   * owner's Google account id.
   */
  download_url: string | null
  /**
   * What the reader opens: our own PDF when mirrored, otherwise Drive's embed
   * derived from the file id. Null for a row with neither, and the shelf then
   * links out instead of offering to read.
   */
  reader_url?: string | null
  /** True when both URLs above are served by us rather than by a third party. */
  mirrored?: boolean
}

/**
 * A granth as it appears on an ascetic's profile — the catalogue fields the
 * profile shows, plus the same URL trio the full {@link Granth} carries. A
 * projection of that type rather than a separate thing: the two must agree
 * about `mirrored`, or the profile would open a book differently from the
 * shelf.
 */
export interface SantGranthLink {
  id: string
  title: string
  title_hi: string | null
  download_url: string | null
  reader_url?: string | null
  mirrored?: boolean
}

export interface GranthFacets {
  shelves: { value: string; count: number | string }[]
  authors: { value: string; count: number | string }[]
}

/** One ascetic in a sangh, as the profile endpoint sends them. */
export interface SanghMember {
  id: string
  name: string
  name_en: string | null
  name_hi: string | null
  type: string
  pad: string | null
  is_sangh_head: boolean
  guru_name?: string | null
  /**
   * The member's guru, when that guru is also in this sangh — resolved by the
   * API by name key, since `guru_name` is free text. Null for the 54% whose
   * guru is genuinely outside the group; they render at the top level.
   */
  guru_id?: string | null
  current_city: string | null
  current_state: string | null
  photo_url: string | null
}

/** One generation in a parsed teacher-lineage. */
export interface ParamparaNode {
  /** 1 for the first chain; incremented where the source restarts at 1. */
  group: number
  /** `[3, 1, 1]` for "3.1.1"; its length is the depth. */
  path: number[]
  depth: number
  name: string
  year: number | null
}

/** One run inside a biography; `href` makes it a link. */
export interface BioSpan { s: string; href?: string }

/** One block of a parsed biography. */
export interface BioBlock {
  t: 'para' | 'item' | 'meta' | 'rule'
  spans?: BioSpan[]
}

/** One monsoon: the year, and where it was spent. */
export interface ChaturmasEntry { year: number; place: string }
