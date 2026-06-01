import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { playerId } = await request.json()
    const { gameId } = params
    console.log(`[WIC] /start: gameId=${gameId}, playerId=${playerId}`)

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

    if (playerResult.error) console.error('[WIC] /start: player lookup error', playerResult.error)
    if (!playerResult.data?.is_host) {
      console.error('[WIC] /start: non-host ou joueur introuvable → 403')
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    const { error: updateErr } = await db
      .from('games')
      .update({ status: 'playing', current_round: 1 })
      .eq('id', gameId)
    if (updateErr) {
      console.error('[WIC] /start: échec update status=playing', updateErr)
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
    }

    console.log(`[WIC] /start: OK — game ${gameId} status=playing, current_round=1`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Start game error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
