import {
  discoverMoviesWithBudget,
  getMovieById,
  getPosterUrl,
  type DiscoverFilters,
} from './client'

// Clés de genre (page Paramètres) → IDs de genre TMDB
const TMDB_GENRE_IDS: Record<string, number> = {
  action: 28,
  drama: 18,
  comedy: 35,
  horror: 27,
  scifi: 878,
  romance: 10749,
}

export type Difficulty = 'all' | 'popular' | 'recent' | 'classics'

export interface MovieFilters {
  /** Clé de genre ('all' | 'action' | 'drama' | 'comedy' | 'horror' | 'scifi'). */
  genre?: string
  difficulty?: Difficulty
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface MovieWithBudget {
  id: number
  title: string
  title_fr: string
  year: number
  director: string | null
  cast_list: string[]
  poster_path: string | null
  poster_url: string
  budget: number
  genres: string[]
  overview: string
  overview_fr: string
}

export async function fetchRandomMoviesWithBudget(
  count = 5,
  filters: MovieFilters = {},
): Promise<MovieWithBudget[]> {
  const genreId =
    filters.genre && filters.genre !== 'all' ? TMDB_GENRE_IDS[filters.genre] : undefined
  const difficulty =
    filters.difficulty && filters.difficulty !== 'all' ? filters.difficulty : undefined
  const discoverFilters: DiscoverFilters = { genreId, difficulty }

  // Vivier proportionnel au nombre de rounds : il faut assez de candidats pour
  // en trouver `count` avec budget > 0 après filtrage (genre/difficulté réduisent
  // encore le pool). ~20 résultats/page.
  const pageCount = Math.min(8, Math.max(4, count))
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      discoverMoviesWithBudget(i + 1, 'fr-FR', discoverFilters),
    ),
  )

  const candidates = shuffle(pages.flatMap((p) => p.results))
  const valid: MovieWithBudget[] = []

  for (let i = 0; i < candidates.length && valid.length < count; i += 10) {
    const batch = candidates.slice(i, i + 10)

    const results = await Promise.all(
      batch.map(async (m) => {
        try {
          const [en, fr] = await Promise.all([
            getMovieById(m.id, 'en-US'),
            getMovieById(m.id, 'fr-FR'),
          ])
          // Exige un budget connu ET une année valide : `movies.year` est un
          // SMALLINT NOT NULL — un NaN (release_date absente) ferait échouer
          // l'upsert et planter tout le /start ou la création de partie.
          const year = parseInt((en.release_date ?? '').slice(0, 4), 10)
          if (en.budget <= 0 || !Number.isFinite(year)) return null
          return {
            id: en.id,
            title: en.title,
            title_fr: fr.title !== en.title ? fr.title : en.title,
            year,
            director: en.credits?.crew.find((c) => c.job === 'Director')?.name ?? null,
            cast_list: (en.credits?.cast ?? []).slice(0, 5).map((a) => a.name),
            poster_path: en.poster_path,
            poster_url: getPosterUrl(en.poster_path),
            budget: en.budget,
            genres: en.genres.map((g) => g.name),
            overview: en.overview,
            overview_fr: fr.overview || en.overview,
          } satisfies MovieWithBudget
        } catch {
          return null
        }
      }),
    )

    for (const movie of results) {
      if (movie) {
        valid.push(movie)
        if (valid.length === count) break
      }
    }
  }

  return valid
}
