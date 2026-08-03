'use client'

import { type ReactNode } from 'react'

// État vide réutilisable et sobre : un glyphe dans un cercle discret, un titre,
// une ligne de sous-texte, et un slot optionnel pour une action. Fond transparent
// (laisse voir la surface parente), accent et rayons via les tokens de l'étape 1.
export default function EmptyState({
  icon,
  title,
  subtext,
  children,
}: {
  /** Glyphe/icône (ex. une icône lucide). Purement décoratif. */
  icon?: ReactNode
  title: string
  subtext?: string
  /** Action optionnelle (bouton/lien) rendue sous le sous-texte. */
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="mb-1 inline-flex items-center justify-center"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--r-pill)',
            color: 'var(--accent)',
            backgroundColor: 'rgba(255,77,46,0.10)',
            border: '1px solid rgba(255,77,46,0.35)',
          }}
        >
          {icon}
        </span>
      )}
      <p className="font-bold text-white">{title}</p>
      {subtext && (
        <p className="text-sm" style={{ color: '#9a9aa5', maxWidth: '32ch' }}>
          {subtext}
        </p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
