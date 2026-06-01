'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/hooks/useTranslation'
import AnimatedBackground from '@/components/AnimatedBackground'

interface Player {
  id: string
  name: string
  is_host: boolean
  total_score: number
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

  // Stable redirect handler to use inside Realtime callback
  const redirectToGame = useCallback(() => {
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

    // Load initial game state
    fetch(`/api/games/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        // If host already started, go straight to game
        if (data.game.status === 'playing') { redirectToGame(); return }
        setGameCode(data.game.code)
        setPlayers(data.players)
        setLoading(false)
      })
      .catch(() => setError(t.lobby.loadFailed))

    // Realtime: watch players joining + game status change
    const supabase = createClient()
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((prev) => {
            const newPlayer = payload.new as Player
            if (prev.some((p) => p.id === newPlayer.id)) return prev
            return [...prev, newPlayer]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as { status: string }
          if (updated.status === 'playing') redirectToGame()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Realtime: canal lobby-${gameId} → ${status}`)
        }
      })

    // Filet de sécurité : si un événement Realtime est perdu, le polling rattrape
    // (nouveaux joueurs + démarrage de la partie par l'hôte).
    const poll = setInterval(() => {
      fetch(`/api/games/${gameId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.game?.status === 'playing') { redirectToGame(); return }
          if (Array.isArray(data.players)) setPlayers(data.players)
        })
        .catch((e) => console.error('lobby poll error', e))
    }, 3000)

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [gameId, router, redirectToGame])

  async function handleStart() {
    if (!playerId) return
    setStarting(true)
    try {
      const res = await fetch(`/api/games/${gameId}/start`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        setStarting(false)
      }
      // Redirect will happen via Realtime UPDATE
    } catch {
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
      <AnimatedBackground
        className="min-h-screen flex items-center justify-center text-muted text-sm"
        style={{ backgroundColor: '#111111' }}
      >
        {t.common.loading}
      </AnimatedBackground>
    )
  }

  if (error) {
    return (
      <AnimatedBackground
        className="min-h-screen flex flex-col items-center justify-center gap-4 text-white px-6"
        style={{ backgroundColor: '#111111' }}
      >
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.push('/lobby')} className="text-sm text-muted underline">
          {t.common.back}
        </button>
      </AnimatedBackground>
    )
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${gameCode}` : ''

  const labelStyle = { letterSpacing: '0.12em', color: '#555555' } as const

  return (
    <AnimatedBackground
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: '#111111' }}
    >
      <div
        className="w-full mx-auto flex flex-col items-center text-white p-6 sm:p-10"
        style={{
          maxWidth: '480px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #222222',
          borderRadius: '16px',
          gap: '28px',
        }}
      >
        {/* Game code */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs uppercase" style={labelStyle}>{t.lobby.gameCode}</span>
          <span
            className="font-bold text-white"
            style={{ fontSize: 'clamp(3rem, 13vw, 4.5rem)', letterSpacing: '0.15em', lineHeight: 1 }}
          >
            {gameCode}
          </span>
        </div>

        {/* Join link */}
        <div className="w-full flex flex-col gap-2">
          <span className="text-xs uppercase" style={labelStyle}>{t.lobby.inviteLink}</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={joinUrl}
              className="flex-1 min-w-0 text-xs text-muted focus:outline-none"
              style={{
                backgroundColor: '#111111',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            />
            <button
              onClick={copyLink}
              className="whitespace-nowrap font-bold text-sm uppercase tracking-wider text-white transition-all duration-150 hover:bg-white/[0.06]"
              style={{
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            >
              {copied ? '✓' : t.lobby.copy}
            </button>
          </div>
        </div>

        {/* Players list */}
        <div className="w-full flex flex-col gap-3">
          <span className="text-xs uppercase" style={labelStyle}>
            {players.length} {players.length > 1 ? t.lobby.players : t.lobby.player}
          </span>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  padding: '12px 16px',
                }}
              >
                <span className="font-medium text-white">{p.name}</span>
                {p.is_host && <span className="text-xs ml-auto" style={{ color: '#555555' }}>{t.common.host}</span>}
                {p.id === playerId && !p.is_host && (
                  <span className="text-xs ml-auto" style={{ color: '#555555' }}>{t.common.you}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Host controls */}
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
          <p className="text-sm" style={{ color: '#555555' }}>{t.lobby.waitingStart}</p>
        )}
      </div>
    </AnimatedBackground>
  )
}
