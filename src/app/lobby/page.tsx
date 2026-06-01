'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

export default function LobbyPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [code, setCode] = useState('')

  function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length > 0) router.push(`/join/${trimmed}`)
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 p-6 text-white">
      <h1 className="text-2xl font-bold">{t.lobby.title}</h1>

      <Link
        href="/lobby/create"
        className="px-6 py-3 rounded-full bg-brand-gradient text-white font-bold text-center"
      >
        {t.lobby.createGame}
      </Link>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <p className="text-muted text-sm">{t.lobby.orJoinCode}</p>
        <div className="flex gap-2 w-full">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="FILM42"
            maxLength={6}
            className="flex-1 bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest uppercase focus:outline-none focus:border-brand"
          />
          <button
            onClick={handleJoin}
            disabled={!code.trim()}
            className="px-4 py-3 rounded-xl border border-white/20 font-bold disabled:opacity-40"
          >
            {t.lobby.join}
          </button>
        </div>
      </div>
    </main>
  )
}
