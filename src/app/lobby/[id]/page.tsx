'use client'

import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/hooks/useTranslation'
import AnimatedBackground from '@/components/AnimatedBackground'
import Toggle from '@/components/Toggle'
import {
  ROUND_OPTIONS,
  TIMER_OPTIONS,
  DIFFICULTY_KEYS,
  GENRE_KEYS,
  GAME_MODE_KEYS,
  DEFAULT_SETTINGS,
  sanitizeSettings,
  type GameSettings,
} from '@/lib/gameSettings'

interface Player {
  id: string
  name: string
  is_host: boolean
  total_score: number
}

const labelStyle = { letterSpacing: '0.12em', color: '#555555' } as const

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase" style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

export default function LobbyRoomPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslation()
  const gameId = params.id as string

  const [players, setPlayers] = useState<Player[]>([])
  const [gameCode, setGameCode] = useState('')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)

  const redirectToGame = useCallback(() => {
    console.log(`[WIC] lobby: redirection → /game/${gameId}`)
    router.replace(`/game/${gameId}`)
  }, [gameId, router])

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('wic_player_id')
    const storedIsHost = localStorage.getItem('wic_is_host') === 'true'

    if (!storedPlayerId) {
      router.replace('/lobby')
      return
    }
    setPlayerId(storedPlayerId)
    setIsHost(storedIsHost)

    fetch(`/api/games/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        if (data.game.status === 'playing') { redirectToGame(); return }
        setGameCode(data.game.code)
        setPlayers(data.players)
        setSettings(sanitizeSettings(data.game.game_settings))
        setLoading(false)
      })
      .catch(() => setError(t.lobby.loadFailed))

    const supabase = createClient()
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((prev) => {
            const np = payload.new as Player
            return prev.some((p) => p.id === np.id) ? prev : [...prev, np]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as { status: string; game_settings?: unknown }
          if (updated.status === 'playing') { redirectToGame(); return }
          // Les invités voient les réglages de l'hôte en temps réel
          if (!storedIsHost) setSettings(sanitizeSettings(updated.game_settings))
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Realtime: canal lobby-${gameId} → ${status}`)
        }
      })

    // Filet de secours (événements Realtime perdus)
    const poll = setInterval(() => {
      fetch(`/api/games/${gameId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.game?.status === 'playing') { redirectToGame(); return }
          if (Array.isArray(data.players)) setPlayers(data.players)
          if (!storedIsHost && data.game?.game_settings) setSettings(sanitizeSettings(data.game.game_settings))
        })
        .catch((e) => console.error('lobby poll error', e))
    }, 3000)

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [gameId, router, redirectToGame, t.lobby.loadFailed])

  // L'hôte change un réglage : maj locale immédiate + push serveur (propagé aux invités)
  function changeSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    if (!isHost) return
    const next = { ...settings, [key]: value }
    setSettings(next)
    fetch(`/api/games/${gameId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, settings: next }),
    }).catch((e) => console.error('[WIC] lobby: settings update', e))
  }

  async function handleStart() {
    if (!playerId) return
    console.log(`[WIC] lobby: clic "Démarrer" (playerId=${playerId}, gameId=${gameId})`)
    setStarting(true)
    try {
      const res = await fetch(`/api/games/${gameId}/start`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      console.log(`[WIC] lobby: PATCH /start → ${res.status}`)
      if (!res.ok) {
        const data = await res.json()
        console.error('[WIC] lobby: start a échoué', data)
        setError(data.error)
        setStarting(false)
        return
      }
      redirectToGame()
    } catch (e) {
      console.error('[WIC] lobby: erreur réseau au start', e)
      setError(t.lobby.startError)
      setStarting(false)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/join/${gameCode}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading && !error) {
    return (
      <AnimatedBackground className="min-h-screen flex items-center justify-center text-muted text-sm" style={{ backgroundColor: '#111111' }}>
        {t.common.loading}
      </AnimatedBackground>
    )
  }
  if (error) {
    return (
      <AnimatedBackground className="min-h-screen flex flex-col items-center justify-center gap-4 text-white px-6" style={{ backgroundColor: '#111111' }}>
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.push('/lobby')} className="text-sm text-muted underline">{t.common.back}</button>
      </AnimatedBackground>
    )
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${gameCode}` : ''

  return (
    <AnimatedBackground className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12" style={{ backgroundColor: '#111111' }}>
      <div
        className="w-full mx-auto flex flex-col text-white p-6 sm:p-8"
        style={{ maxWidth: '760px', backgroundColor: '#1a1a1a', border: '1px solid #222222', borderRadius: '16px', gap: '24px' }}
      >
        {/* Game code */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs uppercase" style={labelStyle}>{t.lobby.gameCode}</span>
          <span className="font-bold text-white" style={{ fontSize: 'clamp(2.5rem, 11vw, 4rem)', letterSpacing: '0.15em', lineHeight: 1 }}>{gameCode}</span>
        </div>

        {/* Invite link */}
        <div className="w-full flex flex-col gap-1.5">
          <span className="text-xs uppercase" style={labelStyle}>{t.lobby.inviteLink}</span>
          <div className="flex gap-2">
            <input readOnly value={joinUrl} className="flex-1 min-w-0 text-xs text-muted focus:outline-none"
              style={{ backgroundColor: '#111111', border: '1px solid #333333', borderRadius: '6px', padding: '12px 16px' }} />
            <button onClick={copyLink} className="whitespace-nowrap font-bold text-sm uppercase tracking-wider text-white transition-all duration-150 hover:bg-white/[0.06]"
              style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px', padding: '12px 16px' }}>
              {copied ? '✓' : t.lobby.copy}
            </button>
          </div>
        </div>

        {/* Settings (left) + Players (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Settings panel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold" style={{ ...labelStyle, color: 'rgba(255,255,255,0.45)' }}>{t.lobby.settings}</span>
              {!isHost && <span className="text-xs" style={{ color: '#555555' }}>{t.lobby.configuredByHost}</span>}
            </div>

            <Field label={t.settings.rounds}>
              <Toggle value={settings.rounds} disabled={!isHost} onChange={(v) => changeSetting('rounds', v)}
                options={ROUND_OPTIONS.map((r) => ({ value: r, label: r }))} />
            </Field>
            <Field label={t.settings.timer}>
              <Toggle value={settings.timer} disabled={!isHost} onChange={(v) => changeSetting('timer', v)}
                options={TIMER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Field>
            <Field label={t.settings.gameMode}>
              <Toggle value={settings.gameMode} disabled={!isHost} onChange={(v) => changeSetting('gameMode', v)}
                options={GAME_MODE_KEYS.map((k) => ({ value: k, label: t.settings.gameModes[k] }))} />
            </Field>
            <Field label={t.settings.difficulty}>
              <Toggle value={settings.difficulty} disabled={!isHost} onChange={(v) => changeSetting('difficulty', v)}
                options={DIFFICULTY_KEYS.map((k) => ({ value: k, label: t.settings.difficulties[k] }))} />
            </Field>
            <Field label={t.settings.genre}>
              <Toggle value={settings.genre} disabled={!isHost} wrap onChange={(v) => changeSetting('genre', v)}
                options={GENRE_KEYS.map((k) => ({ value: k, label: t.settings.genres[k] }))} />
            </Field>
          </div>

          {/* Players */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase" style={labelStyle}>
              {players.length} {players.length > 1 ? t.lobby.players : t.lobby.player}
            </span>
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-3"
                  style={{ backgroundColor: '#111111', border: '1px solid #333333', borderRadius: '6px', padding: '12px 16px' }}>
                  <span className="font-medium text-white">{p.name}</span>
                  {p.is_host && <span className="text-xs ml-auto" style={{ color: '#555555' }}>{t.common.host}</span>}
                  {p.id === playerId && !p.is_host && <span className="text-xs ml-auto" style={{ color: '#555555' }}>{t.common.you}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Start */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting || players.length < 1}
            className="w-full py-4 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {starting ? t.lobby.starting : t.lobby.start}
          </button>
        ) : (
          <p className="text-sm text-center" style={{ color: '#555555' }}>{t.lobby.waitingStart}</p>
        )}
      </div>
    </AnimatedBackground>
  )
}
