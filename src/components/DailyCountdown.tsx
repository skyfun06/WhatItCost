'use client'

// Compte à rebours HH:MM:SS jusqu'au prochain défi du jour (minuit UTC).
// Réutilisé par la page /daily et les écrans de fin de partie en mode défi.

import { useEffect, useState } from 'react'
import { msUntilNextDaily } from '@/lib/dailyChallenge'
import { useTranslation } from '@/hooks/useTranslation'

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function DailyCountdown() {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState<number | null>(null) // null avant montage (pas de mismatch SSR)

  useEffect(() => {
    const tick = () => setRemaining(msUntilNextDaily())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {t.daily.nextIn}
      </p>
      <p
        className="font-bold tabular-nums"
        style={{ fontSize: '1.6rem', color: '#FF4D2E', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}
        aria-live="off"
      >
        {remaining === null ? '--:--:--' : format(remaining)}
      </p>
    </div>
  )
}
