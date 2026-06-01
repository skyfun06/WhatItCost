'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/AnimatedBackground'
import { useTranslation } from '@/hooks/useTranslation'

// ── Valeurs des options ───────────────────────────────────────────────
// Les libellés des sections Rounds / Timer sont neutres (chiffres) ;
// Difficulté / Genre sont traduits via le système i18n.

const ROUND_OPTIONS = [3, 5, 10] as const

const TIMER_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 0, label: '∞' }, // 0 = pas de minuteur
] as const

const DIFFICULTY_KEYS = ['all', 'popular', 'recent', 'classics'] as const
const GENRE_KEYS = ['all', 'action', 'drama', 'comedy', 'horror', 'scifi'] as const

type Difficulty = (typeof DIFFICULTY_KEYS)[number]
type Genre = (typeof GENRE_KEYS)[number]

// ── Toggle façon Discord : une barre unique avec indicateur glissant ──

function Toggle<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  const count = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        backgroundColor: '#111111',
        border: '1px solid #222222',
        borderRadius: '8px',
        padding: '4px',
      }}
    >
      {/* Indicateur glissant — se déplace vers l'option sélectionnée */}
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
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              padding: '10px 2px',
              // S'adapte aux petits écrans (jusqu'à 6 options en ligne) sans déborder
              fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
              color: selected ? '#ffffff' : '#888888',
              fontWeight: selected ? 700 : 400,
              cursor: 'pointer',
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

// ── Section (libellé + toggle) ────────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span
        style={{
          display: 'block',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [rounds, setRounds] = useState<number>(5)
  const [timer, setTimer] = useState<number>(30)
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const [genre, setGenre] = useState<Genre>('all')

  function start(mode: 'solo' | 'multi') {
    const settings = { rounds, timer, difficulty, genre }

    // Persiste pour la session (et pour les écrans suivants du jeu)
    try {
      localStorage.setItem('gameSettings', JSON.stringify(settings))
    } catch {
      // ignore
    }

    // Passe aussi les paramètres dans l'URL pour un partage / refresh robuste
    const qs = new URLSearchParams({
      rounds: String(rounds),
      timer: String(timer),
      difficulty,
      genre,
    }).toString()

    router.push(mode === 'solo' ? `/game?${qs}` : `/lobby/create?${qs}`)
  }

  return (
    <AnimatedBackground
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: '#111111' }}
    >
      <div
        className="w-full mx-auto p-5 sm:p-8"
        style={{
          maxWidth: '560px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #222222',
          borderRadius: '16px',
        }}
      >
        {/* En-tête */}
        <span
          className="text-xs font-bold uppercase"
          style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.22em' }}
        >
          {t.settings.eyebrow}
        </span>
        <h1
          className="text-white font-bold mt-2"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', lineHeight: 1.1 }}
        >
          {t.settings.title}
        </h1>

        {/* Sections de configuration */}
        <div className="flex flex-col" style={{ gap: '20px', marginTop: '28px' }}>
          <Section label={t.settings.rounds}>
            <Toggle
              value={rounds}
              onChange={setRounds}
              options={ROUND_OPTIONS.map((r) => ({ value: r, label: r }))}
            />
          </Section>

          <Section label={t.settings.timer}>
            <Toggle
              value={timer}
              onChange={setTimer}
              options={TIMER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Section>

          <Section label={t.settings.difficulty}>
            <Toggle
              value={difficulty}
              onChange={setDifficulty}
              options={DIFFICULTY_KEYS.map((key) => ({
                value: key,
                label: t.settings.difficulties[key],
              }))}
            />
          </Section>

          <Section label={t.settings.genre}>
            <Toggle
              value={genre}
              onChange={setGenre}
              options={GENRE_KEYS.map((key) => ({
                value: key,
                label: t.settings.genres[key],
              }))}
            />
          </Section>
        </div>

        {/* Boutons de lancement — empilés sur mobile, côte à côte sur sm+ */}
        <div
          className="flex flex-col sm:flex-row"
          style={{ gap: '12px', marginTop: '24px' }}
        >
          <button
            type="button"
            onClick={() => start('solo')}
            className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.97]"
            style={{
              padding: '12px 20px',
              fontSize: '0.8rem',
              backgroundColor: '#FF4D2E',
              borderRadius: '8px',
            }}
          >
            {t.settings.playSolo} →
          </button>
          <button
            type="button"
            onClick={() => start('multi')}
            className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.97]"
            style={{
              padding: '12px 20px',
              fontSize: '0.8rem',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '8px',
            }}
          >
            {t.settings.playFriends} →
          </button>
        </div>
      </div>
    </AnimatedBackground>
  )
}
