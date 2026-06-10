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
 * Une seule entrée par (player_name, mode) — index unique côté base — en
 * gardant le meilleur score : nouveau pseudo → insert ; score amélioré →
 * upsert ; score inférieur ou égal → aucune écriture, réponse informative
 * { improved: false, best, rank }.
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

    // Rang dans un mode pour un score donné = nb d'entrées strictement meilleures + 1.
    const rankOf = async (s: number): Promise<number | null> => {
      const better = await db
        .from('leaderboard')
        .select('id', { count: 'exact', head: true })
        .eq('mode', mode)
        .gt('score', s) as { count: number | null; error: Error | null }
      return better.error ? null : (better.count ?? 0) + 1
    }

    // UNE entrée par (pseudo, mode) : on garde le MEILLEUR score.
    const existing = await db
      .from('leaderboard')
      .select('score')
      .eq('player_name', playerName)
      .eq('mode', mode)
      .maybeSingle() as { data: { score: number } | null; error: Error | null }
    if (existing.error) {
      return fail(500, 'lookup_failed', existing.error)
    }

    if (existing.data && score <= existing.data.score) {
      // Pas une amélioration : on ne touche à rien. Pas une erreur non plus —
      // le client affiche "Ton meilleur score reste X" + le rang existant.
      const rank = await rankOf(existing.data.score)
      console.log(`[WIC] leaderboard/submit NOT_IMPROVED mode=${mode} score=${score} best=${existing.data.score} player_name=${ctx.player_name}`)
      return NextResponse.json({ ok: true, improved: false, best: existing.data.score, rank })
    }

    // Nouveau pseudo dans ce mode, ou score amélioré → UPSERT sur l'index unique
    // (player_name, mode). created_at rafraîchi : départage des égalités par date
    // du meilleur score. NB : deux soumissions simultanées du même pseudo peuvent
    // théoriquement se croiser (dernière écriture gagne) — sans gravité ici.
    const upsert = await db.from('leaderboard').upsert(
      {
        player_name: playerName,
        score,
        game_id,
        mode,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'player_name,mode' },
    ) as { error: { code?: string; message?: string } | null }
    if (upsert.error) {
      return fail(500, 'upsert_failed', upsert.error)
    }

    const rank = await rankOf(score)
    console.log(`[WIC] leaderboard/submit OK mode=${mode} score=${score} rank=${rank} previousBest=${existing.data?.score ?? 'none'} game_id=${ctx.game_id} player_name=${ctx.player_name}`)
    return NextResponse.json({ ok: true, improved: true, mode, score, rank, previousBest: existing.data?.score ?? null })
  } catch (err) {
    return fail(500, 'internal_error', err)
  }
}
