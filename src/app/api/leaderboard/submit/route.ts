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
  // Diagnostic : chaque sortie non-200 est loguée avec le motif exact et le
  // contexte reçu (status, raison, game_id, player_id, player_name).
  let ctx = { game_id: '?', player_id: '?', player_name: '?' }
  const fail = (status: number, reason: string, detail?: unknown) => {
    console.error(
      `[WIC] leaderboard/submit FAIL status=${status} reason=${reason}`,
      `game_id=${ctx.game_id} player_id=${ctx.player_id} player_name=${ctx.player_name}`,
      detail ?? '',
    )
    return NextResponse.json({ error: reason }, { status })
  }

  try {
    const body: SubmitBody = await request.json()
    const { game_id, player_id } = body
    ctx = { game_id: String(game_id), player_id: String(player_id), player_name: String(body.player_name) }

    if (!game_id || !player_id) {
      return fail(400, 'missing_fields')
    }
    const playerName = sanitizePlayerName(body.player_name)
    if (!playerName) {
      return fail(422, 'invalid_name')
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
      return fail(404, 'player_not_found', playerResult.error)
    }
    const score = playerResult.data.total_score

    const gameResult = await db
      .from('games')
      .select('movie_ids, game_settings')
      .eq('id', game_id)
      .single() as { data: Pick<GameRow, 'movie_ids' | 'game_settings'> | null; error: Error | null }
    if (gameResult.error || !gameResult.data) {
      return fail(404, 'game_not_found', gameResult.error)
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
      return fail(422, 'invalid_score', `score=${score} maxScore=${maxScore} movieCount=${movieCount} mode=${mode}`)
    }

    const insert = await db.from('leaderboard').insert({
      player_name: playerName,
      score,
      game_id,
      mode,
    }) as { error: { code?: string; message?: string } | null }
    if (insert.error) {
      if (insert.error.code === '23505') {
        // Doublon = déjà soumis pour cette partie. Pas une erreur : on renvoie
        // le rang de l'entrée existante pour que le client l'affiche.
        const existing = await db
          .from('leaderboard')
          .select('score')
          .eq('game_id', game_id)
          .eq('player_name', playerName)
          .single() as { data: { score: number } | null; error: Error | null }
        let existingRank: number | null = null
        if (existing.data) {
          const better = await db
            .from('leaderboard')
            .select('id', { count: 'exact', head: true })
            .eq('mode', mode)
            .gt('score', existing.data.score) as { count: number | null; error: Error | null }
          if (!better.error) existingRank = (better.count ?? 0) + 1
        }
        console.warn(`[WIC] leaderboard/submit 409 already_submitted game_id=${ctx.game_id} player_name=${ctx.player_name} rank=${existingRank}`)
        return NextResponse.json({ error: 'already_submitted', rank: existingRank }, { status: 409 })
      }
      return fail(500, 'insert_failed', insert.error)
    }

    // Rang obtenu = nb d'entrées strictement meilleures dans le même mode + 1.
    const countResult = await db
      .from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .eq('mode', mode)
      .gt('score', score) as { count: number | null; error: Error | null }
    const rank = countResult.error ? null : (countResult.count ?? 0) + 1

    console.log(`[WIC] leaderboard/submit OK mode=${mode} score=${score} rank=${rank} game_id=${ctx.game_id} player_name=${ctx.player_name}`)
    return NextResponse.json({ ok: true, mode, score, rank })
  } catch (err) {
    return fail(500, 'internal_error', err)
  }
}
