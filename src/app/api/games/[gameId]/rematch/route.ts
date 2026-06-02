import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

// Crée une partie de revanche à partir d'une partie multijoueur terminée :
// mêmes réglages (game_settings : rounds / timer / mode / genre / difficulté),
// mêmes joueurs (l'hôte reste l'hôte). La partie repart en 'waiting' : l'hôte
// relance depuis le lobby, et c'est /start qui (re)génère les films à partir des
// réglages — inutile de les fetcher ici.
// Idempotent : si la revanche existe déjà (un autre joueur a cliqué en premier),
// on renvoie la partie existante.
export async function POST(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { gameId } = params
    console.log(`[WIC] /rematch: source game ${gameId}`)

    const db = createClient() as any

    const oldGameRes = await db
      .from('games')
      .select('id, mode, timer_seconds, difficulty, genre, game_settings, rematch_game_id')
      .eq('id', gameId)
      .single() as { data: Partial<GameRow> | null; error: Error | null }

    if (oldGameRes.error || !oldGameRes.data) {
      console.error('[WIC] /rematch: partie source introuvable', oldGameRes.error)
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const old = oldGameRes.data
    if (old.mode !== 'multiplayer') {
      return NextResponse.json({ error: 'Rematch is multiplayer only' }, { status: 400 })
    }

    // Déjà créée par un autre joueur → on renvoie la même
    if (old.rematch_game_id) {
      console.log(`[WIC] /rematch: déjà existante → ${old.rematch_game_id}`)
      return NextResponse.json({ gameId: old.rematch_game_id })
    }

    // Joueurs à recopier (l'hôte conserve son statut)
    const oldPlayersRes = await db
      .from('players')
      .select('id, name, is_host')
      .eq('game_id', gameId) as { data: Pick<PlayerRow, 'id' | 'name' | 'is_host'>[] | null; error: Error | null }
    if (oldPlayersRes.error || !oldPlayersRes.data?.length) {
      console.error('[WIC] /rematch: joueurs source introuvables', oldPlayersRes.error)
      return NextResponse.json({ error: 'No players to carry over' }, { status: 500 })
    }

    // Nouvelle partie vide en attente (films générés par /start, comme à la création)
    const newGameRes = await db
      .from('games')
      .insert({
        mode: 'multiplayer',
        status: 'waiting',
        movie_ids: [],
        current_round: 1,
        timer_seconds: old.timer_seconds ?? 30,
        difficulty: old.difficulty ?? 'all',
        genre: old.genre ?? 'all',
        // Réglages complets recopiés pour rejouer à l'identique (sinon /start
        // repartirait sur les valeurs par défaut, ex : Higher or Lower → budget_guess).
        game_settings: old.game_settings ?? {},
        locale: 'fr',
      })
      .select()
      .single() as { data: GameRow | null; error: Error | null }
    if (newGameRes.error || !newGameRes.data) {
      console.error('[WIC] /rematch: échec création partie', newGameRes.error)
      return NextResponse.json({ error: 'Failed to create rematch game' }, { status: 500 })
    }
    const newGame = newGameRes.data

    // Recopie des joueurs (avec source_player_id pour le mapping côté client)
    const playersInsert = await db.from('players').insert(
      oldPlayersRes.data.map((p) => ({
        game_id: newGame.id,
        name: p.name,
        is_host: p.is_host,
        total_score: 0,
        source_player_id: p.id,
      })),
    ) as { error: Error | null }
    if (playersInsert.error) {
      console.error('[WIC] /rematch: échec recopie joueurs', playersInsert.error)
      // Nettoie la partie orpheline pour ne pas laisser un lobby vide inutilisable.
      await db.from('games').delete().eq('id', newGame.id)
      return NextResponse.json({ error: 'Failed to carry over players' }, { status: 500 })
    }

    // Pose le lien sur l'ancienne partie SEULEMENT si pas déjà posé (anti-concurrence)
    const linkRes = await db
      .from('games')
      .update({ rematch_game_id: newGame.id })
      .eq('id', gameId)
      .is('rematch_game_id', null)
      .select('rematch_game_id') as { data: Pick<GameRow, 'rematch_game_id'>[] | null; error: Error | null }

    if (linkRes.error) console.error('[WIC] /rematch: échec lien rematch', linkRes.error)

    if (!linkRes.data || linkRes.data.length === 0) {
      // Un autre joueur a gagné la course → on supprime notre partie orpheline
      console.log('[WIC] /rematch: course perdue, nettoyage de la partie orpheline')
      await db.from('games').delete().eq('id', newGame.id)
      const winnerRes = await db
        .from('games').select('rematch_game_id').eq('id', gameId).single() as {
          data: Pick<GameRow, 'rematch_game_id'> | null; error: Error | null
        }
      return NextResponse.json({ gameId: winnerRes.data?.rematch_game_id ?? newGame.id })
    }

    console.log(`[WIC] /rematch: OK → nouvelle partie ${newGame.id} (${oldPlayersRes.data.length} joueurs)`)
    return NextResponse.json({ gameId: newGame.id })
  } catch (err) {
    console.error('[WIC] /rematch error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
