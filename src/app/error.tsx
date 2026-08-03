'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import StateScreen from '@/components/states/StateScreen'

// Frontière d'erreur d'un segment (App Router). Rendue à l'intérieur du root
// layout → le LocaleProvider est monté, donc la traduction FR/EN fonctionne.
// `reset()` retente le rendu du segment qui a planté.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error('[WIC] app error boundary', error)
  }, [error])

  return (
    <StateScreen title={t.states.error.title} message={t.states.error.message}>
      <button
        type="button"
        onClick={() => reset()}
        className="press min-h-[44px] inline-flex items-center justify-center whitespace-nowrap px-7 py-3 text-sm font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: 'var(--accent)', borderRadius: 'var(--r-sm)' }}
      >
        {t.states.error.retry}
      </button>
      <Link
        href="/"
        className="press min-h-[44px] inline-flex items-center justify-center whitespace-nowrap px-7 py-3 text-sm font-bold uppercase tracking-wider text-white"
        style={{ border: '1px solid rgba(255,255,255,0.35)', borderRadius: 'var(--r-sm)' }}
      >
        {t.states.home}
      </Link>
    </StateScreen>
  )
}
