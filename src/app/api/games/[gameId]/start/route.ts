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

    if (!playerResult.data?.is_host) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    await db
      .from('games')
      .update({ status: 'playing', current_round: 1 })
      .eq('id', gameId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Start game error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
