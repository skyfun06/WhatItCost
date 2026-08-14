'use client'

import Link from 'next/link'
import { Syne } from 'next/font/google'
import TypewriterTagline from '@/components/TypewriterTagline'
import { useTranslation } from '@/hooks/useTranslation'
import { tapHaptic } from '@/lib/haptics'

const syne = Syne({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
})

export default function HomeContent() {
  const { t } = useTranslation()

  return (
    // Transparent : laisse voir le fond GLOBAL unique (layout.tsx, #111111 + motif
    // « $ ? »). Le hero ne recrée plus sa propre animation → il partage exactement
    // la même couche animée que le footer (transparent lui aussi), d'où une seule
    // et même animation continue de haut en bas.
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="flex flex-col items-center text-center" style={{ gap: '1.25rem' }}>

        {/* Pill tag */}
        <span
          className="text-xs font-bold uppercase tracking-[0.22em] px-4 py-1.5"
          style={{
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '100px',
          }}
        >
          {t.home.tag}
        </span>

        {/* Title */}
        <h1
          className={`${syne.className} uppercase`}
          style={{ lineHeight: 0.95, letterSpacing: '-0.02em' }}
        >
          <span
            className="block text-white"
            style={{ fontSize: 'clamp(3rem, 15vw, 9rem)' }}
          >
            WHAT IT
          </span>
          <span
            className="block"
            style={{ fontSize: 'clamp(3rem, 15vw, 9rem)' }}
          >
            <span className="text-white">COST</span>
            <span style={{ color: 'var(--accent)' }}>?</span>
          </span>
        </h1>

        {/* Typewriter tagline */}
        <TypewriterTagline />

        {/* CTA buttons — largeur fixe + nowrap : taille/hauteur identiques en FR et EN */}
        <div
          className="flex flex-col gap-3 mx-auto"
          style={{ width: '100%', maxWidth: '480px' }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/configure?mode=solo"
              onClick={() => tapHaptic()}
              className="press flex-1 whitespace-nowrap py-4 px-5 font-bold text-sm uppercase tracking-wider text-white text-center hover:shadow-[0_6px_24px_var(--accent-glow)]"
              style={{ backgroundColor: 'var(--accent)', borderRadius: 'var(--r-sm)' }}
            >
              {t.home.playSolo}
            </Link>
            <Link
              href="/lobby/create"
              className="press flex-1 whitespace-nowrap py-4 px-5 font-bold text-sm uppercase tracking-wider text-white text-center transition-colors hover:border-white/60 hover:bg-white/[0.06]"
              style={{
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              {t.home.playFriends}
            </Link>
          </div>

          {/* Défi du jour — même défi pour tous, nouveau chaque jour (minuit UTC) */}
          <Link
            href="/daily"
            className="press whitespace-nowrap py-4 px-5 font-bold text-sm uppercase tracking-wider text-center hover:shadow-[0_6px_24px_rgba(255,77,46,0.35)]"
            style={{
              color: 'var(--accent)',
              border: '1px solid rgba(255,77,46,0.6)',
              backgroundColor: 'rgba(255,77,46,0.08)',
              borderRadius: 'var(--r-sm)',
            }}
          >
            🎬 {t.daily.title}
          </Link>
        </div>

        {/* Stats — centrées et sur une seule ligne quelle que soit la langue */}
        <div
          className="flex items-center justify-center flex-wrap gap-3 text-xs uppercase tracking-[0.18em]"
          style={{ color: '#555555' }}
        >
          <span className="whitespace-nowrap">{t.home.statRounds}</span>
          <span style={{ color: '#333333' }}>│</span>
          <span className="whitespace-nowrap">{t.home.statMaxPts}</span>
          <span style={{ color: '#333333' }}>│</span>
          <span className="whitespace-nowrap">{t.home.statDuration}</span>
        </div>

        {/* Classement global — vrai bouton, contour corail : visible sans
            concurrencer les deux CTA pleins au-dessus */}
        <Link
          href="/leaderboard"
          className="press whitespace-nowrap py-3 px-8 font-bold text-xs uppercase tracking-[0.18em] text-center hover:shadow-[0_6px_24px_rgba(255,77,46,0.35)]"
          style={{
            color: 'var(--accent)',
            border: '1px solid rgba(255,77,46,0.6)',
            borderRadius: 'var(--r-sm)',
            backgroundColor: 'rgba(255,77,46,0.08)',
          }}
        >
          🏆 {t.nav.leaderboard}
        </Link>

      </div>
    </div>
  )
}
