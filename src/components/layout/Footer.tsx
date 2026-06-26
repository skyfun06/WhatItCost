import Link from 'next/link'
import { Syne } from 'next/font/google'
import AnimatedBackground from '@/components/AnimatedBackground'

// Footer global, monté dans le layout racine — visible sur tout le site.
// Server component statique (FR) : aucun hook, contenu indexable partout, ce qui
// donne aux pages éditoriales/légales des liens internes crawlables (bon signal
// pour l'indexation et pour AdSense). Compact et aéré : il s'affiche sous le
// contenu plein écran du jeu sans en altérer la mise en page. La bannière café
// réserve déjà 60px en bas du <body>, donc pas de padding bas supplémentaire ici.
//
// Intégration visuelle : plutôt qu'un bloc sombre rapporté, le footer reprend la
// MÊME surface que le reste du site via AnimatedBackground (fond #111111 + motif
// « $ ? » qui ne s'arrête donc pas net à la frontière). Le motif y est volontairement
// quasi invisible (symbolOpacity très bas) pour garder les liens parfaitement
// lisibles, et la séparation se réduit à un fin dégradé qui se fond aux bords.

const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

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
    <footer className="relative z-10 mt-auto">
      {/* Même surface que le site (fond #111111 + motif « $ ? » continué, mais
          quasi invisible à 0.02 pour ne jamais gêner la lecture des liens). */}
      <AnimatedBackground symbolOpacity={0.02}>
        {/* Séparation très discrète : un fin dégradé qui s'éteint sur les bords,
            au lieu d'une ligne ou d'une cassure de couleur franche. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }}
        />

        <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Marque + tagline courte */}
          <div className="flex flex-col gap-2 md:max-w-[15rem]">
            <span className={`${syne.className} text-xl text-white`}>
              WhatItCost<span style={{ color: '#FF4D2E' }}>?</span>
            </span>
            <p className="text-sm leading-relaxed" style={{ color: '#7c7c8a' }}>
              Devine le budget des films. Seul, entre amis ou dans le défi du jour.
            </p>
          </div>

          {/* Colonnes de liens — côte à côte même sur mobile (3 colonnes compactes) */}
          <nav
            aria-label="Pied de page"
            className="grid grid-cols-3 gap-x-8 gap-y-8 sm:gap-x-14"
          >
            {COLUMNS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-3">
                <span
                  className={`${syne.className} text-xs uppercase tracking-[0.16em]`}
                  style={{ color: '#5a5a6a' }}
                >
                  {col.heading}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm transition-colors duration-150 hover:text-[#FF4D2E]"
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

        {/* Barre basse : copyright + mention TMDB, séparés par une fine ligne */}
        <div
          className="mt-9 flex flex-col gap-2 border-t border-white/[0.05] pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ color: '#55555f' }}
        >
          <span>© {year} WhatItCost — Projet indépendant.</span>
          <span>
            Données films via l&apos;API TMDB. Produit non approuvé ni certifié par TMDB.
          </span>
        </div>
        </div>
      </AnimatedBackground>
    </footer>
  )
}
