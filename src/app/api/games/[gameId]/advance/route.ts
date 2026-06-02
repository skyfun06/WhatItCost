import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

// Host-driven round advancement. Bumps games.current_round (or finishes the game
// on the last round). All clients react via the Realtime games UPDATE event.
export async function PATCH(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { playerId } = await request.json()
    const { gameId } = params

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 })
    }

    const db = createClient() as any

    const playerResult = await db
      .from('players')
      .select('is_host')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single() as { data: Pick<PlayerRow, 'is_host'> | null; error: Error | null }

    if (playerResult.error) console.error('Advance: player lookup error', playerResult.error)
    if (!playerResult.data?.is_host) {
      return NextResponse.json({ error: 'Only the host can advance the round' }, { status: 403 })
    }

    const gameResult = await db
      .from('games')
      .select('current_round, movie_ids, game_settings')
      .eq('id', gameId)
      .single() as { data: Pick<GameRow, 'current_round' | 'movie_ids' | 'game_settings'> | null; error: Error | null }

    if (gameResult.error || !gameResult.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const { current_round, movie_ids } = gameResult.data
    // Higher or Lower = 2 films par round
    const isHoL =
      (gameResult.data.game_settings as { gameMode?: string } | null)?.gameMode === 'higher_or_lower'
    const totalRounds = isHoL ? Math.floor(movie_ids.length / 2) : movie_ids.length

    if (current_round >= totalRounds) {
      const { error: finishErr } = await db
        .from('games')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', gameId)
      if (finishErr) {
        console.error('Advance: failed to finish game', finishErr)
        return NextResponse.json({ error: 'Failed to finish game' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, finished: true })
    }

    // Avance conditionnée à la valeur lue (garde-fou contre une double-avance
    // concurrente : seul le passage current_round → current_round+1 réussit).
    const { error: advanceErr } = await db
      .from('games')
      .update({
        current_round: current_round + 1,
        // Réarme la référence commune du minuteur pour le nouveau round.
        round_started_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('current_round', current_round)
    if (advanceErr) {
      console.error('Advance: failed to bump current_round', advanceErr)
      return NextResponse.json({ error: 'Failed to advance round' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, current_round: current_round + 1 })
  } catch (err) {
    console.error('Advance error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
