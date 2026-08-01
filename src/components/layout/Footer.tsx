import Link from 'next/link'
import { Syne } from 'next/font/google'
import { MotifStripes } from '@/components/AnimatedBackground'

// Footer global, monté dans le layout racine — visible sur tout le site.
// Server component statique (FR) : aucun hook, contenu indexable partout, liens
// internes crawlables (bon pour l'indexation et AdSense).
//
// Parti pris visuel : sobre et cohérent avec le reste du site. Le footer porte
// EXACTEMENT le même fond que les pages (fond opaque #111111 + motif « $ ? » via
// MotifStripes à l'opacité par défaut 0.06, cf. AnimatedBackground), au lieu de
// laisser transparaître la couche globale (motif 0.04) — surface homogène de bout
// en bout. Police Syne du hero pour la marque et les titres, accent corail
// #FF4D2E au survol, et une fine ligne dégradée en haut comme séparation douce.

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' })

const ACCENT = '#FF4D2E'

const COLUMNS: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: 'Explorer',
    links: [
      { href: '/', label: 'Accueil' },
      { href: '/blog', label: 'Blog' },
      { href: '/comment-jouer', label: 'Comment jouer' },
      { href: '/a-propos', label: 'À propos' },
    ],
  },
  {
    heading: 'Le jeu',
    links: [
      { href: '/daily', label: 'Défi du jour' },
      { href: '/leaderboard', label: 'Classement' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Légal',
    links: [
      { href: '/mentions-legales', label: 'Mentions légales' },
      { href: '/confidentialite', label: 'Confidentialité' },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="relative z-10 mt-auto overflow-hidden"
      style={{ backgroundColor: '#111111' }}
    >
      {/* Même motif « $ ? » que les pages (AnimatedBackground), même opacité. */}
      <MotifStripes symbolOpacity={0.06} />

      {/* Séparation douce : fine ligne dégradée qui s'éteint aux extrémités. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)' }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        {/* Haut : marque à gauche, colonnes de liens à droite. */}
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          {/* Marque + tagline */}
          <div className="flex flex-col gap-3 md:max-w-xs">
            <Link href="/" className={`${syne.className} text-2xl font-extrabold text-white`}>
              WhatItCost<span style={{ color: ACCENT }}>?</span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: '#8a8a97' }}>
              Devine le budget des films. Seul, entre amis ou dans le défi du jour.
            </p>
          </div>

          {/* Colonnes de liens */}
          <nav
            aria-label="Pied de page"
            className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-3 sm:gap-x-16"
          >
            {COLUMNS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-4">
                <h2
                  className={`${syne.className} text-xs font-bold uppercase tracking-[0.18em]`}
                  style={{ color: '#6a6a78' }}
                >
                  {col.heading}
                </h2>
                <ul className="flex flex-col gap-3">
                  {col.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm transition-colors duration-200 hover:text-[#FF4D2E]"
                        style={{ color: '#9a9aa8' }}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bas : copyright + mention TMDB, séparés par une fine ligne. */}
        <div
          className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ color: '#5c5c66' }}
        >
          <span>© {year} WhatItCost — Projet indépendant.</span>
          <span>
            Données films via l&apos;API TMDB. Produit non approuvé ni certifié par TMDB.
          </span>
        </div>
      </div>
    </footer>
  )
}
