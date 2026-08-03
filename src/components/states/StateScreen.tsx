'use client'

import { type ReactNode } from 'react'
import { Syne } from 'next/font/google'

// Coquille visuelle partagée par le 404 et l'écran d'erreur : plein écran,
// centré, transparent (laisse voir le motif « $ ? » global du layout). Grand
// lettrage condensé Syne, accent orange via tokens, boutons passés en enfants.
const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

export default function StateScreen({
  code,
  title,
  message,
  children,
}: {
  /** Grand code affiché au-dessus du titre (ex. « 404 »). Purement visuel. */
  code?: string
  title: string
  message: string
  /** Boutons d'action (rendus dans une rangée centrée, wrap en petit écran). */
  children?: ReactNode
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-5" style={{ maxWidth: '540px' }}>
        {code && (
          <span
            aria-hidden="true"
            className={syne.className}
            style={{
              fontSize: 'clamp(4.5rem, 24vw, 10rem)',
              lineHeight: 0.85,
              letterSpacing: '-0.04em',
              color: 'var(--accent)',
            }}
          >
            {code}
          </span>
        )}
        <h1
          className={`${syne.className} uppercase text-white`}
          style={{ fontSize: 'clamp(1.5rem, 6vw, 2.6rem)', lineHeight: 1.05, letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
        <p className="text-sm sm:text-base" style={{ color: '#9a9aa5', maxWidth: '40ch' }}>
          {message}
        </p>
        {children && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div>
        )}
      </div>
    </main>
  )
}
