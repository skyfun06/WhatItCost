import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMovieChain } from '@/lib/tmdb/fetchMovies'
import { sanitizeSettings, HOL_REFILL } from '@/lib/gameSettings'
import type { Database } from '@/lib/supabase/database.types'

type GameRow = Database['public']['Tables']['games']['Row']

export const dynamic = 'force-dynamic'

// Prolonge la chaîne Higher or Lower à la volée : pioche d'autres films diversifiés
// (hors ceux déjà présents) et les ajoute à games.movie_ids. Idempotence relâchée :
// si deux joueurs étendent en même temps on dédoublonne par id à l'append.
export async function POST(
  _request: Request,
  { params }: { params: { gameId: string } },
) {
  try {
    const { gameId } = params
    if (!process.env.TMDB_API_READ_TOKEN) {
      return NextResponse.json({ error: 'TMDB_API_READ_TOKEN not configured' }, { status: 500 })
    }

    const db = createClient() as any

    const gameRes = await db
      .from('games')
      .select('movie_ids, status, game_settings')
      .eq('id', gameId)
      .single() as { data: Pick<GameRow, 'movie_ids' | 'status' | 'game_settings'> | null; error: Error | null }
    if (gameRes.error || !gameRes.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    if (gameRes.data.status === 'finished') {
      return NextResponse.json({ error: 'Game already finished' }, { status: 400 })
    }

    // Défi du jour : la chaîne est FIGÉE (une extension serait aléatoire → les
    // joueurs n'auraient plus le même défi). Finir le pool = écran de victoire.
    if ((gameRes.data.game_settings as { daily?: boolean } | null)?.daily === true) {
      return NextResponse.json({ movies: [], exhausted: true })
    }

    const settings = sanitizeSettings(gameRes.data.game_settings)
    const existing: number[] = Array.isArray(gameRes.data.movie_ids) ? gameRes.data.movie_ids : []

    const movies = await fetchMovieChain(HOL_REFILL, { genres: settings.genres, difficulties: settings.difficulties }, existing)
    const fresh = movies.filter((m) => !existing.includes(m.id))
    if (fresh.length === 0) {
      // Aucun nouveau film disponible (filtre étroit + historique). Le client gère
      // la fin de chaîne par un écran de victoire.
      return NextResponse.json({ movies: [], exhausted: true })
    }

    const moviesUpsert = await db.from('movies').upsert(
      fresh.map((m) => ({
        id: m.id, title: m.title, title_fr: m.title_fr, year: m.year,
        director: m.director, cast_list: m.cast_list, poster_path: m.poster_path,
        budget: m.budget, genres: m.genres, overview: m.overview, overview_fr: m.overview_fr,
      })),
      { onConflict: 'id' },
    ) as { error: Error | null }
    if (moviesUpsert.error) {
      console.error('[WIC] extend-chain: upsert movies', moviesUpsert.error)
      return NextResponse.json({ error: 'Failed to save movies' }, { status: 500 })
    }

    // Relit movie_ids juste avant l'append (réduit la fenêtre de course en multi).
    const reread = await db
      .from('games')
      .select('movie_ids')
      .eq('id', gameId)
      .single() as { data: Pick<GameRow, 'movie_ids'> | null; error: Error | null }
    const current: number[] = Array.isArray(reread.data?.movie_ids) ? reread.data!.movie_ids : existing
    const seen = new Set(current)
    const appended = fresh.map((m) => m.id).filter((id) => !seen.has(id))
    const nextIds = [...current, ...appended]

    const { error: updErr } = await db
      .from('games')
      .update({ movie_ids: nextIds })
      .eq('id', gameId)
    if (updErr) {
      console.error('[WIC] extend-chain: update movie_ids', updErr)
      return NextResponse.json({ error: 'Failed to extend chain' }, { status: 500 })
    }

    // Le client re-GET la liste complète (serveur = source de vérité) : pas de
    // désalignement possible si deux joueurs ont étendu en parallèle.
    return NextResponse.json({ total: nextIds.length, added: appended.length })
  } catch (err) {
    console.error('[WIC] extend-chain error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
