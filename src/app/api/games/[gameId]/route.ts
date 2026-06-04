import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPosterUrl } from '@/lib/tmdb/client'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { gameId } = params
    const playerId = new URL(request.url).searchParams.get('player_id')
    const db = createClient() as any

    const gameResult = await db
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single() as { data: GameRow | null; error: Error | null }

    if (gameResult.error || !gameResult.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const game = gameResult.data

    const [playersResult, moviesResult] = await Promise.all([
      db.from('players').select('id, name, is_host, total_score').eq('game_id', gameId) as {
        data: Pick<PlayerRow, 'id' | 'name' | 'is_host' | 'total_score'>[] | null
        error: Error | null
      },
      db.from('movies')
        .select('id, title, title_fr, year, director, cast_list, poster_path, budget, genres, overview, overview_fr')
        .in('id', game.movie_ids) as { data: Partial<MovieRow>[] | null; error: Error | null },
    ])

    // Higher or Lower (chaîne) : les budgets restent serveur. La liste est envoyée
    // SANS budget ; seul celui de la référence courante du joueur est révélé (via
    // reference_budget) pour l'affichage initial / la reprise après refresh.
    const isHoL =
      (game.game_settings as { gameMode?: string } | null)?.gameMode === 'higher_or_lower'

    const moviesById = Object.fromEntries((moviesResult.data ?? []).map((m) => [m.id!, m]))
    const orderedRows: Partial<MovieRow>[] = game.movie_ids
      .map((id: number) => moviesById[id])
      .filter(Boolean)
    const movies = orderedRows.map((m: Partial<MovieRow>) => ({
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
      budget: null as number | null,
    }))

    // Position de la référence du joueur (= longueur de chaîne) + budget à révéler.
    let holPosition: number | null = null
    let referenceBudget: number | null = null
    if (isHoL && playerId) {
      const me = (playersResult.data ?? []).find((p) => p.id === playerId)
      if (me) {
        holPosition = me.total_score
        referenceBudget = (orderedRows[holPosition]?.budget ?? null) as number | null
      }
    }

    return NextResponse.json({
      game,
      players: playersResult.data ?? [],
      movies,
      hol_position: holPosition,
      reference_budget: referenceBudget,
    })
  } catch (err) {
    console.error('GET game error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
