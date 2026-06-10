import { NextResponse } from 'next/server'
import { dailyDateUTC, dailyMode, msUntilNextDaily } from '@/lib/dailyChallenge'

export const dynamic = 'force-dynamic'

/**
 * Infos du défi du jour : date de référence (UTC), mode tiré par le seed, et
 * horodatage du prochain défi. Pur calcul déterministe — aucune base de données.
 */
export async function GET() {
  const date = dailyDateUTC()
  return NextResponse.json({
    date,
    mode: dailyMode(date),
    nextDailyAt: new Date(Date.now() + msUntilNextDaily()).toISOString(),
  })
}
