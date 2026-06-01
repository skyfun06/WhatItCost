import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeScore, computeAccuracy } from '@/lib/utils/scoring'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

interface GuessBody {
  player_id: string
  round_number: number
  guess_amount: number
}

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const body: GuessBody = await request.json()
    const { player_id, round_number, guess_amount } = body
    const { gameId } = params

    if (!player_id || typeof round_number !== 'number' || typeof guess_amount !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (round_number < 1) {
      return NextResponse.json({ error: 'Invalid round_number' }, { status: 400 })
    }
    if (guess_amount < 0) {
      return NextResponse.json({ error: 'guess_amount must be >= 0' }, { status: 400 })
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
    // Borne haute : le round doit exister dans cette partie (nb de films variable).
    if (round_number > game.movie_ids.length) {
      return NextResponse.json({ error: 'Invalid round_number' }, { status: 400 })
    }

    const movieId = game.movie_ids[round_number - 1]
    const movieResult = await db
      .from('movies')
      .select('budget')
      .eq('id', movieId)
      .single() as { data: Pick<MovieRow, 'budget'> | null; error: Error | null }

    if (movieResult.error || !movieResult.data) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }
    const movie = movieResult.data

    const score = computeScore(guess_amount, movie.budget)
    const accuracy = computeAccuracy(guess_amount, movie.budget)

    const roundInsert = await db.from('rounds').insert({
      game_id: gameId,
      player_id,
      movie_id: movieId,
      round_number,
      guess_amount,
      score,
    }) as { error: { code: string } | null }

    if (roundInsert.error) {
      if (roundInsert.error.code === '23505') {
        return NextResponse.json({ error: 'Round already answered' }, { status: 409 })
      }
      console.error('Round insert error:', roundInsert.error)
      return NextResponse.json({ error: 'Failed to save round' }, { status: 500 })
    }

    // Update player total_score
    const playerResult = await db
      .from('players')
      .select('total_score')
      .eq('id', player_id)
      .single() as { data: Pick<PlayerRow, 'total_score'> | null; error: Error | null }

    await db
      .from('players')
      .update({ total_score: (playerResult.data?.total_score ?? 0) + score })
      .eq('id', player_id)

    // Note: the round is NOT auto-advanced here. Advancing is driven explicitly —
    // by the player (solo) or the host (multiplayer) via /api/games/[gameId]/advance.
    // This keeps the score reveal on screen until someone chooses to move on.

    return NextResponse.json({ score, actual_budget: movie.budget, accuracy })
  } catch (err) {
    console.error('Guess error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
