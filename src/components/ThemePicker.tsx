'use client'

import { THEME_KEYS, THEMES, getTheme, type ThemeKey } from '@/lib/themes'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Sélecteur de thématique : pills wrap à sélection UNIQUE, même langage visuel
 * que MultiToggle (conteneur #111111, sélection corail #FF4D2E, rayon 6px).
 * Première option « Aucun thème » (= tirage normal, valeur undefined).
 * Les thèmes Budget-only portent un badge discret « Budget Guess ».
 * `disabled` : lecture seule (invités du lobby).
 */
export default function ThemePicker({
  value,
  onChange,
  disabled = false,
}: {
  /** Clé du thème sélectionné, ou undefined (aucun thème). */
  value?: string
  onChange: (theme: ThemeKey | undefined) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const selectedKey = getTheme(value)?.key

  function pill(key: ThemeKey | undefined) {
    const selected = key === selectedKey
    const theme = key ? THEMES[key] : undefined
    return (
      <button
        key={key ?? 'none'}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => !disabled && onChange(key)}
        style={{
          padding: '10px 14px',
          fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
          color: selected ? '#ffffff' : '#888888',
          fontWeight: selected ? 700 : 400,
          backgroundColor: selected ? '#FF4D2E' : 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          borderRadius: '6px',
          border: 'none',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span aria-hidden="true">{theme ? theme.emoji : '🎬'}</span>
        <span>{theme ? t.settings.themes[theme.key] : t.settings.themeNone}</span>
        {theme && !theme.supportsChain && (
          <span
            style={{
              fontSize: '0.58rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              opacity: selected ? 0.9 : 0.55,
              border: `1px solid ${selected ? 'rgba(255,255,255,0.5)' : '#444444'}`,
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            {t.settings.gameModes.budget_guess}
          </span>
        )}
      </button>
    )
  }

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
      {pill(undefined)}
      {THEME_KEYS.map((key) => pill(key))}
    </div>
  )
}
