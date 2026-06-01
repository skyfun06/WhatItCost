'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { type Locale, defaultLocale } from '@/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

// Clé localStorage partagée avec le sélecteur de langue (LanguageToggle)
const STORAGE_KEY = 'locale'

function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  function setLocale(next: Locale) {
    setLocaleState(next)
    // Met à jour l'attribut lang sur <html> pour l'accessibilité et le SEO
    document.documentElement.lang = next
    // Persiste le choix pour les prochaines visites
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage indisponible (mode privé, SSR) — on ignore
    }
  }

  // Synchro initiale au montage : restaure la préférence sauvegardée
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    if (isLocale(stored)) {
      setLocaleState(stored)
      document.documentElement.lang = stored
    } else {
      document.documentElement.lang = locale
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}
