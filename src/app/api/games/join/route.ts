import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPosterUrl } from '@/lib/tmdb/client'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { code, playerName } = await request.json()

    if (!code || !playerName?.trim()) {
      return NextResponse.json({ error: 'code and playerName are required' }, { status: 400 })
    }

    const db = createClient() as any

    const gameResult = await db
      .from('games')
      .select('id, status, movie_ids, code')
      .eq('code', (code as string).toUpperCase().trim())
      .single() as { data: Pick<GameRow, 'id' | 'status' | 'movie_ids' | 'code'> | null; error: Error | null }

    if (gameResult.error || !gameResult.data) {
      return NextResponse.json({ error: 'Partie introuvable. Vérifie le code.' }, { status: 404 })
    }
    const game = gameResult.data

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cette partie a déjà commencé.' }, { status: 409 })
    }

    // Fetch movies in game order (ordered by movie_ids)
    const moviesResult = await db
      .from('movies')
      .select('id, title, title_fr, year, director, cast_list, poster_path, genres, overview, overview_fr')
      .in('id', game.movie_ids) as { data: Partial<MovieRow>[] | null; error: Error | null }

    if (moviesResult.error || !moviesResult.data) {
      return NextResponse.json({ error: 'Failed to load movies' }, { status: 500 })
    }

    const moviesById = Object.fromEntries(moviesResult.data.map((m) => [m.id!, m]))
    const movies = game.movie_ids
      .map((id) => moviesById[id])
      .filter(Boolean)
      .map((m) => ({
        id: m.id,
        title: m.title,
        title_fr: m.title_fr,
        year: m.year,
        director: m.director,
        cast_list: Array.isArray(m.cast_list) ? (m.cast_list as string[]) : [],
        poster_path: m.poster_path ?? null,
        poster_url: getPosterUrl(m.poster_path ?? null),
        genres: Array.isArray(m.genres) ? (m.genres as string[]) : [],
        overview: m.overview,
        overview_fr: m.overview_fr,
      }))

    const playerInsert = await db
      .from('players')
      .insert({ game_id: game.id, name: playerName.trim(), is_host: false, total_score: 0 })
      .select()
      .single() as { data: PlayerRow | null; error: Error | null }

    if (playerInsert.error || !playerInsert.data) {
      console.error('Player insert error:', playerInsert.error)
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
    }

    return NextResponse.json({
      gameId: game.id,
      playerId: playerInsert.data.id,
      gameCode: game.code,
      movies,
    })
  } catch (err) {
    console.error('Join error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
