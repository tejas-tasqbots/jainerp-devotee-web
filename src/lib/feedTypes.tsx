import { Calendar, HandHeart, MapPin, Megaphone, Route, type LucideIcon } from 'lucide-react'

/**
 * Feed item types → icon, tint and a HUMAN label.
 *
 * The home page rendered `{item.type}` straight into a badge, so devotees were
 * shown the raw wire value — literally `maharaj_message`. Two things wrong with
 * that at once: it is a snake_case enum in a UI, and it says "maharaj", which
 * is a form of address for a Muni and not the umbrella term the rest of the
 * product uses.
 *
 * devotee-mobile has mapped these to real labels since it was written
 * (`home_screen.dart`), so this is the web catching up rather than a new idea —
 * and the two now agree on icon and wording.
 *
 * The wire values stay `maharaj_*`: they are internal, three clients and the
 * feed SQL agree on them, and renaming them would be a contract change across
 * all of it to fix something no user can see once this map exists. `sant_*` is
 * accepted alongside them so the API can be renamed later without a flag day.
 */

export interface FeedTypeStyle {
  Icon: LucideIcon
  /** i18n key for the badge text. */
  labelKey: string
  /** Tailwind classes for the leading avatar. */
  avatar: string
  /** Badge class from the shared kit. */
  badge: string
}

const SANT: Pick<FeedTypeStyle, 'avatar' | 'badge'> = {
  avatar: 'bg-brand-gold-light text-brand-gold-dark',
  badge: 'badge-gold',
}

const STYLES: Record<string, FeedTypeStyle> = {
  event: {
    Icon: Calendar,
    labelKey: 'feed.event',
    avatar: 'bg-amber-100 text-amber-600',
    badge: 'badge-gold',
  },
  donation: {
    Icon: HandHeart,
    labelKey: 'feed.donation',
    avatar: 'bg-green-100 text-green-700',
    badge: 'badge-green',
  },
  // Sant updates. Both spellings map to the same thing for one release.
  maharaj_message: { Icon: Megaphone, labelKey: 'feed.santMessage', ...SANT },
  sant_message: { Icon: Megaphone, labelKey: 'feed.santMessage', ...SANT },
  maharaj_location: { Icon: MapPin, labelKey: 'feed.santLocation', ...SANT },
  sant_location: { Icon: MapPin, labelKey: 'feed.santLocation', ...SANT },
  maharaj_vihar: { Icon: Route, labelKey: 'feed.santVihar', ...SANT },
  sant_vihar: { Icon: Route, labelKey: 'feed.santVihar', ...SANT },
  maharaj_need: {
    Icon: HandHeart,
    labelKey: 'feed.santNeed',
    avatar: 'bg-red-50 text-brand-red',
    badge: 'badge-red',
  },
  sant_need: {
    Icon: HandHeart,
    labelKey: 'feed.santNeed',
    avatar: 'bg-red-50 text-brand-red',
    badge: 'badge-red',
  },
}

const FALLBACK: FeedTypeStyle = {
  Icon: Megaphone,
  labelKey: 'feed.update',
  avatar: 'bg-navy-50 text-navy-700',
  badge: 'badge-blue',
}

/**
 * Never returns undefined: an unknown type from a newer API renders as a
 * generic "Update" rather than dumping the raw enum on the page, which is the
 * failure this file exists to prevent.
 */
export function feedTypeStyle(type: string | undefined | null): FeedTypeStyle {
  return (type && STYLES[type]) || FALLBACK
}
