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
  city: string
  state: string
  address?: Record<string, string>
  registration_80g?: string
  custom_domain?: string
  global_sync_enabled?: boolean
  lat?: number | string | null
  lng?: number | string | null
  maharaj?: { id: string; name: string; type: string; samuday?: string; photo_url?: string; has_photo?: boolean; note?: string }[]
}

export interface MaharajProfile {
  id: string
  name: string
  /**
   * Canonical ascetic RANK, not the honorific — 'maharaj'/'mataji' were never
   * valid values (see doc-v2/Glossary_And_Naming.md). Render `type_display`,
   * which the API resolves from ascetic.ts.
   */
  type: 'muni' | 'aryika' | 'kshullak' | 'kshullika' | 'ailak'
  /** Honorific for display: "Maharaj Ji", "Mataji", "Ailak Ji", … */
  type_display?: string
  sect?: 'digambar' | 'shwetambar'
  sect_display?: string
  samuday: string
  city?: string
  state?: string
  photo_url?: string
  /** Inline photo — detail endpoint only; lists send `has_photo` instead (see Images_And_Photos.md §6.3). */
  photo_base64?: string
  has_photo?: boolean
  bio?: string
  diksha_year?: number
  guru_name?: string
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

export interface DevoteeUser {
  id: string
  mobile: string
  name: string | null
  email?: string
  city?: string
  state?: string
  address?: string | null
  pincode?: string | null
  pan_masked?: string | null
}

/** Donor-facing payment details for the manual bank/UPI donation flow */
export interface TemplePaymentDetails {
  tenant_id: string
  slug: string
  name: string
  accept_donor_requests: boolean
  upi_id?: string | null
  upi_qr_cdn_url?: string | null
  bank_account_name?: string | null
  bank_account_no?: string | null
  bank_ifsc?: string | null
  bank_name?: string | null
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
