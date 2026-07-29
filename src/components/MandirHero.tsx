/**
 * Devotional banner for the devotee login screen.
 *
 * Deliberately an inline SVG, not a photograph and not a DB-stored image:
 *
 *  - The login screen renders *before* authentication, so it cannot fetch
 *    tenant data — a per-tenant image is not available at this point anyway.
 *  - A remote URL would break the PWA's offline install; this ships in the
 *    bundle and always renders.
 *  - Photographs of real mandirs raise a licensing/attribution question, and
 *    stock temple photography reads as inauthentic. A geometric shikhar motif
 *    in the existing brand palette is safer and a few KB.
 *  - No identifiable ascetic appears here by design — see
 *    doc-v2/Images_And_Photos.md §7.
 *
 * Purely decorative, so it is aria-hidden: the heading below it already names
 * the page for screen readers.
 */
export function MandirHero({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 120"
        className="w-full h-full"
        preserveAspectRatio="xMidYMax meet"
        role="presentation"
      >
        <defs>
          <linearGradient id="mh-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        <rect width="320" height="120" fill="url(#mh-sky)" />

        {/* Sun / halo behind the shikhar */}
        <circle cx="160" cy="58" r="30" fill="#fde68a" opacity="0.45" />

        {/* Mandir silhouette: three shikhars on a plinth */}
        <g fill="#7c2d12" opacity="0.92">
          {/* left shikhar */}
          <path d="M96 96 L110 56 L124 96 Z" />
          {/* right shikhar */}
          <path d="M196 96 L210 56 L224 96 Z" />
          {/* central shikhar, taller */}
          <path d="M136 96 L160 34 L184 96 Z" />
          {/* kalash finial on the central spire */}
          <circle cx="160" cy="28" r="4" />
          <rect x="159" y="16" width="2" height="10" />
          {/* plinth */}
          <rect x="84" y="96" width="152" height="10" rx="2" />
          {/* steps */}
          <rect x="94" y="106" width="132" height="5" rx="1" opacity="0.8" />
          <rect x="104" y="111" width="112" height="5" rx="1" opacity="0.65" />
        </g>

        {/* Doorway arch */}
        <path d="M152 96 L152 78 Q160 70 168 78 L168 96 Z" fill="#fde68a" opacity="0.75" />
      </svg>
    </div>
  )
}
