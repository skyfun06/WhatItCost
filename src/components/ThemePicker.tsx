'use client'

import { THEME_KEYS, THEMES, getTheme, type ThemeKey } from '@/lib/themes'
import { useTranslation } from '@/hooks/useTranslation'
import {
  CassetteTape,
  Clapperboard,
  Croissant,
  Disc,
  Hourglass,
  LampDesk,
  Martini,
  Palette,
  Save,
  Shield,
  Skull,
  Vault,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Icône Lucide par thème (purement visuel — le champ `emoji` de themes.ts
// n'est plus affiché ici). LampDesk = clin d'œil à la lampe Pixar.
const THEME_ICONS: Record<ThemeKey, LucideIcon> = {
  'annees-80': CassetteTape,
  'annees-90': Save,
  'annees-2000': Disc,
  'super-heros': Zap,
  marvel: Shield,
  'animation-studios': Palette,
  pixar: LampDesk,
  zombies: Skull,
  braquages: Vault,
  'voyage-temporel': Hourglass,
  'cinema-francais': Croissant,
  'james-bond': Martini,
}

/**
 * Sélecteur de thématique : grille uniforme à sélection UNIQUE, même langage
 * visuel que MultiToggle (conteneur #111111, sélection corail #FF4D2E, rayon 6px).
 * Toutes les cellules ont la même taille (auto-fill + gridAutoRows 1fr), icône
 * au-dessus du label, retour à la ligne autorisé pour les libellés longs.
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
    const Icon = key ? THEME_ICONS[key] : Clapperboard
    return (
      <button
        key={key ?? 'none'}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => !disabled && onChange(key)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          minHeight: '72px',
          padding: '10px 8px',
          fontSize: 'clamp(0.68rem, 2.4vw, 0.8rem)',
          lineHeight: 1.2,
          textAlign: 'center',
          color: selected ? '#ffffff' : '#888888',
          fontWeight: selected ? 700 : 400,
          backgroundColor: selected ? '#FF4D2E' : 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          borderRadius: '6px',
          border: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <Icon size={18} strokeWidth={selected ? 2.2 : 1.8} aria-hidden="true" />
        <span>{theme ? t.settings.themes[theme.key] : t.settings.themeNone}</span>
        {theme && !theme.supportsChain && (
          <span
            style={{
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              whiteSpace: 'nowrap',
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
        display: 'grid',
        // auto-fill responsive : ~2 colonnes sur mobile, 3-4 sur desktop.
        gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
        // Toutes les rangées à la hauteur de la plus haute → cellules uniformes.
        gridAutoRows: '1fr',
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
