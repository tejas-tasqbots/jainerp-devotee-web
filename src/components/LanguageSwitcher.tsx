import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { LANGS, setLanguage } from '../lib/i18n'

/**
 * Compact language pill — shows the current language, tapping cycles a small
 * inline picker. Mounted in the Home header and the Profile page.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGS.find(l => l.code === i18n.language) ?? LANGS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm"
        aria-label="Change language"
      >
        <Languages size={13} />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-28 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false) }}
              className={`block w-full px-3 py-1.5 text-left text-sm ${
                l.code === i18n.language ? 'font-bold text-brand-red' : 'text-slate-700'
              } hover:bg-slate-50`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
