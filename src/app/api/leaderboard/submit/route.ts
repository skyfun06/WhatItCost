import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizePlayerName } from '@/lib/playerName'
import { MAX_ROUND_SCORE } from '@/lib/utils/scoring'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

interface SubmitBody {
  game_id: string
  player_id: string
  player_name: string
}

export const dynamic = 'force-dynamic'

/**
 * Soumission d'un score au classement global.
 *
 * Anti-triche : le client n'envoie PAS de score. Le serveur lit
 * players.total_score (déjà autoritatif : seules les routes /guess et
 * /higher-or-lower-guess l'incrémentent) et le borne par ce que la partie
 * permettait réellement (nb de films × score max par round).
 *
 * Anti double-soumission : index unique (game_id, player_name) côté base
 * → violation 23505 traduite en 409 propre.
 */
export async function POST(request: Request) {
  try {
    const body: SubmitBody = await request.json()
    const { game_id, player_id } = body

    if (!game_id || !player_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const playerName = sanitizePlayerName(body.player_name)
    if (!playerName) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 422 })
    }

    const db = createClient() as any

    // Score autoritatif : lu en base, jamais depuis le client.
    const playerResult = await db
      .from('players')
      .select('total_score')
      .eq('id', player_id)
      .eq('game_id', game_id)
      .single() as { data: Pick<PlayerRow, 'total_score'> | null; error: Error | null }
    if (playerResult.error || !playerResult.data) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    const score = playerResult.data.total_score

    const gameResult = await db
      .from('games')
      .select('movie_ids, game_settings')
      .eq('id', game_id)
      .single() as { data: Pick<GameRow, 'movie_ids' | 'game_settings'> | null; error: Error | null }
    if (gameResult.error || !gameResult.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const game = gameResult.data

    const isChain =
      (game.game_settings as { gameMode?: string } | null)?.gameMode === 'higher_or_lower'
    const mode = isChain ? 'chain' : 'budget'

    // Borne de sanité : un total_score impossible pour cette partie est rejeté.
    // Chaîne : au plus movie_ids.length − 1 maillons. Budget : 5000 pts × nb films.
    const movieCount = Array.isArray(game.movie_ids) ? game.movie_ids.length : 0
    const maxScore = isChain ? Math.max(0, movieCount - 1) : movieCount * MAX_ROUND_SCORE
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > maxScore) {
      return NextResponse.json({ error: 'invalid_score' }, { status: 422 })
    }

    const insert = await db.from('leaderboard').insert({
      player_name: playerName,
      score,
      game_id,
      mode,
    }) as { error: { code?: string } | null }
    if (insert.error) {
      if (insert.error.code === '23505') {
        return NextResponse.json({ error: 'already_submitted' }, { status: 409 })
      }
      console.error('[WIC] leaderboard submit insert', insert.error)
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
    }

    // Rang obtenu = nb d'entrées strictement meilleures dans le même mode + 1.
    const countResult = await db
      .from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .eq('mode', mode)
      .gt('score', score) as { count: number | null; error: Error | null }
    const rank = countResult.error ? null : (countResult.count ?? 0) + 1

    return NextResponse.json({ ok: true, mode, score, rank })
  } catch (err) {
    console.error('[WIC] leaderboard submit error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
