import { ImageResponse } from 'next/og'

// Image Open Graph générée dynamiquement (1200x630) — Discord/Twitter/iMessage
// reçoivent toujours une version fraîche.
//   - sans param      → image par défaut (marque)
//   - ?mode=chain&score=29  → "CHAÎNE DE 29 FILMS"
//   - ?mode=budget&score=4200 → "4,200 PTS"
export const runtime = 'edge'

// Symboles $ / ? dispersés en fond, faible opacité
const SYMBOLS = [
  { c: '$', top: 48, left: 90, size: 96 },
  { c: '?', top: 96, left: 1030, size: 120 },
  { c: '?', top: 412, left: 110, size: 130 },
  { c: '$', top: 470, left: 970, size: 96 },
  { c: '$', top: 250, left: 1110, size: 72 },
  { c: '?', top: 300, left: 24, size: 84 },
  { c: '$', top: 540, left: 540, size: 64 },
  { c: '?', top: 16, left: 560, size: 64 },
]

function Background() {
  return (
    <>
      {SYMBOLS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            fontSize: s.size,
            fontWeight: 700,
            color: '#ffffff',
            opacity: 0.06,
          }}
        >
          {s.c}
        </div>
      ))}
    </>
  )
}

function Footer() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 42,
        fontSize: 28,
        fontWeight: 700,
        color: '#FF4D2E',
        letterSpacing: '2px',
      }}
    >
      whatitcost.fr
    </div>
  )
}

const shell = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#111111',
  position: 'relative' as const,
  fontFamily: 'sans-serif',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const scoreRaw = Number(searchParams.get('score'))
  const score = Number.isFinite(scoreRaw) && scoreRaw >= 0 ? Math.floor(scoreRaw) : null

  // ── Variante "chaîne" : CHAÎNE DE {score} FILMS ──
  if (mode === 'chain' && score !== null) {
    return new ImageResponse(
      (
        <div style={shell}>
          <Background />
          <div style={{ fontSize: 44, fontWeight: 700, color: '#FF4D2E', letterSpacing: '4px', textTransform: 'uppercase' }}>
            CHAINE DE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 320, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{score}</span>
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: '#ffffff', letterSpacing: '8px', textTransform: 'uppercase', marginTop: 4 }}>
            FILMS
          </div>
          <div style={{ fontSize: 36, color: '#888888', marginTop: 20 }}>Tu fais mieux ?</div>
          <Footer />
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // ── Variante "budget" : {score} PTS ──
  if (mode === 'budget' && score !== null) {
    const pretty = new Intl.NumberFormat('en-US').format(score)
    return new ImageResponse(
      (
        <div style={shell}>
          <Background />
          <div style={{ fontSize: 40, fontWeight: 700, color: '#FF4D2E', letterSpacing: '4px', textTransform: 'uppercase' }}>
            MON SCORE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontSize: 240, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{pretty}</span>
            <span style={{ fontSize: 80, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginLeft: 16 }}>PTS</span>
          </div>
          <div style={{ fontSize: 36, color: '#888888', marginTop: 20 }}>Tu fais mieux ?</div>
          <Footer />
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // ── Défaut (marque) — inchangé ──
  return new ImageResponse(
    (
      <div style={shell}>
        <Background />
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, letterSpacing: '-4px' }}>
          <span style={{ color: '#ffffff' }}>WHATITCOST</span>
          <span style={{ color: '#FF4D2E' }}>?</span>
        </div>
        <div style={{ fontSize: 40, color: '#888888', marginTop: 14 }}>Guess the movie budget.</div>
        <Footer />
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
