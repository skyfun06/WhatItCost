'use client'

// Bouton "Soumettre au classement" des écrans de fin de partie (Budget Guess et
// Higher or Lower). Le score n'est PAS envoyé : le serveur lit le total_score
// autoritatif en base (voir /api/leaderboard/submit).
//
// Flux pseudo : déjà mémorisé (wic_player_name) → soumission directe en un clic,
// avec un lien discret pour le modifier. Sinon → champ inline pour le saisir,
// mémorisé pour les prochaines fois.

import { useEffect, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { getStoredPlayerName, storePlayerName, sanitizePlayerName, PLAYER_NAME_MAX } from '@/lib/playerName'

type Status = 'idle' | 'editing' | 'sending' | 'done' | 'already'

interface Props {
  gameId: string
  playerId: string
}

export default function LeaderboardSubmit({ gameId, playerId }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [name, setName] = useState('')
  const [rank, setRank] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Lu après montage (localStorage indisponible côté serveur)
  const [storedName, setStoredName] = useState<string | null>(null)
  useEffect(() => { setStoredName(getStoredPlayerName()) }, [])

  async function send(playerName: string) {
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId, player_name: playerName }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setStatus('already')
        return
      }
      if (!res.ok) {
        setError(data.error === 'invalid_name' ? t.leaderboard.invalidName : t.leaderboard.submitError)
        setStatus('editing')
        setName(playerName)
        return
      }
      storePlayerName(playerName)
      setStoredName(playerName)
      setRank(typeof data.rank === 'number' ? data.rank : null)
      setStatus('done')
    } catch {
      setError(t.leaderboard.submitError)
      setStatus('idle')
    }
  }

  function handleSubmitClick() {
    if (storedName) {
      send(storedName)
    } else {
      setName('')
      setStatus('editing')
    }
  }

  function handleConfirm() {
    const cleaned = sanitizePlayerName(name)
    if (!cleaned) {
      setError(t.leaderboard.invalidName)
      return
    }
    send(cleaned)
  }

  // ── Succès / déjà soumis : feedback à la place du bouton ──
  if (status === 'done' || status === 'already') {
    return (
      <div className="w-full flex flex-col items-center gap-1 py-1" aria-live="polite">
        {status === 'done' ? (
          <>
            <p className="font-bold" style={{ color: '#FF4D2E' }}>✓ {t.leaderboard.submitted}</p>
            {rank != null && (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t.leaderboard.yourRank.replace('{rank}', String(rank))}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.leaderboard.alreadySubmitted}</p>
        )}
        <a href="/leaderboard" className="text-sm font-semibold underline" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {t.leaderboard.viewLeaderboard}
        </a>
      </div>
    )
  }

  // ── Saisie inline du pseudo (pas encore mémorisé, ou modification) ──
  if (status === 'editing') {
    return (
      <div className="w-full flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder={t.leaderboard.nicknamePlaceholder}
            maxLength={PLAYER_NAME_MAX}
            autoFocus
            className="flex-1 min-w-0 text-white text-center focus:outline-none"
            style={{
              backgroundColor: '#111111',
              border: '1px solid #333333',
              borderRadius: '6px',
              padding: '10px 14px',
            }}
          />
          <button
            onClick={handleConfirm}
            disabled={!sanitizePlayerName(name)}
            className="min-h-[44px] px-5 font-bold text-sm text-white uppercase tracking-wider disabled:opacity-40"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {t.leaderboard.confirmName}
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: '#FF5C5C' }}>{error}</p>}
      </div>
    )
  }

  // ── Bouton initial (idle / sending) ──
  return (
    <div className="w-full flex flex-col items-center gap-1.5">
      <button
        onClick={handleSubmitClick}
        disabled={status === 'sending'}
        className="w-full min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider disabled:opacity-50"
        style={{ border: '1px solid #FF4D2E', color: '#FF4D2E', borderRadius: '6px', backgroundColor: 'rgba(255,77,46,0.08)' }}
      >
        🏆 {status === 'sending' ? t.leaderboard.submitting : t.leaderboard.submit}
      </button>
      {storedName && status === 'idle' && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t.leaderboard.submitAs} <span className="font-semibold text-white/70">{storedName}</span>
          {' · '}
          <button
            onClick={() => { setName(storedName); setStatus('editing') }}
            className="underline"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {t.leaderboard.changeName}
          </button>
        </p>
      )}
      {error && <p className="text-sm" style={{ color: '#FF5C5C' }}>{error}</p>}
    </div>
  )
}
