'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import AnimatedBackground from '@/components/AnimatedBackground'
import { getStoredPlayerName, storePlayerName } from '@/lib/playerName'

export default function LobbyCreatePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Section "Rejoindre" : code de partie + état d'envoi/erreur indépendants
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // Pré-remplit avec le pseudo persistant (wic_player_name), modifiable librement.
  useEffect(() => {
    const saved = getStoredPlayerName()
    if (saved) setName(saved)
  }, [])

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      // Réglages éventuellement transmis par /settings via l'URL : on les fait
      // suivre pour pré-remplir le lobby. Absents (flux accueil → /lobby/create
      // direct) → le serveur applique les valeurs par défaut.
      const sp = new URLSearchParams(window.location.search)
      const difficulties = sp.getAll('difficulties')
      const genres = sp.getAll('genres')
      const settings = {
        rounds: sp.get('rounds') !== null ? Number(sp.get('rounds')) : undefined,
        timer: sp.get('timer') !== null ? Number(sp.get('timer')) : undefined,
        difficulties: difficulties.length ? difficulties : undefined,
        genres: genres.length ? genres : undefined,
        gameMode: sp.get('gameMode') ?? undefined,
      }

      // Multijoueur : on crée juste la partie (waiting). Les films sont générés
      // au démarrage depuis le lobby — pas de films ici.
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'multiplayer', playerName: trimmed, ...settings }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      storePlayerName(trimmed)
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

  // Rejoindre une partie existante, directement depuis cette page (même appel
  // API et mêmes clés localStorage que /join/[code] — la route renvoie déjà des
  // messages clairs : partie introuvable, partie déjà commencée).
  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed || !code || joining || loading) return
    setJoining(true)
    setJoinError(null)
    try {
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerName: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      storePlayerName(trimmed)
      localStorage.setItem('wic_game_id', data.gameId)
      localStorage.setItem('wic_player_id', data.playerId)
      localStorage.setItem('wic_movies', JSON.stringify(data.movies))
      localStorage.setItem('wic_game_mode', 'multiplayer')
      localStorage.setItem('wic_is_host', 'false')

      router.replace(`/lobby/${data.gameId}`)
    } catch (e) {
      setJoinError(e instanceof Error && e.message ? e.message : t.errors.generic)
      setJoining(false)
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
          disabled={loading || joining || !name.trim()}
          className="w-full py-4 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(255,77,46,0.5)] active:translate-y-0 active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
        >
          {loading ? t.lobby.creating : t.lobby.createButton}
        </button>

        {/* Séparateur : créer OU rejoindre */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1" style={{ borderTop: '1px solid #2a2a2a' }} />
          <span className="text-xs uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: '#666666' }}>
            {t.lobby.orJoinCode}
          </span>
          <div className="flex-1" style={{ borderTop: '1px solid #2a2a2a' }} />
        </div>

        {/* Rejoindre : code (6 caractères, majuscules forcées) + bouton secondaire */}
        <div className="w-full flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="FILM42"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 text-white text-center uppercase tracking-[0.3em] focus:outline-none"
            style={{
              backgroundColor: '#111111',
              border: '1px solid #333333',
              borderRadius: '6px',
              padding: '12px 16px',
            }}
          />
          <button
            onClick={handleJoin}
            disabled={joining || loading || !code || !name.trim()}
            className="whitespace-nowrap px-5 py-3 font-bold text-sm uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.98] disabled:opacity-40"
            style={{ border: '1px solid rgba(255,255,255,0.35)', borderRadius: '6px' }}
          >
            {joining ? t.lobby.connecting : t.lobby.join}
          </button>
        </div>

        {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
      </div>
    </AnimatedBackground>
  )
}
