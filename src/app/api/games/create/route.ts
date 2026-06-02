import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRandomMoviesWithBudget } from '@/lib/tmdb/fetchMovies'
import { sanitizeSettings, moviesNeeded } from '@/lib/gameSettings'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!process.env.TMDB_API_READ_TOKEN) {
    return NextResponse.json({ error: 'TMDB_API_READ_TOKEN not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const mode: 'solo' | 'multiplayer' = body.mode === 'multiplayer' ? 'multiplayer' : 'solo'
  const playerName: string =
    typeof body.playerName === 'string' && body.playerName.trim() ? body.playerName.trim() : 'Joueur'

  const settings = sanitizeSettings(body)

  try {
    const db = createClient() as any

    // ── Multijoueur : les réglages se configurent dans le lobby, les films sont
    // récupérés AU DÉMARRAGE (/start). On crée donc une partie "waiting" vide. ──
    if (mode === 'multiplayer') {
      const gameInsert = await db
        .from('games')
        .insert({
          mode,
          status: 'waiting',
          movie_ids: [],
          current_round: 1,
          timer_seconds: settings.timer,
          difficulty: settings.difficulty,
          genre: settings.genre,
          // Réglages reçus (sanitizés) : si l'hôte a déjà configuré sur /settings,
          // le lobby les pré-affiche au lieu de repartir sur les valeurs par défaut.
          // Body sans réglages → sanitizeSettings renvoie les défauts (flux accueil).
          game_settings: settings,
          locale: 'fr',
        })
        .select()
        .single() as { data: GameRow | null; error: Error | null }

      if (gameInsert.error || !gameInsert.data) {
        console.error('Game create error (multi):', gameInsert.error)
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
      }
      const game = gameInsert.data

      const playerInsert = await db
        .from('players')
        .insert({ game_id: game.id, name: playerName, is_host: true, total_score: 0 })
        .select()
        .single() as { data: PlayerRow | null; error: Error | null }

      if (playerInsert.error || !playerInsert.data) {
        console.error('Player create error (multi):', playerInsert.error)
        return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
      }

      return NextResponse.json({
        gameId: game.id,
        playerId: playerInsert.data.id,
        gameCode: game.code,
      })
    }

    // ── Solo : réglages choisis sur /settings → on récupère les films tout de suite ──
    const count = moviesNeeded(settings)
    const movies = await fetchRandomMoviesWithBudget(count, {
      genre: settings.genre,
      difficulty: settings.difficulty,
    })
    if (movies.length < count) {
      return NextResponse.json(
        { error: 'Not enough movies for these settings. Try a broader genre/difficulty.' },
        { status: 503 },
      )
    }

    const moviesUpsert = await db.from('movies').upsert(
      movies.map((m) => ({
        id: m.id, title: m.title, title_fr: m.title_fr, year: m.year,
        director: m.director, cast_list: m.cast_list, poster_path: m.poster_path,
        budget: m.budget, genres: m.genres, overview: m.overview, overview_fr: m.overview_fr,
      })),
      { onConflict: 'id' },
    ) as { error: Error | null }
    if (moviesUpsert.error) {
      console.error('Movies upsert error:', moviesUpsert.error)
      return NextResponse.json({ error: 'Failed to save movies' }, { status: 500 })
    }

    const gameInsert = await db
      .from('games')
      .insert({
        mode: 'solo',
        status: 'playing',
        movie_ids: movies.map((m) => m.id),
        current_round: 1,
        timer_seconds: settings.timer,
        difficulty: settings.difficulty,
        genre: settings.genre,
        game_settings: settings,
        locale: 'fr',
      })
      .select()
      .single() as { data: GameRow | null; error: Error | null }
    if (gameInsert.error || !gameInsert.data) {
      console.error('Game create error (solo):', gameInsert.error)
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
    const game = gameInsert.data

    const playerInsert = await db
      .from('players')
      .insert({ game_id: game.id, name: playerName, is_host: true, total_score: 0 })
      .select()
      .single() as { data: PlayerRow | null; error: Error | null }
    if (playerInsert.error || !playerInsert.data) {
      console.error('Player create error (solo):', playerInsert.error)
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
    }

    // Budget masqué (révélé après chaque guess). En Higher or Lower, le film
    // "gauche" (index pair) garde son budget visible pour la comparaison.
    const isHoL = settings.gameMode === 'higher_or_lower'
    const moviesForClient = movies.map((m, index) => ({
      id: m.id, title: m.title, title_fr: m.title_fr, year: m.year,
      director: m.director, cast_list: m.cast_list, poster_path: m.poster_path,
      poster_url: m.poster_url, genres: m.genres, overview: m.overview, overview_fr: m.overview_fr,
      budget: isHoL && index % 2 === 0 ? m.budget : null,
    }))

    return NextResponse.json({
      gameId: game.id,
      playerId: playerInsert.data.id,
      gameCode: game.code,
      timerSeconds: settings.timer,
      gameMode: settings.gameMode,
      movies: moviesForClient,
    })
  } catch (err) {
    console.error('Create game error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
