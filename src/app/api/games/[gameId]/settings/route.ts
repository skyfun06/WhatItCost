import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSettings } from '@/lib/gameSettings'
import type { Database } from '@/lib/supabase/database.types'

type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

// L'hôte met à jour les réglages depuis le lobby. La modif est propagée aux
// invités via Realtime (games UPDATE) + leur polling.
export async function PATCH(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { playerId, settings: rawSettings } = await request.json()
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

    if (playerResult.error) console.error('[WIC] /settings: player lookup error', playerResult.error)
    if (!playerResult.data?.is_host) {
      return NextResponse.json({ error: 'Only the host can change settings' }, { status: 403 })
    }

    const settings = sanitizeSettings(rawSettings)

    const { error: updateErr } = await db
      .from('games')
      .update({
        // Source de vérité = game_settings (JSONB, multi-sélection genres/difficultés).
        // Colonnes genre/difficulty legacy laissées telles quelles.
        game_settings: settings,
        timer_seconds: settings.timer,
      })
      .eq('id', gameId)
      .eq('status', 'waiting') // pas de changement une fois la partie lancée
    if (updateErr) {
      console.error('[WIC] /settings: échec update', updateErr)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, settings })
  } catch (err) {
    console.error('[WIC] /settings error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
