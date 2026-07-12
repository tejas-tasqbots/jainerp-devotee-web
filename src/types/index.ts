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
  maharaj?: { id: string; name: string; type: string; samuday?: string; photo_url?: string; note?: string }[]
}

export interface MaharajProfile {
  id: string
  name: string
  type: 'maharaj' | 'mataji'
  samuday: string
  city?: string
  state?: string
  photo_url?: string
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
  title: string
  body: string
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
  pan_masked?: string | null
}
