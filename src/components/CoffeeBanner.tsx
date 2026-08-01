'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

const STORAGE_KEY = 'coffee_banner_dismissed'
const COFFEE_URL = 'https://buymeacoffee.com/borrel'

/**
 * Bannière "Buy me a coffee" fixée en bas de page, full width.
 * Masquable pour la session en cours (sessionStorage) — réapparaît au prochain
 * lancement du site. Tant qu'elle est visible, elle réserve 60px de padding
 * en bas du <body> pour ne rien masquer.
 */
export default function CoffeeBanner() {
  const { t } = useTranslation()
  // On part masqué pour éviter tout flash avant la lecture du sessionStorage côté client
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      // sessionStorage : masqué pour la session en cours uniquement.
      // Au relancement du site (nouvelle session), la bannière réapparaît.
      dismissed = sessionStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      // ignore
    }
    setVisible(!dismissed)
  }, [])

  // Réserve la place de la bannière FIXE en bas du contenu — UNIQUEMENT en desktop.
  // Sur mobile la bannière n'est plus fixe (elle passe dans le flux, juste au-dessus
  // du footer, pour laisser le dock être le seul élément fixe en bas) : aucune
  // réservation de padding nécessaire dans ce cas.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => {
      document.body.style.paddingBottom = visible && mq.matches ? '60px' : ''
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.style.paddingBottom = ''
    }
  }, [visible])

  function dismiss() {
    setVisible(false)
    try {
      // Effacé automatiquement à la fermeture de l'onglet/navigateur → réapparaît au prochain lancement
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div
      className="md:fixed md:bottom-0 md:inset-x-0 md:z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
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
