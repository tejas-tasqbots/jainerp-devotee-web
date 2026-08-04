import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'
import { LANGS, setLanguage, type Lang } from '../lib/i18n'

// Roughly the rendered menu height (3 rows + padding). Used only to decide
// whether the menu has room below the button, so an estimate is fine.
const MENU_HEIGHT = 132

/**
 * Language pill — shows the current language, opens a small picker.
 *
 * Mounted both on the login screen (top-right of the card) and after sign-in
 * (Home header / sidebar footer). The sidebar mount sits at the bottom of the
 * viewport, so the menu flips above the button when there is no room below —
 * without that it rendered off-screen and the options could not be clicked.
 */
export function LanguageSwitcher({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [drop, setDrop] = useState<'down' | 'up'>('down')
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // i18next may report a regional tag ("en-US"); compare on the base subtag so
  // the pill never shows English while Hindi is actually active.
  const active = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const currentIndex = Math.max(0, LANGS.findIndex(l => l.code === active))
  const current = LANGS[currentIndex]

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Flip above the button when the viewport has no room below it.
  useLayoutEffect(() => {
    if (!open) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const roomBelow = window.innerHeight - rect.bottom
    setDrop(roomBelow < MENU_HEIGHT && rect.top > roomBelow ? 'up' : 'down')
  }, [open])

  // Move focus into the menu so keyboard users can pick a language.
  useEffect(() => {
    if (open) itemRefs.current[cursor]?.focus()
  }, [open, cursor])

  function openMenu() {
    setCursor(currentIndex)
    setOpen(true)
  }

  function choose(code: Lang) {
    setLanguage(code)
    setOpen(false)
    btnRef.current?.focus()
  }

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => (c + 1) % LANGS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => (c - 1 + LANGS.length) % LANGS.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCursor(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCursor(LANGS.length - 1)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openMenu()
          }
        }}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-1"
        aria-label={t('common.language', 'Change language')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Languages size={13} aria-hidden="true" />
        {current.label}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('common.language', 'Change language')}
          onKeyDown={onMenuKey}
          className={`absolute z-50 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${drop === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {LANGS.map((l, i) => (
            <button
              key={l.code}
              ref={el => { itemRefs.current[i] = el }}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === active}
              tabIndex={i === cursor ? 0 : -1}
              onClick={() => choose(l.code)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm focus:outline-none focus:bg-slate-100 ${
                l.code === active ? 'font-bold text-brand-red' : 'text-slate-700'
              } hover:bg-slate-50`}
            >
              <span>{l.label}</span>
              {l.code === active && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
