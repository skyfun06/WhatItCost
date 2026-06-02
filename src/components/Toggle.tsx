'use client'

import { type ReactNode } from 'react'

export interface ToggleOption<T> {
  value: T
  label: ReactNode
}

/**
 * Sélecteur façon Discord : une barre unique avec un indicateur corail qui
 * glisse vers l'option sélectionnée. Partagé par la page Réglages et le lobby.
 * `disabled` : lecture seule (utilisé pour les invités dans le lobby).
 */
export default function Toggle<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  wrap = false,
}: {
  options: ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  /** Pills qui passent à la ligne (sans indicateur glissant) — pour beaucoup d'options. */
  wrap?: boolean
}) {
  const count = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  // ── Variante "wrap" : pills sur plusieurs lignes ──
  if (wrap) {
    return (
      <div className="flex flex-wrap gap-2" style={{ opacity: disabled ? 0.55 : 1 }}>
        {options.map((opt) => {
          const selected = opt.value === value
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '999px',
                color: selected ? '#ffffff' : '#888888',
                fontWeight: selected ? 700 : 400,
                backgroundColor: selected ? '#FF4D2E' : '#111111',
                border: `1px solid ${selected ? '#FF4D2E' : '#333333'}`,
                cursor: disabled ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        backgroundColor: '#111111',
        border: '1px solid #222222',
        borderRadius: '8px',
        padding: '4px',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {/* Indicateur glissant */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '4px',
          bottom: '4px',
          left: '4px',
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
          backgroundColor: '#FF4D2E',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
        }}
      />

      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              padding: '10px 2px',
              fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
              color: selected ? '#ffffff' : '#888888',
              fontWeight: selected ? 700 : 400,
              cursor: disabled ? 'default' : 'pointer',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
