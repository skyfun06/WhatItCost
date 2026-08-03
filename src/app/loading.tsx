'use client'

import { useEffect, useRef, useState } from 'react'
import { Syne } from 'next/font/google'
import { useTranslation } from '@/hooks/useTranslation'

// Écran de chargement de marque : un compteur « budget de film » qui grimpe vers
// un montant de blockbuster (easeOut, une seule montée puis maintien), doublé
// d'une fine barre orange indéterminée qui signale que ça travaille encore.
// Sobre, non clignotant. Sous prefers-reduced-motion : montant figé, barre fixe.
const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

const TARGET = 250_000_000 // 250 M$ — budget de superproduction
const DURATION = 1600 // ms de la montée du compteur

export default function Loading() {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    // Repli reduced-motion : on pose directement le montant final, pas d'animation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAmount(TARGET)
      return
    }
    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / DURATION)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setAmount(Math.round(eased * TARGET))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
      aria-label={t.states.loading.label}
    >
      <div className="flex flex-col items-center gap-6" style={{ maxWidth: '460px', width: '100%' }}>
        <span
          className={syne.className}
          style={{
            fontSize: 'clamp(2.4rem, 11vw, 4.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>$</span>
          {amount.toLocaleString('en-US')}
        </span>

        {/* Barre indéterminée : segment orange qui va-et-vient dans un rail sombre. */}
        <div className="wic-load-track" aria-hidden="true">
          <div className="wic-load-fill" />
        </div>

        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#777777' }}>
          {t.states.loading.label}
        </p>
      </div>

      <style jsx>{`
        .wic-load-track {
          position: relative;
          width: min(220px, 70vw);
          height: 4px;
          border-radius: var(--r-pill);
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .wic-load-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          border-radius: var(--r-pill);
          background: var(--accent);
          animation: wic-load-slide 1.4s var(--ease-liquid) infinite;
        }
        @keyframes wic-load-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        /* Repli mouvement réduit : segment posé, aucune translation. */
        @media (prefers-reduced-motion: reduce) {
          .wic-load-fill {
            animation: none;
            width: 100%;
            opacity: 0.5;
          }
        }
      `}</style>
    </main>
  )
}
