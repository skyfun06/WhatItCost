'use client'

// Défi du jour — porte d'entrée : intro + lancement, reprise d'un défi en
// cours, ou résultat du jour (un seul essai par jour, état en localStorage).
// Le défi lui-même se joue dans les moteurs existants (/game/[id]).

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Syne } from 'next/font/google'
import AnimatedBackground from '@/components/AnimatedBackground'
import DailyCountdown from '@/components/DailyCountdown'
import { useTranslation } from '@/hooks/useTranslation'
import { getStoredPlayerName } from '@/lib/playerName'
import { getDailyState, saveDailyState, type DailyState } from '@/lib/dailyChallenge'
import { copyText, tweetIntentUrl, SITE_URL } from '@/lib/share'
import { type GameModeType } from '@/lib/gameSettings'

const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

interface DailyInfo {
  date: string
  mode: GameModeType
}

export default function DailyPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [info, setInfo] = useState<DailyInfo | null>(null)
  const [state, setState] = useState<DailyState | null>(null)
  const [ready, setReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setState(getDailyState())
    fetch('/api/daily')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d && d.date ? { date: d.date, mode: d.mode } : null))
      .catch(() => setInfo(null))
      .finally(() => setReady(true))
  }, [])

  const start = useCallback(async () => {
    if (starting) return
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/daily/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: getStoredPlayerName() ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Mêmes clés que le flux solo (/game) : le moteur de jeu est inchangé.
      localStorage.setItem('wic_game_id', data.gameId)
      localStorage.setItem('wic_player_id', data.playerId)
      localStorage.setItem('wic_movies', JSON.stringify(data.movies))
      localStorage.setItem('wic_timer', String(data.timerSeconds ?? 30))
      localStorage.setItem('wic_game_mode_type', String(data.gameMode ?? 'budget_guess'))
      localStorage.setItem('wic_game_mode', 'solo')
      localStorage.setItem('wic_is_host', 'true')
      // Marque ce gameId comme LE défi du jour de ce navigateur (un essai/jour).
      saveDailyState({ date: data.date, gameId: data.gameId, mode: data.gameMode, done: false, score: null })

      router.replace(`/game/${data.gameId}`)
    } catch (e) {
      console.error('[WIC] daily start', e)
      setError(t.daily.loadError)
      setStarting(false)
    }
  }, [starting, router, t])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const modeLabel = (m: GameModeType) => (m === 'higher_or_lower' ? t.daily.modeChain : t.daily.modeBudget)
  const scoreLabel = (s: DailyState) =>
    s.mode === 'higher_or_lower' ? `${s.score ?? 0} ${t.daily.films}` : `${s.score ?? 0} ${t.daily.points}`

  const shareText = state?.done
    ? (state.mode === 'higher_or_lower'
        ? t.daily.shareChain.replace('{n}', String(state.score ?? 0))
        : t.daily.shareBudget.replace('{score}', String(state.score ?? 0)))
    : ''

  const doShare = async () => {
    const text = `${shareText} ${SITE_URL}/daily`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text }); return } catch { /* annulé → fallback copie */ }
    }
    if (await copyText(text)) showToast(t.game.linkCopied)
  }

  return (
    <AnimatedBackground
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: '#111111' }}
    >
      <div
        className="w-full mx-auto flex flex-col items-center text-center p-6 sm:p-10"
        style={{
          maxWidth: '480px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #222222',
          borderRadius: '16px',
          gap: '22px',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <h1 className={`${syne.className} text-white uppercase`} style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', lineHeight: 1 }}>
            {t.daily.title}
            <span style={{ color: '#FF4D2E' }}>.</span>
          </h1>
          {info && (
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#777777' }}>
              {info.date}
            </p>
          )}
        </div>

        {!ready ? (
          <p className="text-sm py-8" style={{ color: '#888' }}>{t.common.loading}</p>
        ) : state?.done ? (
          // ── Déjà joué aujourd'hui : résultat + partage + compte à rebours ──
          <>
            <p className="font-bold" style={{ color: '#FF4D2E' }}>✓ {t.daily.alreadyPlayed}</p>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t.daily.yourScore} — {modeLabel(state.mode)}
              </p>
              <p className="font-bold text-white" style={{ fontSize: 'clamp(2.6rem, 12vw, 4rem)', lineHeight: 1 }}>
                {scoreLabel(state)}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 w-full">
              <button
                onClick={doShare}
                className="flex-1 min-w-[130px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
              >
                {t.game.shareNative}
              </button>
              <button
                onClick={() => window.open(tweetIntentUrl(shareText, `${SITE_URL}/daily`), '_blank', 'noopener,noreferrer')}
                className="flex-1 min-w-[130px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
              >
                {t.game.shareTwitter}
              </button>
            </div>

            <DailyCountdown />

            {/* Étape 2 : classement du jour — emplacement réservé */}
            <p className="text-xs" style={{ color: '#555555' }}>{t.daily.rankingSoon}</p>
          </>
        ) : state && !state.done ? (
          // ── Défi commencé mais pas terminé : reprendre la même partie ──
          <>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.daily.intro}</p>
            <button
              onClick={() => router.push(`/game/${state.gameId}`)}
              className="w-full py-4 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.98]"
              style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
            >
              {t.daily.resume}
            </button>
            <DailyCountdown />
          </>
        ) : (
          // ── Pas encore joué : intro + mode du jour + lancement ──
          <>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.daily.intro}</p>

            {info && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {t.daily.modeLabel}
                </p>
                <p className="font-bold text-white" style={{ fontSize: '1.3rem' }}>{modeLabel(info.mode)}</p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={start}
              disabled={starting || !info}
              className="w-full py-4 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
            >
              {starting ? t.daily.starting : t.daily.play}
            </button>

            <DailyCountdown />
          </>
        )}

        <button
          onClick={() => router.push('/')}
          className="text-xs uppercase tracking-[0.15em] underline"
          style={{ color: '#666666' }}
        >
          {t.game.backHome}
        </button>
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[120] text-sm font-semibold" style={{ bottom: '88px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 18px' }}>
          {toast}
        </div>
      )}
    </AnimatedBackground>
  )
}
