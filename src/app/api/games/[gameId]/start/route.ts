import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRandomMoviesWithBudget, fetchMovieChain } from '@/lib/tmdb/fetchMovies'
import { sanitizeSettings, moviesNeeded, HOL_THEMED_MIN_START } from '@/lib/gameSettings'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const body = await request.json()
    const { playerId } = body
    const { gameId } = params
    // Films déjà joués sur le navigateur de l'hôte, à exclure du tirage.
    const excludeIds: number[] = Array.isArray(body.excludeIds)
      ? body.excludeIds.filter((n: unknown) => Number.isInteger(n))
      : []
    console.log(`[WIC] /start: gameId=${gameId}, playerId=${playerId}`)

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 })
    }
    if (!process.env.TMDB_API_READ_TOKEN) {
      return NextResponse.json({ error: 'TMDB_API_READ_TOKEN not configured' }, { status: 500 })
    }

    const db = createClient() as any

    const playerResult = await db
      .from('players')
      .select('is_host')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single() as { data: Pick<PlayerRow, 'is_host'> | null; error: Error | null }

    if (playerResult.error) console.error('[WIC] /start: player lookup error', playerResult.error)
    if (!playerResult.data?.is_host) {
      console.error('[WIC] /start: non-host ou joueur introuvable → 403')
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    // Réglages configurés dans le lobby
    const gameRes = await db
      .from('games')
      .select('game_settings, movie_ids, status')
      .eq('id', gameId)
      .single() as { data: Pick<GameRow, 'game_settings' | 'movie_ids' | 'status'> | null; error: Error | null }
    if (gameRes.error || !gameRes.data) {
      console.error('[WIC] /start: partie introuvable', gameRes.error)
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Déjà démarrée → idempotent
    if (gameRes.data.status === 'playing') {
      console.log('[WIC] /start: déjà en playing (idempotent)')
      return NextResponse.json({ ok: true })
    }

    const settings = sanitizeSettings(gameRes.data.game_settings)
    const isHoL = settings.gameMode === 'higher_or_lower'
    const count = moviesNeeded(settings)
    console.log(`[WIC] /start: réglages`, settings, `→ ${count} films`)

    // Le thème (si présent) remplace genres + difficultés dans le tirage.
    const movies = isHoL
      ? await fetchMovieChain(count, { genres: settings.genres, difficulties: settings.difficulties, theme: settings.theme }, excludeIds)
      : await fetchRandomMoviesWithBudget(count, {
          genres: settings.genres,
          difficulties: settings.difficulties,
          theme: settings.theme,
        }, excludeIds)
    // Chaîne THÉMATIQUE : pool court (≥ HOL_THEMED_MIN_START) accepté plutôt qu'un
    // 503 — l'épuisement déclenche l'écran de victoire. settings.theme + HoL
    // implique supportsChain (sanitizeSettings force budget_guess sinon).
    const minCount = isHoL && settings.theme ? Math.min(HOL_THEMED_MIN_START, count) : count
    if (movies.length < minCount) {
      console.error(`[WIC] /start: pas assez de films (${movies.length}/${count}, min=${minCount})`)
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
      console.error('[WIC] /start: échec upsert movies', moviesUpsert.error)
      return NextResponse.json({ error: 'Failed to save movies' }, { status: 500 })
    }

    const { error: updateErr } = await db
      .from('games')
      .update({
        status: 'playing',
        current_round: 1,
        movie_ids: movies.map((m) => m.id),
        timer_seconds: settings.timer,
        // genre/difficulty : voir game_settings (source de vérité multi-sélection).
        // Référence commune du minuteur (round 1). Tous les clients calculent le
        // temps restant à partir de cet instant → pas de dérive ni de reset au refresh.
        round_started_at: new Date().toISOString(),
      })
      .eq('id', gameId)
    if (updateErr) {
      console.error('[WIC] /start: échec update status=playing', updateErr)
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
    }

    console.log(`[WIC] /start: OK — game ${gameId} status=playing, ${movies.length} films, mode=${settings.gameMode}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WIC] /start error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
