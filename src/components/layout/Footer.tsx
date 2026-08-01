import Link from 'next/link'
import { Syne } from 'next/font/google'
import { MotifStripes } from '@/components/AnimatedBackground'

// Footer global « socle signature », monté dans le layout racine (visible partout).
// Server component statique (FR) : aucun hook, contenu indexable, liens crawlables.
//
// Intégration visuelle : plutôt que rester totalement transparent, le footer
// devient la CONCLUSION visuelle de la page. Il prolonge le motif « $ ? » du fond
// global (même composant MotifStripes, densité croissante vers le bas), fond son
// arête haute dans le corps via un dégradé (plus de ligne sèche), et ancre la page
// avec un wordmark géant débordant par le bas. Toutes les couches ajoutées sont
// décoratives (aria-hidden) et sous le contenu (z-10).

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

const ACCENT = '#FF4D2E'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    // overflow-hidden : coupe proprement le motif ET le wordmark qui déborde en bas.
    <footer className="relative z-10 mt-auto overflow-hidden bg-transparent">
      {/* 1a. Socle sombre : dégradé transparent → sombre vers le bas. Le haut reste
             transparent (jointure fondue avec le corps, plus de ligne sèche) ;
             le bas s'assombrit pour poser une base. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* 1b. Prolongement du motif « $ ? » : MÊME composant que le fond global. Un
             masque en dégradé le fait apparaître progressivement et plus dense vers
             le bas → continuité visuelle qui s'intensifie. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)',
        }}
      >
        <MotifStripes symbolOpacity={0.07} />
      </div>

      {/* 3. Lueur orange douce derrière le wordmark (faible opacité, pas de néon). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{ background: 'radial-gradient(60% 120% at 50% 100%, rgba(255,77,46,0.10), transparent 70%)' }}
      />

      {/* 2. Wordmark « socle » : Syne (police du hero), semi-transparent, « ? » orange,
             débordant sous le bord bas (translateY + overflow-hidden) → effet d'ancrage. */}
      <span
        aria-hidden="true"
        className={`${syne.className} pointer-events-none absolute inset-x-0 bottom-0 select-none whitespace-nowrap text-center uppercase`}
        style={{
          fontSize: 'clamp(4rem, 22vw, 15rem)',
          lineHeight: 0.72,
          letterSpacing: '-0.03em',
          color: 'rgba(255,255,255,0.035)',
          transform: 'translateY(26%)',
        }}
      >
        WHATITCOST<span style={{ color: 'rgba(255,77,46,0.55)' }}>?</span>
      </span>

      {/* Contenu réel, au-dessus de toutes les couches décoratives. pb généreux :
          réserve la bande basse au wordmark sans qu'il chevauche le texte lisible. */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-40 md:pb-48">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Marque + tagline courte */}
          <div className="flex flex-col gap-2 md:max-w-[15rem]">
            <span className={`${syne.className} text-xl text-white`}>
              WhatItCost<span style={{ color: ACCENT }}>?</span>
            </span>
            <p className="text-sm leading-relaxed" style={{ color: '#7c7c8a' }}>
              Devine le budget des films. Seul, entre amis ou dans le défi du jour.
            </p>
          </div>

          {/* Colonnes de liens — 3 colonnes compactes, tiennent même sur mobile. */}
          <nav aria-label="Pied de page" className="grid grid-cols-3 gap-x-8 gap-y-8 sm:gap-x-14">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-3">
                {/* Titre de colonne + accent orange (courte barre) devant. */}
                <span
                  className={`${syne.className} flex items-center gap-2 text-xs uppercase tracking-[0.16em]`}
                  style={{ color: '#7a7a88' }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-[3px] rounded-full"
                    style={{ backgroundColor: ACCENT }}
                  />
                  {col.heading}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(({ href, label }) => (
                    <li key={href}>
                      {/* Hover : couleur orange + soulignement qui se déploie. */}
                      <Link
                        href={href}
                        className="group relative inline-block text-sm transition-colors duration-200 hover:text-[#FF4D2E]"
                        style={{ color: '#9a9aa8' }}
                      >
                        {label}
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#FF4D2E] transition-all duration-200 group-hover:w-full"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Barre basse : copyright + mention TMDB. */}
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
    </footer>
  )
}
