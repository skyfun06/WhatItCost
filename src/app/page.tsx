'use client'

import Link from 'next/link'
import { Syne } from 'next/font/google'
import TypewriterTagline from '@/components/TypewriterTagline'
import AnimatedBackground from '@/components/AnimatedBackground'
import { useTranslation } from '@/hooks/useTranslation'

const syne = Syne({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
})

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <AnimatedBackground
      className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
      style={{ backgroundColor: '#111111' }}
    >
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
            <span style={{ color: '#FF4D2E' }}>?</span>
          </span>
        </h1>

        {/* Typewriter tagline */}
        <TypewriterTagline />

        {/* CTA buttons — largeur fixe + nowrap : taille/hauteur identiques en FR et EN */}
        <div
          className="flex flex-col sm:flex-row gap-3 mx-auto"
          style={{ width: '100%', maxWidth: '480px' }}
        >
          <Link
            href="/settings"
            className="flex-1 whitespace-nowrap py-4 px-5 font-bold text-sm uppercase tracking-wider text-white text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.97]"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {t.home.playSolo}
          </Link>
          <Link
            href="/settings"
            className="flex-1 whitespace-nowrap py-4 px-5 font-bold text-sm uppercase tracking-wider text-white text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.97]"
            style={{
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '6px',
            }}
          >
            {t.home.playFriends}
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

      </div>
    </AnimatedBackground>
  )
}
