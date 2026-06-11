'use client'

// Scorecard de partage commune aux trois variantes (Budget Guess, chaîne Higher
// or Lower, Défi du jour). Rendue en 1200×630 (ratio Open Graph) dans les modals
// de fin de partie, puis capturée par html2canvas (cf. src/lib/share.ts).
//
// Contraintes html2canvas : pas de filter/backdrop-filter, dégradés CSS simples,
// affiches servies same-origin via /api/poster (canvas non tainté, cf. proxy).
// Anti-chevauchement : le contenu texte vit dans la colonne gauche (760px), les
// affiches et le motif « $ ? » dans la colonne droite (430px) — zones disjointes,
// et la taille du score s'adapte à sa longueur pour ne jamais déborder.

import { forwardRef } from 'react'
import { Syne } from 'next/font/google'
import { useTranslation } from '@/hooks/useTranslation'
import { formatScore } from '@/lib/utils/format'

// Police Syne (identité visuelle) pour la scorecard partageable.
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' })

const CORAL = '#FF4D2E'

export interface ScorecardPoster {
  id: number
  title: string
  posterPath: string
}

interface Props {
  variant: 'budget' | 'chain'
  /** Défi du jour : badge corail plein + date à la place du badge de mode. */
  daily?: boolean
  /** Points (budget) ou longueur de chaîne (chain). */
  score: number
  /** Budget : score maximal possible de la partie. */
  maxScore?: number
  /** Budget : verdict de performance. */
  verdict?: string
  /** Chain : nouveau record perso. */
  newRecord?: boolean
  /** Affiches de la partie (3 max affichées), chemins TMDB bruts. */
  posters: ScorecardPoster[]
  /** Échelle d'aperçu du modal — html2canvas capture la taille native 1200×630. */
  previewScale: number
}

// Emplacements de la cascade d'affiches dans la colonne droite (188×282, ratio
// 2:3) : overlap léger + rotations alternées pour la profondeur.
const POSTER_SLOTS = [
  { left: 38, top: 16, rotate: -5 },
  { left: 200, top: 138, rotate: 4 },
  { left: 70, top: 310, rotate: -2.5 },
] as const

const ShareScorecard = forwardRef<HTMLDivElement, Props>(function ShareScorecard(
  { variant, daily = false, score, maxScore, verdict, newRecord = false, posters, previewScale },
  ref,
) {
  const { t, locale } = useTranslation()

  const modeLabel = variant === 'budget' ? t.game.cardModeBudget : t.game.cardModeChain
  // Date du défi en cours (le défi tourne à minuit UTC, cf. dailyDateUTC).
  const dailyDate = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date())

  // Taille du score adaptée à sa longueur : « 8 » comme « 16 394 » tiennent dans
  // les ~700px utiles de la colonne gauche. Syne est une police LARGE : un chiffre
  // en 800 fait ≈ 0.85em, d'où le coefficient prudent (+ place pour « PTS »).
  const scoreStr = variant === 'budget' ? formatScore(score) : String(score)
  const scoreFontSize =
    variant === 'budget' ? Math.max(48, Math.min(180, Math.floor(700 / scoreStr.length))) : 210

  return (
    <div
      ref={ref}
      className={syne.className}
      style={{
        width: '1200px',
        height: '630px',
        transform: `scale(${previewScale})`,
        transformOrigin: 'top left',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
        backgroundColor: '#0d0d0d',
        backgroundImage: 'linear-gradient(150deg, #181009 0%, #0d0d0d 45%, #0a0a0a 100%)',
      }}
    >
      {/* Glow corail diffus derrière le score */}
      <div
        style={{
          position: 'absolute',
          left: '-140px',
          top: '110px',
          width: '820px',
          height: '520px',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,77,46,0.16) 0%, rgba(255,77,46,0) 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Motif « $ ? » confiné à la colonne droite, derrière les affiches */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '430px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-40%',
            transform: 'rotate(-18deg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '36px',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                whiteSpace: 'nowrap',
                fontSize: '42px',
                fontWeight: 700,
                letterSpacing: '38px',
                color: '#ffffff',
                opacity: 0.05,
                lineHeight: 1,
              }}
            >
              {i % 2 === 0 ? '$ ? $ ? $ ? $ ? $ ?' : '? $ ? $ ? $ ? $ ? $'}
            </div>
          ))}
        </div>
      </div>

      {/* Liseré corail intérieur (sous les affiches, qui le chevauchent → profondeur) */}
      <div
        style={{
          position: 'absolute',
          inset: '16px',
          border: '1px solid rgba(255,77,46,0.35)',
          borderRadius: '18px',
          pointerEvents: 'none',
        }}
      />

      {/* Cascade d'affiches (colonne droite) */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '430px', zIndex: 2 }}>
        {posters.slice(0, POSTER_SLOTS.length).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={`/api/poster?path=${encodeURIComponent(p.posterPath)}&size=w342`}
            alt={p.title}
            crossOrigin="anonymous"
            width={188}
            height={282}
            style={{
              position: 'absolute',
              left: `${POSTER_SLOTS[i].left}px`,
              top: `${POSTER_SLOTS[i].top}px`,
              width: '188px',
              height: '282px',
              objectFit: 'cover',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
              transform: `rotate(${POSTER_SLOTS[i].rotate}deg)`,
            }}
          />
        ))}
      </div>

      {/* Colonne gauche : badge / score / wordmark — jamais sous les affiches */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '760px',
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 0 42px 60px',
        }}
      >
        {/* Badge de mode (corail plein + date pour le Défi du jour) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 26px',
              borderRadius: '999px',
              border: daily ? 'none' : `1.5px solid ${CORAL}`,
              backgroundColor: daily ? CORAL : 'rgba(255,77,46,0.08)',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: daily ? '#ffffff' : CORAL,
                whiteSpace: 'nowrap',
              }}
            >
              {daily ? `${t.daily.title} · ${dailyDate}` : modeLabel}
            </span>
          </div>
          {daily && (
            <span
              style={{
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                whiteSpace: 'nowrap',
              }}
            >
              {modeLabel}
            </span>
          )}
        </div>

        {/* Bloc central — layout bloc + marges explicites, lineHeight 1 : html2canvas
            gère mal `gap` flexbox et les line-height < 1 sur les très gros corps
            (textes superposés dans la capture). */}
        {variant === 'budget' ? (
          <div>
            <p style={{ fontSize: `${scoreFontSize}px`, fontWeight: 800, lineHeight: 1, margin: 0, whiteSpace: 'nowrap' }}>
              {scoreStr}
              <span
                style={{
                  fontSize: `${Math.round(scoreFontSize * 0.24)}px`,
                  fontWeight: 700,
                  marginLeft: '16px',
                  letterSpacing: '0.12em',
                  color: CORAL,
                }}
              >
                {t.game.points.toUpperCase()}
              </span>
            </p>
            {verdict && (
              // marge ∝ taille du score : html2canvas peint les très gros corps
              // ~0,2em sous leur boîte de layout (baseline recalculée) — sans
              // cette réserve, le verdict chevauche les chiffres dans la capture.
              <p style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.2, margin: `${Math.round(scoreFontSize * 0.42)}px 0 0` }}>{verdict} 🎬</p>
            )}
            {typeof maxScore === 'number' && maxScore > 0 && (
              <p style={{ fontSize: '22px', lineHeight: 1.2, color: 'rgba(255,255,255,0.45)', margin: '14px 0 0' }}>
                {t.game.cardOutOf.replace('{max}', formatScore(maxScore))}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: '30px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: CORAL,
                margin: 0,
              }}
            >
              {t.game.holCardChain}
            </p>
            <p style={{ fontSize: `${scoreFontSize}px`, fontWeight: 800, lineHeight: 1, margin: '8px 0 0' }}>
              {scoreStr}
            </p>
            <p
              style={{
                fontSize: '46px',
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '0.45em',
                textTransform: 'uppercase',
                // Réserve sous le grand chiffre (cf. quirk html2canvas côté budget)
                margin: `${Math.round(scoreFontSize * 0.26)}px 0 0`,
              }}
            >
              {t.game.holCardFilms}
            </p>
            {newRecord && (
              <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.2, color: CORAL, margin: '18px 0 0' }}>
                🏆 {t.game.holNewRecord}
              </p>
            )}
          </div>
        )}

        {/* Wordmark / URL — où jouer, discret mais lisible en miniature */}
        <p style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.2em', margin: 0 }}>
          WHATITCOST<span style={{ color: CORAL }}>.FR</span>
        </p>
      </div>

      {/* Barre corail de pied de carte */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '10px',
          background: 'linear-gradient(90deg, #FF4D2E 0%, #FF7A45 60%, #FF4D2E 100%)',
          zIndex: 5,
        }}
      />
    </div>
  )
})

export default ShareScorecard
