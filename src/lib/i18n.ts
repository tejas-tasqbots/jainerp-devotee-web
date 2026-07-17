import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en/common.json'
import hi from '../locales/hi/common.json'
import mr from '../locales/mr/common.json'

const STORAGE_KEY = 'devotee_lang'

function savedLang(): string {
  try {
    const l = localStorage.getItem(STORAGE_KEY)
    if (l === 'en' || l === 'hi' || l === 'mr') return l
  } catch { /* privacy mode */ }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    hi: { common: hi },
    mr: { common: mr },
  },
  lng: savedLang(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'hi' | 'mr') {
  i18n.changeLanguage(lang)
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
  document.documentElement.setAttribute('lang', lang)
}

export const LANGS: { code: 'en' | 'hi' | 'mr'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
]

export default i18n
