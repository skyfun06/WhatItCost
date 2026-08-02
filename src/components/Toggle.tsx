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
 * `disabledValues` : options individuellement non sélectionnables (ex: mode
 * Higher or Lower quand un thème Budget-only est choisi).
 */
export default function Toggle<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  disabledValues,
  wrap = false,
}: {
  options: ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  disabledValues?: T[]
  /** Pills qui passent à la ligne (sans indicateur glissant) — pour beaucoup d'options. */
  wrap?: boolean
}) {
  const count = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const isOptDisabled = (v: T) => disabled || (disabledValues?.includes(v) ?? false)

  // ── Variante "wrap" : pills sur plusieurs lignes ──
  if (wrap) {
    return (
      <div className="flex flex-wrap gap-2" style={{ opacity: disabled ? 0.55 : 1 }}>
        {options.map((opt) => {
          const selected = opt.value === value
          const optDisabled = isOptDisabled(opt.value)
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              disabled={optDisabled}
              onClick={() => !optDisabled && onChange(opt.value)}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 'var(--r-pill)',
                color: selected ? '#ffffff' : '#888888',
                fontWeight: selected ? 700 : 400,
                backgroundColor: selected ? 'var(--accent)' : '#111111',
                border: `1px solid ${selected ? 'var(--accent)' : '#333333'}`,
                cursor: optDisabled ? 'not-allowed' : 'pointer',
                opacity: !disabled && optDisabled ? 0.35 : 1,
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
        borderRadius: 'var(--r-sm)',
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
          backgroundColor: 'var(--accent)',
          borderRadius: 'var(--r-sm)',
          transition: 'transform var(--dur-base) var(--ease-liquid)',
        }}
      />

      {options.map((opt) => {
        const selected = opt.value === value
        const optDisabled = isOptDisabled(opt.value)
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            disabled={optDisabled}
            onClick={() => !optDisabled && onChange(opt.value)}
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
              cursor: optDisabled ? 'not-allowed' : 'pointer',
              opacity: !disabled && optDisabled ? 0.35 : 1,
              borderRadius: 'var(--r-sm)',
              background: 'transparent',
              border: 'none',
              whiteSpace: 'nowrap',
              transition: 'color var(--dur-base) var(--ease-snappy)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
