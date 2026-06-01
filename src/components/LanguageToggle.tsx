'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { type Locale } from '@/i18n'

const LOCALES: Locale[] = ['fr', 'en']

/**
 * Sélecteur de langue global, fixé en haut à droite de chaque page.
 * Toggle façon Discord : une barre unique avec un indicateur corail
 * qui glisse vers la langue active (même style que la page Paramètres).
 * La préférence est persistée par LocaleContext dans localStorage ("locale").
 */
export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation()
  const count = LOCALES.length
  const index = Math.max(0, LOCALES.indexOf(locale))

  return (
    <div
      className="fixed top-0 right-0 z-50 m-2 sm:m-4 flex w-fit rounded-lg p-1"
      style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
    >
      {/* Indicateur glissant */}
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-md"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
          backgroundColor: '#FF4D2E',
          transition: 'all 0.2s ease',
        }}
      />

      {LOCALES.map((l) => {
        const selected = l === locale
        return (
          <button
            key={l}
            type="button"
            aria-pressed={selected}
            onClick={() => setLocale(l)}
            className="relative z-[1] flex-1 cursor-pointer rounded-md border-none bg-transparent px-3 py-1.5 text-center text-[0.7rem] uppercase tracking-[0.05em] sm:px-4 sm:text-[0.8rem]"
            style={{
              fontWeight: selected ? 700 : 400,
              color: selected ? '#ffffff' : '#888888',
              transition: 'color 0.2s ease',
            }}
          >
            {l.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
