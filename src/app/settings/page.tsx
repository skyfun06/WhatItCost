'use client'

import { Suspense, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AnimatedBackground from '@/components/AnimatedBackground'
import Toggle from '@/components/Toggle'
import MultiToggle from '@/components/MultiToggle'
import { useTranslation } from '@/hooks/useTranslation'
import {
  ROUND_OPTIONS,
  TIMER_OPTIONS,
  DIFFICULTY_KEYS,
  GENRE_KEYS,
  GAME_MODE_KEYS,
  toggleMultiSelect,
  type Difficulty,
  type Genre,
  type GameModeType,
} from '@/lib/gameSettings'

// ── Section (libellé + toggle) ────────────────────────────────────────
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span
        style={{
          display: 'block',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '8px',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function SettingsContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') // 'solo' | 'multiplayer' | null

  const [rounds, setRounds] = useState<number>(5)
  const [timer, setTimer] = useState<number>(30)
  const [difficulties, setDifficulties] = useState<Difficulty[]>(['popular'])
  const [genres, setGenres] = useState<Genre[]>(['all'])
  const [gameMode, setGameMode] = useState<GameModeType>('budget_guess')

  function start(target: 'solo' | 'multi') {
    const params = new URLSearchParams({
      rounds: String(rounds),
      timer: String(timer),
      gameMode,
    })
    // Multi-sélection → un paramètre répété (lu via getAll côté destination).
    difficulties.forEach((d) => params.append('difficulties', d))
    genres.forEach((g) => params.append('genres', g))
    const qs = params.toString()
    try {
      localStorage.setItem('gameSettings', JSON.stringify({ rounds, timer, difficulties, genres, gameMode }))
    } catch {
      // ignore
    }
    router.push(target === 'solo' ? `/game?${qs}` : `/lobby/create?${qs}`)
  }

  return (
    <AnimatedBackground
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: '#111111' }}
    >
      <div
        className="w-full mx-auto p-5 sm:p-8"
        style={{ maxWidth: '560px', backgroundColor: '#1a1a1a', border: '1px solid #222222', borderRadius: '16px' }}
      >
        <span className="text-xs font-bold uppercase" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.22em' }}>
          {t.settings.eyebrow}
        </span>
        <h1 className="text-white font-bold mt-2" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', lineHeight: 1.1 }}>
          {t.settings.title}
        </h1>

        <div className="flex flex-col" style={{ gap: '28px', marginTop: '28px' }}>
          <Section label={t.settings.rounds}>
            <Toggle value={rounds} onChange={setRounds} options={ROUND_OPTIONS.map((r) => ({ value: r, label: r }))} />
          </Section>

          <Section label={t.settings.timer}>
            <Toggle value={timer} onChange={setTimer} options={TIMER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </Section>

          <Section label={t.settings.gameMode}>
            <Toggle
              value={gameMode}
              onChange={setGameMode}
              options={GAME_MODE_KEYS.map((key) => ({ value: key, label: t.settings.gameModes[key] }))}
            />
          </Section>

          <Section label={t.settings.difficulty}>
            <MultiToggle
              values={difficulties}
              onToggle={(v) => setDifficulties((cur) => toggleMultiSelect(cur, v, DIFFICULTY_KEYS, ['popular']))}
              options={DIFFICULTY_KEYS.map((key) => ({ value: key, label: t.settings.difficulties[key] }))}
            />
          </Section>

          <Section label={t.settings.genre}>
            <MultiToggle
              values={genres}
              onToggle={(v) => setGenres((cur) => toggleMultiSelect(cur, v, GENRE_KEYS, ['all']))}
              wrap
              options={GENRE_KEYS.map((key) => ({ value: key, label: t.settings.genres[key] }))}
            />
          </Section>
        </div>

        {/* Bouton(s) de lancement — selon le mode choisi sur l'accueil */}
        <div className="flex flex-col sm:flex-row" style={{ gap: '12px', marginTop: '24px' }}>
          {mode === 'solo' ? (
            <button
              type="button"
              onClick={() => start('solo')}
              className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.97]"
              style={{ padding: '12px 20px', fontSize: '0.8rem', backgroundColor: '#FF4D2E', borderRadius: '8px' }}
            >
              {t.settings.startGame} →
            </button>
          ) : mode === 'multiplayer' ? (
            <button
              type="button"
              onClick={() => start('multi')}
              className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.97]"
              style={{ padding: '12px 20px', fontSize: '0.8rem', backgroundColor: '#FF4D2E', borderRadius: '8px' }}
            >
              {t.settings.createGame} →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => start('solo')}
                className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.97]"
                style={{ padding: '12px 20px', fontSize: '0.8rem', backgroundColor: '#FF4D2E', borderRadius: '8px' }}
              >
                {t.settings.playSolo} →
              </button>
              <button
                type="button"
                onClick={() => start('multi')}
                className="flex-1 min-h-[44px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.97]"
                style={{ padding: '12px 20px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px' }}
              >
                {t.settings.playFriends} →
              </button>
            </>
          )}
        </div>
      </div>
    </AnimatedBackground>
  )
}

// useSearchParams() doit être sous une frontière Suspense (App Router)
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}
