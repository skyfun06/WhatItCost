import { type ReactNode } from 'react'
import { Syne } from 'next/font/google'
import AnimatedBackground from '@/components/AnimatedBackground'

// Coquille commune des pages éditoriales / institutionnelles. Server component.
// Réutilise AnimatedBackground avec des symboles très atténués (0.03) pour ne pas
// nuire à la lecture, puis pose un en-tête (titre Syne + sous-titre) et une colonne
// de contenu lisible centrée.

const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

interface Props {
  title: string
  /** Sous-titre / accroche optionnel sous le titre. */
  intro?: string
  /** Surtitre optionnel (petit label en capitales au-dessus du titre). */
  eyebrow?: string
  children: ReactNode
  /** Largeur max de la colonne de contenu (défaut 720px). */
  maxWidth?: number
}

export default function EditorialPage({ title, intro, eyebrow, children, maxWidth = 720 }: Props) {
  return (
    <AnimatedBackground
      className="min-h-screen px-5 pt-24 pb-20 sm:px-6"
      style={{ backgroundColor: '#111111' }}
      symbolOpacity={0.03}
    >
      <div className="mx-auto w-full" style={{ maxWidth: `${maxWidth}px` }}>
        <header className="mb-10">
          {eyebrow && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: '#FF4D2E' }}>
              {eyebrow}
            </p>
          )}
          <h1
            className={`${syne.className} text-white`}
            style={{ fontSize: 'clamp(2.1rem, 6vw, 3.1rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            {title}
            <span style={{ color: '#FF4D2E' }}>.</span>
          </h1>
          {intro && (
            <p className="mt-5 text-lg leading-relaxed" style={{ color: '#aaaab5', maxWidth: '640px' }}>
              {intro}
            </p>
          )}
        </header>

        {children}
      </div>
    </AnimatedBackground>
  )
}
