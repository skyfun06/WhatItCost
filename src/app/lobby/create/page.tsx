'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function LobbyCreatePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      // Multijoueur : on crée juste la partie (waiting). Les réglages et les films
      // sont gérés dans le lobby puis au démarrage — pas de films ici.
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'multiplayer', playerName: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      localStorage.setItem('wic_game_id', data.gameId)
      localStorage.setItem('wic_player_id', data.playerId)
      localStorage.setItem('wic_game_mode', 'multiplayer')
      localStorage.setItem('wic_is_host', 'true')
      // wic_movies / wic_timer / wic_game_mode_type seront chargés depuis le serveur
      // par la page de jeu une fois la partie démarrée.

      router.replace(`/lobby/${data.gameId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setLoading(false)
    }
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
          gap: '24px',
        }}
      >
        <h1 className="text-white font-bold" style={{ fontSize: '1.75rem' }}>
          {t.lobby.newGameTitle}
        </h1>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={t.lobby.nickname}
          maxLength={20}
          autoFocus
          className="w-full text-white text-center focus:outline-none"
          style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '6px',
            padding: '12px 16px',
          }}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="w-full py-4 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
        >
          {loading ? t.lobby.creating : t.lobby.createButton}
        </button>
      </div>
    </AnimatedBackground>
  )
}
