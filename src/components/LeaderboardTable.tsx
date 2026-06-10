'use client'

// Tableau du classement global : onglets Budget Guess / Higher or Lower (style
// MultiToggle existant), skeleton de chargement, état vide, entrée du joueur
// courant (pseudo wic_player_name) surlignée en corail. Lignes en cards
// empilées (flex) → lisible sur mobile sans débordement.

import { useEffect, useState } from 'react'
import { Syne } from 'next/font/google'
import { useTranslation } from '@/hooks/useTranslation'
import { getStoredPlayerName } from '@/lib/playerName'
import { formatScore } from '@/lib/utils/format'
import MultiToggle from '@/components/MultiToggle'

const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

interface Entry {
  id: string
  player_name: string
  score: number
}

type Mode = 'budget' | 'chain'

export default function LeaderboardTable() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('budget')
  const [entries, setEntries] = useState<Entry[] | null>(null) // null = chargement
  const [error, setError] = useState(false)
  const [myName, setMyName] = useState<string | null>(null)

  useEffect(() => { setMyName(getStoredPlayerName()) }, [])

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    setError(false)
    fetch(`/api/leaderboard?mode=${mode}`)
      .then((r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json()
      })
      .then((d) => { if (!cancelled) setEntries(Array.isArray(d.entries) ? d.entries : []) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [mode])

  const scoreLabel = (score: number): string => {
    if (mode === 'chain') return `${score} ${score === 1 ? t.leaderboard.film : t.leaderboard.films}`
    return `${formatScore(score)} ${t.leaderboard.points}`
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Titre */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className={`${syne.className} text-white uppercase`} style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', lineHeight: 1 }}>
          {t.leaderboard.title}
          <span style={{ color: '#FF4D2E' }}>.</span>
        </h1>
        <p className="text-sm" style={{ color: '#888888' }}>{t.leaderboard.subtitle}</p>
      </div>

      {/* Onglets par mode — même style que les toggles de /settings */}
      <MultiToggle<Mode>
        options={[
          { value: 'budget', label: t.leaderboard.tabBudget },
          { value: 'chain', label: t.leaderboard.tabChain },
        ]}
        values={[mode]}
        onToggle={(v) => setMode(v)}
      />

      {/* Erreur */}
      {error && (
        <p className="text-center text-sm py-10" style={{ color: '#FF5C5C' }}>
          {t.leaderboard.loadError}
        </p>
      )}

      {/* Skeleton de chargement */}
      {!error && entries === null && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl"
              style={{
                height: '52px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      )}

      {/* État vide */}
      {!error && entries !== null && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p style={{ fontSize: '2rem' }}>🏆</p>
          <p className="font-bold text-white">{t.leaderboard.empty}</p>
        </div>
      )}

      {/* Classement */}
      {!error && entries !== null && entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => {
            const rank = i + 1
            const isMe = myName !== null && entry.player_name === myName
            const top3Color = rank === 1 ? '#FFD24D' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: isMe ? 'rgba(255,77,46,0.10)' : 'rgba(0,0,0,0.35)',
                  border: isMe ? '1px solid #FF4D2E' : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="font-bold text-sm shrink-0 text-right"
                    style={{ width: '34px', color: top3Color ?? 'rgba(255,255,255,0.5)' }}
                  >
                    #{rank}
                  </span>
                  <span className={`truncate ${isMe ? 'font-bold' : 'font-medium'} text-white`}>
                    {entry.player_name}
                    {isMe && (
                      <span className="text-xs ml-1.5" style={{ color: '#FF4D2E' }}>({t.leaderboard.you})</span>
                    )}
                  </span>
                </div>
                <span className="font-bold shrink-0" style={{ color: isMe ? '#FF4D2E' : '#ffffff' }}>
                  {scoreLabel(entry.score)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
