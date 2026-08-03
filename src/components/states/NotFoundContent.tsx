'use client'

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import StateScreen from '@/components/states/StateScreen'

// Contenu (client) du 404 : porte la traduction FR/EN via le contexte de locale,
// que le fichier serveur app/not-found.tsx ne peut pas lire lui-même.
export default function NotFoundContent() {
  const { t } = useTranslation()
  return (
    <StateScreen code="404" title={t.states.notFound.title} message={t.states.notFound.message}>
      <Link
        href="/"
        className="press min-h-[44px] inline-flex items-center justify-center whitespace-nowrap px-7 py-3 text-sm font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: 'var(--accent)', borderRadius: 'var(--r-sm)' }}
      >
        {t.states.home}
      </Link>
    </StateScreen>
  )
}
