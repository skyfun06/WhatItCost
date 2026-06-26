import Link from 'next/link'

// Footer global, monté dans le layout racine — visible sur tout le site.
// Server component statique (FR) : aucun hook, contenu indexable partout, ce qui
// donne aux pages éditoriales/légales des liens internes crawlables (bon signal
// pour l'indexation et pour AdSense). Il s'affiche sous le contenu plein écran du
// jeu, sans en altérer la mise en page.

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Accueil' },
  { href: '/blog', label: 'Blog' },
  { href: '/comment-jouer', label: 'Comment jouer' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
  { href: '/leaderboard', label: 'Classement' },
]

const LEGAL: Array<{ href: string; label: string }> = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/confidentialite', label: 'Confidentialité' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="relative z-10 border-t border-white/5 mt-auto"
      style={{ backgroundColor: '#0c0c0c' }}
    >
      {/* Padding bas généreux : la bannière café (fixée, masquable) ne recouvre pas
          les liens sur les pages courtes. */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-28 sm:pb-16">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Marque + intention */}
          <div className="flex flex-col gap-2 max-w-xs">
            <span className="font-bold text-lg tracking-tight text-white">
              WhatItCost<span style={{ color: '#FF4D2E' }}>?</span>
            </span>
            <p className="text-sm leading-relaxed" style={{ color: '#888899' }}>
              Le jeu qui teste ton flair pour les budgets de cinéma. Devine combien
              a coûté chaque film, seul, entre amis ou dans le défi du jour.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Navigation du pied de page" className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#555566' }}>
              Explorer
            </span>
            <ul className="flex flex-col gap-2">
              {NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: '#aaaab5' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Légal */}
          <nav aria-label="Informations légales" className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#555566' }}>
              Légal
            </span>
            <ul className="flex flex-col gap-2">
              {LEGAL.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: '#aaaab5' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div
          className="mt-10 pt-6 border-t border-white/5 text-xs"
          style={{ color: '#555566' }}
        >
          © {year} WhatItCost — Projet indépendant. Les données de films proviennent de
          l'API TMDB. Ce produit n'est ni approuvé ni certifié par TMDB.
        </div>
      </div>
    </footer>
  )
}
