import { ReactNode, CSSProperties } from 'react'

// Parallel diagonal stripes of "$ ? $ ? …", each rotated -30° and drifting along
// its own axis. Every line holds TWO identical copies of the symbol sequence, so
// sliding by exactly one copy (translateX 50% of the doubled track) reaches a
// pixel-identical frame — the loop resets invisibly.
const LINE_STEP = 18 // % between consecutive lines (vertical spacing)
const TOP_START = -45 // % — first line starts well above the screen
const BOTTOM_END = 160 // % — last line sits well below the screen
// Enough lines to span the whole screen, including corners the -30° tilt reaches.
const LINES = Math.ceil((BOTTOM_END - TOP_START) / LINE_STEP) + 1
const SYMBOLS_PER_COPY = 40 // even → the $/? phase realigns after one copy
const SYMBOL_GAP = 90 // px between symbols

const oneCopy = Array.from({ length: SYMBOLS_PER_COPY }, (_, i) => (i % 2 === 0 ? '$' : '?'))
const trackSymbols = [...oneCopy, ...oneCopy] // two copies back to back

const symbolStyle: CSSProperties = {
  display: 'inline-block',
  marginRight: `${SYMBOL_GAP}px`,
  // Plus petits sur mobile, taille d'origine sur grand écran
  fontSize: 'clamp(2rem, 8vw, 3.5rem)',
  color: 'white',
  opacity: 0.06,
  lineHeight: 1,
}

/**
 * Couche de motif « $ ? » seule (keyframes + bandes diagonales), positionnée en
 * `absolute inset-0` : elle remplit son parent positionné. Extraite pour pouvoir
 * être réutilisée à l'identique par le fond GLOBAL du site (cf. layout.tsx), de
 * sorte qu'on n'a qu'UN seul système de motif, jamais dupliqué côté footer.
 */
export function MotifStripes({ symbolOpacity = 0.06 }: { symbolOpacity?: number }) {
  const symbol: CSSProperties = { ...symbolStyle, opacity: symbolOpacity }
  return (
    <>
      <style>{`
        /* Travel = one copy (50% of the doubled track) → seamless. */
        @keyframes wicSlideRight {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        @keyframes wicSlideLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* Diagonal stripes — behind the content */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        {Array.from({ length: LINES }, (_, line) => {
          const towardTopRight = line % 2 === 0
          // Fixed vertical step keeps lines evenly + generously spaced, while
          // LINES is sized to span the whole screen (no bare corners).
          const top = TOP_START + line * LINE_STEP
          return (
            <div
              key={line}
              className="absolute"
              style={{
                top: `${top}%`,
                left: '-75%',
                width: '250%',
                transform: 'rotate(-30deg)',
                transformOrigin: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 'max-content',
                  willChange: 'transform',
                  animation: `${towardTopRight ? 'wicSlideRight' : 'wicSlideLeft'} 240s linear infinite`,
                }}
              >
                {trackSymbols.map((sym, i) => (
                  <span key={i} style={symbol}>
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Opacity of the $ / ? symbols (default 0.06). Raise it for more contrast. */
  symbolOpacity?: number
}

export default function AnimatedBackground({
  children,
  className = '',
  style,
  symbolOpacity = 0.06,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: '#111111', ...style }}
    >
      <MotifStripes symbolOpacity={symbolOpacity} />

      {/* Content sits above the animation */}
      <div className="relative w-full" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
