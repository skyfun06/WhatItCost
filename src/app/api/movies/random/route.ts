import { NextResponse } from 'next/server'
import { fetchRandomMoviesWithBudget } from '@/lib/tmdb/fetchMovies'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!process.env.TMDB_API_READ_TOKEN) {
    return NextResponse.json({ error: 'TMDB_API_READ_TOKEN not configured' }, { status: 500 })
  }

  const movies = await fetchRandomMoviesWithBudget(5)

  if (movies.length < 5) {
    return NextResponse.json(
      { error: 'Not enough movies with known budget found in TMDB' },
      { status: 503 },
    )
  }

  return NextResponse.json({ movies })
}
