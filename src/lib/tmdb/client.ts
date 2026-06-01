import type { TMDBMovie, TMDBDiscoverResponse } from './types'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  // Le token est côté serveur uniquement (TMDB_API_READ_TOKEN sans NEXT_PUBLIC_)
  return {
    Authorization: `Bearer ${process.env.TMDB_API_READ_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    // Cache Next.js : revalide toutes les heures (les métadonnées TMDB changent peu)
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${res.statusText} (${endpoint})`)
  }
  return res.json() as Promise<T>
}

// ─── API publique ───────────────────────────────────────────────────────────────

/** Récupère un film par ID TMDB, avec les crédits (réal + acteurs) */
export async function getMovieById(id: number, language = 'fr-FR'): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${id}`, {
    append_to_response: 'credits',
    language,
  })
}

/** Filtres optionnels de découverte (dérivés des paramètres de partie). */
export interface DiscoverFilters {
  /** ID de genre TMDB (ex: 28 = Action). Absent = tous genres. */
  genreId?: number
  /** Difficulté → traduit en filtres TMDB (votes / dates de sortie). */
  difficulty?: 'popular' | 'recent' | 'classics'
}

/**
 * Découverte de films avec budget connu.
 * Critères de base : films populaires, minimum 500 votes, avec budget > 0.
 * Note : TMDB ne permet pas de filtrer nativement sur budget > 0,
 * le filtrage se fait côté app après récupération.
 *
 * Les filtres affinent la requête /discover :
 *  - genreId   → with_genres
 *  - popular   → seuil de votes relevé (films très connus)
 *  - recent    → sortis à partir de 2018
 *  - classics  → sortis avant 2001
 */
export async function discoverMoviesWithBudget(
  page = 1,
  language = 'fr-FR',
  filters: DiscoverFilters = {},
): Promise<TMDBDiscoverResponse> {
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '500',
    page: String(page),
    language,
  }

  if (filters.genreId) params.with_genres = String(filters.genreId)

  switch (filters.difficulty) {
    case 'popular':
      params['vote_count.gte'] = '3000'
      break
    case 'recent':
      params['primary_release_date.gte'] = '2018-01-01'
      break
    case 'classics':
      params['release_date.lte'] = '2000-12-31'
      break
  }

  return tmdbFetch<TMDBDiscoverResponse>('/discover/movie', params)
}

/** Cherche une personne par nom, renvoie le profile_path du premier résultat (ou null). */
export async function searchPersonProfile(name: string): Promise<string | null> {
  try {
    const res = await tmdbFetch<{ results: Array<{ profile_path: string | null }> }>(
      '/search/person',
      { query: name },
    )
    return res.results?.[0]?.profile_path ?? null
  } catch {
    return null
  }
}

// ─── Utilitaires images ─────────────────────────────────────────────────────────

/** Construit l'URL complète d'une affiche TMDB */
export function getPosterUrl(
  path: string | null,
  size: 'w185' | 'w342' | 'w500' | 'original' = 'w500',
): string {
  if (!path) return '/images/poster-placeholder.jpg'
  return `${IMAGE_BASE}/${size}${path}`
}
