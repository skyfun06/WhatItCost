'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'

export function Header() {
  const { t } = useTranslation()
  const pathname = usePathname()

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-xl tracking-tight text-brand"
        >
          WhatItCost
        </Link>

        {/* Le sélecteur de langue est global (LanguageToggle, fixé en haut à droite).
            Le lien Classement est masqué quand on est déjà sur la page. */}
        {pathname !== '/leaderboard' && (
          <nav className="flex items-center gap-4">
            <Link
              href="/leaderboard"
              className="text-sm font-semibold text-muted hover:text-white transition-colors"
            >
              {t.nav.leaderboard}
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
