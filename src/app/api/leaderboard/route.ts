import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TOP_LIMIT = 50

/**
 * Lecture du classement global : GET /api/leaderboard?mode=budget|chain
 * Top 50 trié par score décroissant ; à score égal, la soumission la plus
 * ancienne passe devant (premier arrivé, premier servi).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') === 'chain' ? 'chain' : 'budget'

    const db = createClient() as any

    const result = await db
      .from('leaderboard')
      .select('id, player_name, score, created_at')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(TOP_LIMIT) as {
        data: Array<{ id: string; player_name: string; score: number; created_at: string }> | null
        error: Error | null
      }

    if (result.error) {
      console.error('[WIC] leaderboard read', result.error)
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
    }

    return NextResponse.json({ mode, entries: result.data ?? [] })
  } catch (err) {
    console.error('[WIC] leaderboard read error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
