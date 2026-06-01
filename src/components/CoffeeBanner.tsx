'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

const STORAGE_KEY = 'coffee_banner_dismissed'
const COFFEE_URL = '#' // placeholder — à remplacer par le vrai lien Buy Me a Coffee

/**
 * Bannière "Buy me a coffee" fixée en bas de page, full width.
 * Masquable (préférence persistée en localStorage). Tant qu'elle est visible,
 * elle réserve 60px de padding en bas du <body> pour ne rien masquer.
 */
export default function CoffeeBanner() {
  const { t } = useTranslation()
  // On part masqué pour éviter tout flash avant lecture du localStorage (SSR → fr par défaut)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      // ignore
    }
    setVisible(!dismissed)
  }, [])

  // Réserve la place de la bannière en bas du contenu tant qu'elle est affichée
  useEffect(() => {
    document.body.style.paddingBottom = visible ? '60px' : ''
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [visible])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
      style={{
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #222222',
        padding: '10px 24px',
      }}
    >
      <p className="text-center sm:text-left" style={{ color: '#888888', fontSize: '0.85rem' }}>
        {t.coffee.text}
      </p>

      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href={COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none text-center min-h-[40px] flex items-center justify-center px-5 py-2 font-bold text-sm text-white whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
          style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
        >
          {t.coffee.button} →
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.coffee.dismiss}
          className="shrink-0 flex items-center justify-center text-lg leading-none transition-colors hover:text-white"
          style={{ color: '#888888', width: '32px', height: '32px', borderRadius: '6px' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
