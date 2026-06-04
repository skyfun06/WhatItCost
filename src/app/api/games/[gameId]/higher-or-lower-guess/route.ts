import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

interface Body {
  player_id: string
  // Index (0-based) du film de RÉFÉRENCE (gauche) dans la chaîne. On compare
  // movie_ids[position] (visible) à movie_ids[position + 1] (caché).
  position: number
  guess: 'higher' | 'lower'
}

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const body: Body = await request.json()
    const { player_id, position, guess } = body
    const { gameId } = params

    if (!player_id || typeof position !== 'number' || (guess !== 'higher' && guess !== 'lower')) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    if (position < 0) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
    }

    const db = createClient() as any

    const gameResult = await db
      .from('games')
      .select('movie_ids, status')
      .eq('id', gameId)
      .single() as { data: Pick<GameRow, 'movie_ids' | 'status'> | null; error: Error | null }
    if (gameResult.error || !gameResult.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const game = gameResult.data
    if (game.status === 'finished') {
      return NextResponse.json({ error: 'Game already finished' }, { status: 400 })
    }

    const leftId = game.movie_ids[position]
    const rightId = game.movie_ids[position + 1]
    if (leftId == null) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
    }
    // Fin du pool atteinte : le client doit prolonger la chaîne puis rejouer.
    if (rightId == null) {
      return NextResponse.json({ need_extend: true }, { status: 200 })
    }

    const moviesRes = await db
      .from('movies')
      .select('id, budget')
      .in('id', [leftId, rightId]) as { data: Pick<MovieRow, 'id' | 'budget'>[] | null; error: Error | null }
    if (moviesRes.error || !moviesRes.data || moviesRes.data.length < 2) {
      return NextResponse.json({ error: 'Movies not found' }, { status: 404 })
    }
    const byId = Object.fromEntries(moviesRes.data.map((m) => [m.id, m.budget]))
    const leftBudget = byId[leftId]
    const rightBudget = byId[rightId]

    // Égalité parfaite → on considère "higher" gagnant (le caché ≥ la référence).
    const realComparison: 'higher' | 'lower' = rightBudget >= leftBudget ? 'higher' : 'lower'
    const correct = guess === realComparison

    const playerResult = await db
      .from('players')
      .select('total_score')
      .eq('id', player_id)
      .eq('game_id', gameId)
      .single() as { data: Pick<PlayerRow, 'total_score'> | null; error: Error | null }
    if (playerResult.error || !playerResult.data) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    const currentLength = playerResult.data.total_score

    // Le score (= longueur de chaîne) n'avance que sur une bonne réponse jouée À LA
    // BONNE POSITION (= longueur actuelle). Update gardé `.eq('total_score', position)`
    // : idempotent (un retry sur la même position ne double-compte pas) et anti-skip.
    let chainLength = currentLength
    if (correct && position === currentLength) {
      const { error: scoreErr } = await db
        .from('players')
        .update({ total_score: currentLength + 1 })
        .eq('id', player_id)
        .eq('total_score', position)
      if (scoreErr) {
        console.error('[WIC] hol-guess: total_score update', scoreErr)
      } else {
        chainLength = currentLength + 1
      }
    }

    return NextResponse.json({
      correct,
      revealed_budget: rightBudget,
      left_budget: leftBudget,
      real_comparison: realComparison,
      chain_length: chainLength,
    })
  } catch (err) {
    console.error('[WIC] hol-guess error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
