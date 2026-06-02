'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'

export default function SoloGamePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createAndRedirect() {
      try {
        // Paramètres choisis sur la page Réglages, transmis via l'URL.
        const sp = new URLSearchParams(window.location.search)
        const settings = {
          rounds: Number(sp.get('rounds')) || undefined,
          timer: sp.get('timer') !== null ? Number(sp.get('timer')) : undefined,
          difficulty: sp.get('difficulty') ?? undefined,
          genre: sp.get('genre') ?? undefined,
          gameMode: sp.get('gameMode') ?? undefined,
        }

        const res = await fetch('/api/games/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? t.game.createFailed)
          return
        }

        localStorage.setItem('wic_game_id', data.gameId)
        localStorage.setItem('wic_player_id', data.playerId)
        localStorage.setItem('wic_movies', JSON.stringify(data.movies))
        // Durée du minuteur validée par le serveur (0 = ∞). Lue par /game/[id].
        localStorage.setItem('wic_timer', String(data.timerSeconds ?? 30))
        // Mode de jeu (budget_guess | higher_or_lower), lu par /game/[id] en solo
        localStorage.setItem('wic_game_mode_type', String(data.gameMode ?? 'budget_guess'))
        // Explicitly mark this as a solo game, overriding any stale value left
        // over from a previous multiplayer session (otherwise the reveal modal
        // wouldn't show and the multiplayer host/guest logic would kick in).
        localStorage.setItem('wic_game_mode', 'solo')
        localStorage.setItem('wic_is_host', 'true')

        router.replace(`/game/${data.gameId}`)
      } catch {
        setError(t.game.createImpossible)
      }
    }

    createAndRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-6 text-white">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null)
            window.location.reload()
          }}
          className="px-4 py-2 rounded-lg border border-white/20 text-sm text-muted"
        >
          {t.common.retry}
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center text-muted text-sm">
      {t.game.creating}
    </main>
  )
}
