import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

interface Body {
  player_id: string
  round_number: number
  guess: 'higher' | 'lower'
}

export const dynamic = 'force-dynamic'

// Points selon l'écart relatif entre les deux budgets (si la réponse est juste).
function pointsForGap(leftBudget: number, rightBudget: number): number {
  if (!leftBudget) return 250
  const gap = (Math.abs(rightBudget - leftBudget) / leftBudget) * 100
  if (gap > 50) return 1000
  if (gap >= 20) return 750
  if (gap >= 10) return 500
  return 250 // close call
}

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const body: Body = await request.json()
    const { player_id, round_number, guess } = body
    const { gameId } = params

    if (!player_id || typeof round_number !== 'number' || (guess !== 'higher' && guess !== 'lower')) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    if (round_number < 1) {
      return NextResponse.json({ error: 'Invalid round_number' }, { status: 400 })
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

    // Higher or Lower : 2 films par round
    const leftId = game.movie_ids[(round_number - 1) * 2]
    const rightId = game.movie_ids[(round_number - 1) * 2 + 1]
    if (leftId == null || rightId == null) {
      return NextResponse.json({ error: 'Invalid round_number' }, { status: 400 })
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

    const realComparison: 'higher' | 'lower' = rightBudget >= leftBudget ? 'higher' : 'lower'
    const correct = guess === realComparison
    const points = correct ? pointsForGap(leftBudget, rightBudget) : 0

    const roundInsert = await db.from('rounds').insert({
      game_id: gameId,
      player_id,
      movie_id: rightId, // film "caché" comparé
      round_number,
      guess_amount: guess === 'higher' ? 1 : 0, // encodage higher/lower
      score: points,
    }) as { error: { code: string } | null }

    if (roundInsert.error) {
      if (roundInsert.error.code === '23505') {
        return NextResponse.json({ error: 'Round already answered' }, { status: 409 })
      }
      console.error('[WIC] hol-guess: round insert error', roundInsert.error)
      return NextResponse.json({ error: 'Failed to save round' }, { status: 500 })
    }

    const playerResult = await db
      .from('players')
      .select('total_score')
      .eq('id', player_id)
      .single() as { data: Pick<PlayerRow, 'total_score'> | null; error: Error | null }
    if (playerResult.error) console.error('[WIC] hol-guess: player lookup', playerResult.error)

    const { error: scoreErr } = await db
      .from('players')
      .update({ total_score: (playerResult.data?.total_score ?? 0) + points })
      .eq('id', player_id)
    if (scoreErr) console.error('[WIC] hol-guess: total_score update', scoreErr)

    return NextResponse.json({
      correct,
      points,
      revealed_budget: rightBudget,
      left_budget: leftBudget,
      real_comparison: realComparison,
    })
  } catch (err) {
    console.error('[WIC] hol-guess error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
