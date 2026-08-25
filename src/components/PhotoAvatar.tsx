/**
 * Avatar that resolves an inline photo, then an external URL, then initials.
 *
 * Photo precedence mirrors the API and the receipt renderer
 * (`logo_base64 || logo_cdn_url`): the inline copy wins because it still
 * renders when the PWA is offline.
 *
 * A PHOTOGRAPH THAT FAILS TO LOAD FALLS BACK TO THE INITIAL. Without that, the
 * browser renders the `alt` text inside the circle, so a broken image showed as
 * the ascetic's own name clipped into a disc — the single ugliest thing on the
 * directory, and indistinguishable from a layout bug. The source host is a
 * third-party WordPress site that rate-limits bursts, so a screen of twenty
 * avatars WILL drop some: this is a normal condition, not an edge case.
 *
 * The initials state is a deliberate first-class design, not a fallback for a
 * failure: photographs of Jain ascetics are optional by design — Digambara
 * munis are unclothed and many communities consider casual display improper.
 * A profile without a photo must look intentional, never broken.
 * See doc-v2/Images_And_Photos.md §7.
 */

import { useState } from 'react'

interface PhotoAvatarProps {
  name: string
  /** Inline data: URI — served by detail endpoints only, never by lists. */
  photoBase64?: string | null
  /** External/CDN URL — the fallback, and what list endpoints send. */
  photoUrl?: string | null
  /** Tailwind sizing classes for the outer circle, e.g. "w-12 h-12". */
  className?: string
  /** Tailwind text sizing for the initial, e.g. "text-xl". */
  textClassName?: string
  /** Palette override for contexts on a dark/coloured background. */
  variant?: 'default' | 'onDark'
}

export function PhotoAvatar({
  name,
  photoBase64,
  photoUrl,
  className = 'w-12 h-12',
  textClassName = 'text-xl',
  variant = 'default',
}: PhotoAvatarProps) {
  const [failed, setFailed] = useState(false)
  const src = (failed ? null : photoBase64 || photoUrl) || null
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'

  const shell =
    variant === 'onDark'
      ? 'bg-white/20 text-amber-200'
      : 'bg-amber-100 text-amber-700'

  return (
    <div
      className={`${className} ${shell} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
    >
      {src ? (
        <img
          src={src}
          // Empty, not the name: a broken image must fall through to the
          // initial, and alt text is what was being painted into the circle.
          // The name is already beside the avatar in every caller.
          alt=""
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={`${textClassName} font-bold`} aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  )
}
