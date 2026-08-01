'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Trophy, SlidersHorizontal, User, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

// ─────────────────────────────────────────────────────────────────────────────
// Dock de navigation MOBILE UNIQUEMENT (masqué en `md:` et au-dessus — le desktop
// garde sa nav actuelle : logo + footer). Barre sombre arrondie fixée en bas, 4
// onglets, et une bille orange lumineuse qui glisse jusqu'à l'onglet actif en se
// logeant dans un creux de la barre (effet « ménisque » via filtre SVG goo).
//
// Repli propre : si prefers-reduced-motion est actif (ou le goo non voulu), la
// bille reste simplement posée sur la barre — pas de fusion liquide, pas de
// glissement — et le menu reste nickel.
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = '#FF4D2E'
const BAR_BG = '#1a1a1a'

// Géométrie (px). La barre occupe le bas ; la bille flotte au-dessus de son bord.
const CONTAINER_H = 88
const BAR_H = 60
const BALL = 46
const CRADLE = 54
const BALL_CENTER_Y = 20 // centre vertical de la bille (au-dessus du bord de barre)
const CRADLE_CENTER_Y = 26 // le cercle sombre du creux, un peu plus bas → bulle vers la bille
const SLIDE = 'transform 0.45s cubic-bezier(0.34, 1.4, 0.5, 1)' // glisse doux + léger rebond

type Tab = { href: string; icon: LucideIcon; label: { fr: string; en: string } }

const TABS: Tab[] = [
  { href: '/', icon: Home, label: { fr: 'Accueil', en: 'Home' } },
  { href: '/leaderboard', icon: Trophy, label: { fr: 'Classement', en: 'Leaderboard' } },
  { href: '/settings', icon: SlidersHorizontal, label: { fr: 'Paramètres', en: 'Settings' } },
  // TODO(compte): aucune page « Compte » n'existe encore (pas d'auth/profil dans le
  // projet). Route provisoire /compte À CRÉER — le tap y renverra un 404 tant qu'elle
  // n'existe pas. Repointer vers la vraie page dès qu'elle est en place.
  { href: '/compte', icon: User, label: { fr: 'Compte', en: 'Account' } },
]

// Le dock est masqué pendant une partie / dans le flux de jeu.
const HIDDEN_PREFIXES = ['/game', '/daily', '/lobby', '/join', '/results']

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function MobileDock() {
  const pathname = usePathname() || '/'
  const { locale } = useTranslation()
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Masqué pendant une partie / dans le flux de jeu.
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const liquid = !reducedMotion
  const activeIndex = TABS.findIndex((t) => isActive(pathname, t.href))
  const ActiveIcon = activeIndex >= 0 ? TABS[activeIndex].icon : null

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Filtre goo (flou + seuil alpha) : fusionne la barre et le cercle du creux
          en une seule surface → le bord de la barre se courbe pour épouser la bille. */}
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="dockGoo" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="over" />
          </filter>
        </defs>
      </svg>

      <div
        className="relative pointer-events-auto"
        style={{ width: 'min(100vw - 24px, 380px)', height: CONTAINER_H, marginBottom: 12 }}
      >
        {/* Couche filtrée (goo) : barre + cercle sombre du creux, même couleur. */}
        <div className="absolute inset-0" style={{ filter: liquid ? 'url(#dockGoo)' : undefined }}>
          {/* Barre */}
          <div
            className="absolute inset-x-0"
            style={{
              bottom: 0,
              height: BAR_H,
              borderRadius: BAR_H / 2,
              background: BAR_BG,
              border: '1px solid #222',
            }}
          />
          {/* Creux : cercle sombre à la position active (uniquement en mode liquide). */}
          {liquid && activeIndex >= 0 && (
            <div
              className="absolute left-0 top-0 h-full"
              style={{ width: '25%', transform: `translateX(${activeIndex * 100}%)`, transition: SLIDE }}
            >
              <div
                className="absolute"
                style={{
                  left: '50%',
                  top: CRADLE_CENTER_Y - CRADLE / 2,
                  width: CRADLE,
                  height: CRADLE,
                  borderRadius: '50%',
                  background: BAR_BG,
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          )}
        </div>

        {/* Couche nette (non filtrée) : bille orange + icônes + libellé actif. */}
        <div className="absolute inset-0">
          {/* Bille orange lumineuse (glisse jusqu'à l'onglet actif). */}
          {activeIndex >= 0 && (
            <div
              className="absolute left-0 top-0 h-full"
              style={{
                width: '25%',
                transform: `translateX(${activeIndex * 100}%)`,
                transition: liquid ? SLIDE : 'none',
              }}
            >
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: '50%',
                  top: BALL_CENTER_Y - BALL / 2,
                  width: BALL,
                  height: BALL,
                  borderRadius: '50%',
                  background: ACCENT,
                  transform: 'translateX(-50%)',
                  boxShadow: `0 6px 20px ${ACCENT}88, 0 0 14px ${ACCENT}66, inset 0 0 0 1px rgba(255,255,255,0.12)`,
                }}
              >
                {ActiveIcon && <ActiveIcon size={22} strokeWidth={2.4} color="#ffffff" />}
              </div>
            </div>
          )}

          {/* Onglets : zone tactile pleine hauteur de la barre. */}
          <ul className="absolute inset-x-0 bottom-0 flex" style={{ height: BAR_H }}>
            {TABS.map((tab, i) => {
              const active = i === activeIndex
              const Icon = tab.icon
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-label={tab.label[locale]}
                    aria-current={active ? 'page' : undefined}
                    className="relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {active ? (
                      // Libellé de l'onglet actif, sous la bille.
                      <span
                        className="uppercase"
                        style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: '#ffffff', fontWeight: 700 }}
                      >
                        {tab.label[locale]}
                      </span>
                    ) : (
                      <Icon size={22} strokeWidth={2} color="#8a8a97" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}
