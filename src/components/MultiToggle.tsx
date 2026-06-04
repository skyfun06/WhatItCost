'use client'

import { type ReactNode } from 'react'

export interface MultiToggleOption<T> {
  value: T
  label: ReactNode
}

/**
 * Variante multi-sélection de Toggle : plusieurs options peuvent être actives en
 * même temps. Même style visuel que Toggle (sélectionné = corail #FF4D2E / texte
 * blanc / gras ; non sélectionné = fond sombre / texte gris), mais sans indicateur
 * glissant (impossible avec plusieurs sélections) — chaque bouton porte son fond.
 *
 * - `wrap` : pills arrondis sur plusieurs lignes (genres).
 * - sinon  : boutons rectangle alignés dans une barre (difficultés).
 *
 * La logique « Tous » (collapse) est gérée en amont par toggleMultiSelect.
 */
export default function MultiToggle<T extends string>({
  options,
  values,
  onToggle,
  disabled = false,
  wrap = false,
}: {
  options: MultiToggleOption<T>[]
  values: T[]
  onToggle: (v: T) => void
  disabled?: boolean
  wrap?: boolean
}) {
  const selectedSet = new Set(values)

  // ── Variante "wrap" : boutons rectangle arrondis sur plusieurs lignes (genres) ──
  // Style de bouton IDENTIQUE à la variante barre (difficultés) : même conteneur
  // sombre, même rayon (6px), même hauteur/padding ; seul le retour à la ligne
  // change (trop d'options pour une seule rangée).
  if (wrap) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          backgroundColor: '#111111',
          border: '1px solid #222222',
          borderRadius: '8px',
          padding: '4px',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {options.map((opt) => {
          const selected = selectedSet.has(opt.value)
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => !disabled && onToggle(opt.value)}
              style={{
                padding: '10px 16px',
                fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
                color: selected ? '#ffffff' : '#888888',
                fontWeight: selected ? 700 : 400,
                backgroundColor: selected ? '#FF4D2E' : 'transparent',
                cursor: disabled ? 'default' : 'pointer',
                borderRadius: '6px',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  // ── Variante barre : boutons rectangle alignés (difficultés) ──
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        backgroundColor: '#111111',
        border: '1px solid #222222',
        borderRadius: '8px',
        padding: '4px',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {options.map((opt) => {
        const selected = selectedSet.has(opt.value)
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => !disabled && onToggle(opt.value)}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              padding: '10px 2px',
              fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
              color: selected ? '#ffffff' : '#888888',
              fontWeight: selected ? 700 : 400,
              backgroundColor: selected ? '#FF4D2E' : 'transparent',
              cursor: disabled ? 'default' : 'pointer',
              borderRadius: '6px',
              border: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
