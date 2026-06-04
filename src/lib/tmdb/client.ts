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

export type DifficultyFilter = 'popular' | 'recent' | 'classics'

/** Filtres optionnels de découverte (dérivés des paramètres de partie). */
export interface DiscoverFilters {
  /** IDs de genre TMDB (ex: [28] = Action). Plusieurs = OU. Vide = tous genres. */
  genreIds?: number[]
  /** Difficultés → traduites en filtres TMDB (votes / dates de sortie). Cumulées (ET). */
  difficulties?: DifficultyFilter[]
  /**
   * Surcharge le seuil `vote_count.gte`. Le mode Higher or Lower l'abaisse pour
   * capter des films à plus petit budget (indies/mid) et casser le « tout-blockbuster ».
   */
  minVotes?: number
}

/**
 * Découverte de films avec budget connu.
 * Critères de base : films populaires, minimum 500 votes, avec budget > 0.
 * Note : TMDB ne permet pas de filtrer nativement sur budget > 0,
 * le filtrage se fait côté app après récupération.
 *
 * Les filtres affinent la requête /discover (multi-sélection) :
 *  - genreIds  → with_genres en OU (a|b) : films d'au moins un des genres
 *  - popular   → seuil de votes relevé (films très connus)
 *  - recent    → sortis à partir de 2018
 *  - classics  → sortis avant 2001
 *  Les difficultés se cumulent (ET). Cas contradictoire recent + classics
 *  (sorti après 2018 ET avant 2000) : on ignore la contrainte de date pour
 *  ne pas renvoyer 0 résultat.
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

  if (filters.genreIds?.length) {
    // OU : un film correspond s'il a AU MOINS un des genres choisis.
    params.with_genres = filters.genreIds.join('|')
  }

  const difficulties = new Set(filters.difficulties ?? [])
  if (difficulties.has('popular')) params['vote_count.gte'] = '3000'

  // Override explicite (mode chaîne) : prime sur les seuils ci-dessus.
  if (typeof filters.minVotes === 'number') params['vote_count.gte'] = String(filters.minVotes)

  const recent = difficulties.has('recent')
  const classics = difficulties.has('classics')
  if (recent && !classics) {
    params['primary_release_date.gte'] = '2018-01-01'
  } else if (classics && !recent) {
    params['release_date.lte'] = '2000-12-31'
  }
  // recent && classics → contradictoire → aucune contrainte de date.

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
