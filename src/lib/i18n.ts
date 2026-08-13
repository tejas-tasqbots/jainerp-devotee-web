import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en/common.json'
import hi from '../locales/hi/common.json'
import mr from '../locales/mr/common.json'
import gu from '../locales/gu/common.json'
import kn from '../locales/kn/common.json'

export type Lang = 'en' | 'hi' | 'mr' | 'gu' | 'kn'

const STORAGE_KEY = 'devotee_lang'

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'hi' || v === 'mr' || v === 'gu' || v === 'kn'
}

function savedLang(): Lang {
  try {
    const l = localStorage.getItem(STORAGE_KEY)
    if (isLang(l)) return l
  } catch { /* privacy mode */ }
  return 'en'
}

const initial = savedLang()

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    hi: { common: hi },
    mr: { common: mr },
    gu: { common: gu },
    kn: { common: kn },
  },
  lng: initial,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

// Reflect the restored language on <html lang> at boot, not only when the user
// changes it — screen readers and browser translation prompts read this.
document.documentElement.setAttribute('lang', initial)

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang)
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
  document.documentElement.setAttribute('lang', lang)
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  // Gujarati and Kannada carry the largest Jain populations after Hindi and
  // Marathi — Gujarat for the Shwetambar community, Karnataka for the
  // Digambar heartland.
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
]

export default i18n
