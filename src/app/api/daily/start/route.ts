import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPosterUrl } from '@/lib/tmdb/client'
import { orderChain } from '@/lib/tmdb/fetchMovies'
import {
  dailyDateUTC,
  dailyDraw,
  seededSample,
  DAILY_BUDGET_ROUNDS,
  DAILY_CHAIN_POOL,
  DAILY_TIMER_SECONDS,
} from '@/lib/dailyChallenge'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']

export const dynamic = 'force-dynamic'

/**
 * Démarre le défi du jour pour UN joueur : crée sa partie solo personnelle,
 * mais avec la sélection de films DU JOUR — identique pour tout le monde.
 *
 * Déterminisme mondial (voir src/lib/dailyChallenge.ts pour le seed) :
 *  - le vivier est GELÉ à minuit UTC : movies WHERE budget > 0 AND
 *    created_at < <date>T00:00:00Z, ORDER BY id. Les films ajoutés au cache en
 *    cours de journée sont exclus jusqu'au lendemain → le vivier est identique
 *    toute la journée, sur toutes les instances serveur, sans stockage préalable.
 *  - l'échantillon (et l'ordre de la chaîne) est tiré du PRNG du jour.
 *
 * Anti-triche : budgets jamais renvoyés au client (comme create/multi) ; en
 * chaîne, seul le budget de la référence de départ est fourni.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const playerName: string =
      typeof body.playerName === 'string' && body.playerName.trim() ? body.playerName.trim() : 'Joueur'

    const date = dailyDateUTC()
    const { mode, rng } = dailyDraw(date)
    const isChain = mode === 'higher_or_lower'
    const count = isChain ? DAILY_CHAIN_POOL : DAILY_BUDGET_ROUNDS

    const db = createClient() as any

    // Vivier gelé à minuit UTC, ordonné par id (base stable de l'échantillonnage).
    const poolResult = await db
      .from('movies')
      .select('id')
      .gt('budget', 0)
      .lt('created_at', `${date}T00:00:00.000Z`)
      .order('id', { ascending: true })
      .limit(10000) as { data: Array<{ id: number }> | null; error: Error | null }
    if (poolResult.error || !poolResult.data) {
      console.error('[WIC] daily/start pool', poolResult.error)
      return NextResponse.json({ error: 'Failed to load movie pool' }, { status: 500 })
    }
    const poolIds = poolResult.data.map((m) => m.id)
    if (poolIds.length < count) {
      return NextResponse.json({ error: 'Not enough movies for the daily challenge' }, { status: 503 })
    }

    const pickedIds = seededSample(poolIds, count, rng)

    const moviesResult = await db
      .from('movies')
      .select('id, title, title_fr, year, director, cast_list, poster_path, budget, genres, overview, overview_fr')
      .in('id', pickedIds) as { data: Partial<MovieRow>[] | null; error: Error | null }
    if (moviesResult.error || !moviesResult.data || moviesResult.data.length < count) {
      console.error('[WIC] daily/start movies', moviesResult.error)
      return NextResponse.json({ error: 'Failed to load movies' }, { status: 500 })
    }

    // Remet l'échantillon dans son ordre déterministe (le .in() ne garantit rien),
    // puis ordonne la chaîne avec l'heuristique existante pilotée par le PRNG.
    const byId = Object.fromEntries(moviesResult.data.map((m) => [m.id!, m]))
    let picked = pickedIds.map((id) => byId[id]).filter(Boolean) as Array<Partial<MovieRow> & { budget: number }>
    if (isChain) picked = orderChain(picked, rng)

    const gameInsert = await db
      .from('games')
      .insert({
        mode: 'solo',
        status: 'playing',
        movie_ids: picked.map((m) => m.id),
        current_round: 1,
        timer_seconds: DAILY_TIMER_SECONDS,
        // daily/dailyDate : marqueurs du défi (lus par extend-chain et l'étape 2).
        game_settings: {
          rounds: DAILY_BUDGET_ROUNDS,
          timer: DAILY_TIMER_SECONDS,
          difficulties: ['all'],
          genres: ['all'],
          gameMode: mode,
          daily: true,
          dailyDate: date,
        },
        locale: 'fr',
      })
      .select()
      .single() as { data: GameRow | null; error: Error | null }
    if (gameInsert.error || !gameInsert.data) {
      console.error('[WIC] daily/start game insert', gameInsert.error)
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
    const game = gameInsert.data

    const playerInsert = await db
      .from('players')
      .insert({ game_id: game.id, name: playerName, is_host: true, total_score: 0 })
      .select()
      .single() as { data: PlayerRow | null; error: Error | null }
    if (playerInsert.error || !playerInsert.data) {
      console.error('[WIC] daily/start player insert', playerInsert.error)
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
    }

    // Budgets masqués (anti-triche). Chaîne : seul le budget de la référence part.
    const moviesForClient = picked.map((m) => ({
      id: m.id, title: m.title, title_fr: m.title_fr, year: m.year,
      director: m.director, cast_list: m.cast_list, poster_path: m.poster_path,
      poster_url: getPosterUrl(m.poster_path ?? null), genres: m.genres,
      overview: m.overview, overview_fr: m.overview_fr,
      budget: null as number | null,
    }))

    return NextResponse.json({
      gameId: game.id,
      playerId: playerInsert.data.id,
      date,
      gameMode: mode,
      timerSeconds: DAILY_TIMER_SECONDS,
      movies: moviesForClient,
      referenceBudget: isChain ? (picked[0]?.budget ?? null) : null,
    })
  } catch (err) {
    console.error('[WIC] daily/start error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
