import { ImageResponse } from 'next/og'

// Image Open Graph générée dynamiquement (1200x630) — Discord/Twitter/iMessage
// reçoivent toujours une version fraîche.
//   - sans param      → image par défaut (marque)
//   - ?mode=chain&score=29  → "CHAÎNE DE 29 FILMS"
//   - ?mode=budget&score=4200 → "4,200 PTS"
//
// Aligné sur le design « split panel » des scorecards (ShareScorecard) : badge
// de mode, score géant Syne, colonne droite avec cadres d'affiches fantômes +
// motif $ ?, liseré et barre corail. La police Syne est embarquée (TTF statiques
// à côté de cette route) — satori rend donc correctement les accents.
export const runtime = 'edge'

const CORAL = '#FF4D2E'

// Syne 700/800 chargées une fois par instance edge (pattern officiel next/og).
const syneBold = fetch(new URL('./Syne-Bold.ttf', import.meta.url)).then((r) => r.arrayBuffer())
const syneExtraBold = fetch(new URL('./Syne-ExtraBold.ttf', import.meta.url)).then((r) =>
  r.arrayBuffer(),
)

// Cadres d'affiches fantômes : mêmes emplacements que la cascade de la
// scorecard (188×282, rotations alternées), avec un symbole mystère au centre.
const FRAME_SLOTS = [
  { left: 38, top: 16, rotate: -5, symbol: '?' },
  { left: 200, top: 138, rotate: 4, symbol: '$' },
  { left: 70, top: 310, rotate: -2.5, symbol: '?' },
]

// Chrome commun des trois variantes : fond dégradé, glow corail, motif $ ? et
// cadres fantômes à droite, liseré, wordmark et barre corail.
function OgCard({ badge, children }: { badge?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        color: '#ffffff',
        fontFamily: 'Syne',
        backgroundColor: '#0d0d0d',
        backgroundImage: 'linear-gradient(150deg, #181009 0%, #0d0d0d 45%, #0a0a0a 100%)',
      }}
    >
      {/* Glow corail diffus derrière le score */}
      <div
        style={{
          position: 'absolute',
          left: -140,
          top: 110,
          width: 820,
          height: 520,
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255,77,46,0.16) 0%, rgba(255,77,46,0) 65%)',
        }}
      />

      {/* Colonne droite : motif $ ? + cadres d'affiches fantômes */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 430,
          height: 630,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -180,
            top: -160,
            width: 800,
            height: 960,
            display: 'flex',
            flexDirection: 'column',
            transform: 'rotate(-18deg)',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: 38,
                color: '#ffffff',
                opacity: 0.05,
                marginBottom: 36,
                whiteSpace: 'nowrap',
              }}
            >
              {i % 2 === 0 ? '$ ? $ ? $ ? $ ?' : '? $ ? $ ? $ ?'}
            </div>
          ))}
        </div>
        {FRAME_SLOTS.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: 188,
              height: 282,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.16)',
              backgroundImage:
                'linear-gradient(160deg, rgba(255,77,46,0.12) 0%, rgba(255,255,255,0.03) 100%)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
              transform: `rotate(${s.rotate}deg)`,
            }}
          >
            <div style={{ fontSize: 110, fontWeight: 800, color: CORAL, opacity: 0.3 }}>
              {s.symbol}
            </div>
          </div>
        ))}
      </div>

      {/* Liseré corail intérieur */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          border: '1px solid rgba(255,77,46,0.35)',
          borderRadius: 18,
        }}
      />

      {/* Colonne gauche : badge / contenu / wordmark */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 760,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 0 42px 60px',
        }}
      >
        {badge ? (
          <div
            style={{
              display: 'flex',
              padding: '12px 26px',
              borderRadius: 999,
              border: `1.5px solid ${CORAL}`,
              backgroundColor: 'rgba(255,77,46,0.08)',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4.4,
              color: CORAL,
              alignSelf: 'flex-start',
            }}
          >
            {badge}
          </div>
        ) : (
          <div style={{ display: 'flex' }} />
        )}

        {children}

        <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, letterSpacing: 4.8 }}>
          <span style={{ color: '#ffffff' }}>WHATITCOST</span>
          <span style={{ color: CORAL }}>.FR</span>
        </div>
      </div>

      {/* Barre corail de pied de carte */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundImage: 'linear-gradient(90deg, #FF4D2E 0%, #FF7A45 60%, #FF4D2E 100%)',
        }}
      />
    </div>
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const scoreRaw = Number(searchParams.get('score'))
  const score = Number.isFinite(scoreRaw) && scoreRaw >= 0 ? Math.floor(scoreRaw) : null

  const imageOptions = {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Syne', data: await syneBold, weight: 700 as const, style: 'normal' as const },
      { name: 'Syne', data: await syneExtraBold, weight: 800 as const, style: 'normal' as const },
    ],
  }

  // ── Variante "chaîne" : CHAÎNE DE {score} FILMS ──
  if (mode === 'chain' && score !== null) {
    return new ImageResponse(
      (
        <OgCard badge="HIGHER OR LOWER">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 9, color: CORAL }}>
              CHAÎNE DE
            </div>
            {/* String() : satori rejette les enfants numériques */}
            <div style={{ fontSize: 210, fontWeight: 800, lineHeight: 1, marginTop: 8 }}>
              {String(score)}
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: 20.7, marginTop: 10 }}>
              FILMS
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 22 }}>
              Tu fais mieux ?
            </div>
          </div>
        </OgCard>
      ),
      imageOptions,
    )
  }

  // ── Variante "budget" : {score} PTS ──
  if (mode === 'budget' && score !== null) {
    const pretty = new Intl.NumberFormat('en-US').format(score)
    // Même règle que la scorecard : taille ∝ longueur (Syne est large, ~0,85em/chiffre).
    const scoreFontSize = Math.max(48, Math.min(180, Math.floor(700 / pretty.length)))
    return new ImageResponse(
      (
        <OgCard badge="BUDGET GUESS">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <div style={{ fontSize: scoreFontSize, fontWeight: 800, lineHeight: 1 }}>{pretty}</div>
              <div
                style={{
                  fontSize: Math.round(scoreFontSize * 0.24),
                  fontWeight: 700,
                  marginLeft: 16,
                  letterSpacing: 3.3,
                  color: CORAL,
                }}
              >
                PTS
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 24 }}>
              Tu fais mieux ?
            </div>
          </div>
        </OgCard>
      ),
      imageOptions,
    )
  }

  // ── Défaut (marque) ──
  return new ImageResponse(
    (
      <OgCard>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Wordmark empilé : Syne est trop large pour "WHATITCOST?" sur une
              ligne dans les 700px utiles de la colonne gauche. */}
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>WHAT</div>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>IT</div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>
            <span style={{ color: '#ffffff' }}>COST</span>
            <span style={{ color: CORAL }}>?</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 22 }}>
            Devine le budget des films.
          </div>
        </div>
      </OgCard>
    ),
    { width: 1200, height: 630, fonts: imageOptions.fonts },
  )
}
