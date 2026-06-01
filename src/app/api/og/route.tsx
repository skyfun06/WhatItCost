import { ImageResponse } from 'next/og'

// Image Open Graph générée dynamiquement (1200x630) — Discord/Twitter/iMessage
// reçoivent toujours une version fraîche.
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

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111111',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Motif $ ? en arrière-plan */}
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

        {/* Titre */}
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, letterSpacing: '-4px' }}>
          <span style={{ color: '#ffffff' }}>WHATITCOST</span>
          <span style={{ color: '#FF4D2E' }}>?</span>
        </div>

        {/* Sous-titre */}
        <div style={{ fontSize: 40, color: '#888888', marginTop: 14 }}>
          Guess the movie budget.
        </div>

        {/* Domaine en bas */}
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
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
