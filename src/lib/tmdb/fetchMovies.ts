import {
  discoverMoviesWithBudget,
  getMovieById,
  getPosterUrl,
  type DiscoverFilters,
  type DifficultyFilter,
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
  /** Clés de genre sélectionnées (['all'] ou des clés spécifiques). */
  genres?: string[]
  /** Difficultés sélectionnées (['all'] ou des clés spécifiques). */
  difficulties?: Difficulty[]
}

// rng injectable : Math.random par défaut (parties normales), PRNG seedé pour
// le Défi du jour (sélection déterministe — voir src/lib/dailyChallenge.ts).
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
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

// Profondeur max explorée dans /discover. Élargit le vivier ~×10 vs. la seule
// première page : deux parties consécutives retombent bien plus rarement sur les
// mêmes films. Plafonné car au-delà les films deviennent obscurs (peu de budget
// renseigné) et le risque de pages vides augmente.
const MAX_DISCOVER_PAGE = 10

// Hydrate un candidat (en+fr) en MovieWithBudget complet, ou null si budget/année
// invalides (budget inconnu, release_date absente). Partagé par les deux tirages.
async function hydrateMovie(id: number): Promise<MovieWithBudget | null> {
  try {
    const [en, fr] = await Promise.all([
      getMovieById(id, 'en-US'),
      getMovieById(id, 'fr-FR'),
    ])
    // Exige un budget connu ET une année valide : `movies.year` est un SMALLINT
    // NOT NULL — un NaN (release_date absente) ferait échouer l'upsert.
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
}

// Hydrate des candidats par lots de 10 jusqu'à atteindre `count` films valides.
async function hydrateUntil(candidates: { id: number }[], count: number): Promise<MovieWithBudget[]> {
  const valid: MovieWithBudget[] = []
  for (let i = 0; i < candidates.length && valid.length < count; i += 10) {
    const batch = candidates.slice(i, i + 10)
    const results = await Promise.all(batch.map((m) => hydrateMovie(m.id)))
    for (const movie of results) {
      if (movie) {
        valid.push(movie)
        if (valid.length === count) break
      }
    }
  }
  return valid
}

export async function fetchRandomMoviesWithBudget(
  count = 5,
  filters: MovieFilters = {},
  excludeIds: number[] = [],
): Promise<MovieWithBudget[]> {
  // 'all' = pas de filtre → on ne mappe que les clés spécifiques.
  const genreIds = (filters.genres ?? [])
    .filter((g) => g !== 'all')
    .map((g) => TMDB_GENRE_IDS[g])
    .filter((id): id is number => typeof id === 'number')
  const difficulties = (filters.difficulties ?? [])
    .filter((d): d is DifficultyFilter => d !== 'all')
  const discoverFilters: DiscoverFilters = { genreIds, difficulties }

  // Première page : on l'utilise (résultats réels) ET elle nous donne le nombre de
  // pages réellement disponibles pour ces filtres (un genre/difficulté étroit en a
  // moins), pour ne pas tirer des pages vides au-delà.
  const firstPage = await discoverMoviesWithBudget(1, 'fr-FR', discoverFilters)
  const availablePages = Math.min(MAX_DISCOVER_PAGE, Math.max(1, firstPage.total_pages))

  // Vivier proportionnel au nombre de rounds (~20 résultats/page) MAIS piochés sur
  // des pages AU HASARD parmi celles disponibles, au lieu de toujours les premières
  // (les plus populaires) → c'est ce qui casse la répétition entre parties.
  const pageCount = Math.min(availablePages, Math.max(4, count))
  const chosenPages = shuffle(
    Array.from({ length: availablePages }, (_, i) => i + 1),
  ).slice(0, pageCount)

  const pages = await Promise.all(
    chosenPages.map((p) =>
      p === 1 ? firstPage : discoverMoviesWithBudget(p, 'fr-FR', discoverFilters),
    ),
  )

  // Déduplique le vivier par ID (Fix 3 : une partie ne peut pas présenter deux
  // fois le même film), puis le trie en deux tiers : films jamais joués d'abord,
  // films déjà joués en repli. L'exclusion (Fix 2) est ainsi « best-effort » :
  // on évite les répétitions tant que possible, mais on ne tombe JAMAIS sous
  // `count` à cause d'elle (sinon un filtre étroit + historique chargé → 503).
  const excluded = new Set(excludeIds)
  const seen = new Set<number>()
  const unique = pages.flatMap((p) => p.results).filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
  const candidates = [
    ...shuffle(unique.filter((m) => !excluded.has(m.id))),
    ...shuffle(unique.filter((m) => excluded.has(m.id))),
  ]

  return hydrateUntil(candidates, count)
}

// ─── Higher or Lower : tirage diversifié pour une chaîne ──────────────────────

// Paliers de budget (en dollars) servant à diversifier la chaîne.
function budgetTier(budget: number): 0 | 1 | 2 | 3 {
  if (budget < 10_000_000) return 0 // indie
  if (budget < 80_000_000) return 1 // mid
  if (budget < 200_000_000) return 2 // major
  return 3 // blockbuster
}

/**
 * Ordonne une liste de films pour une chaîne Higher or Lower « difficile » :
 *  - on alterne les paliers de budget (indie/mid/major/blockbuster) pour éviter
 *    les longues séries homogènes (= devinettes triviales) ;
 *  - ~1 maillon sur 3, on force un voisin d'écart < 20 % (maillon serré, dur).
 * Heuristique gloutonne : à chaque étape on choisit le prochain film selon le
 * film courant. Casse le « pile ou face » du tout-blockbuster.
 */
export function orderChain<T extends { budget: number }>(
  movies: T[],
  rng: () => number = Math.random,
): T[] {
  if (movies.length <= 2) return movies
  const pool = shuffle(movies, rng)
  const ordered: T[] = [pool.shift()!]

  while (pool.length) {
    const prev = ordered[ordered.length - 1]
    const wantClose = rng() < 0.35
    let bestIdx = 0
    let bestScore = -Infinity
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i]
      const ratio = Math.abs(cand.budget - prev.budget) / Math.max(prev.budget, 1)
      // Maillon serré recherché → score haut quand l'écart est < 20 %.
      // Sinon → on privilégie un palier différent (diversité d'échelle).
      const score = wantClose
        ? -Math.abs(ratio - 0.1) // proche de ~10 % d'écart
        : (budgetTier(cand.budget) !== budgetTier(prev.budget) ? 1 : 0) + rng() * 0.5
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    ordered.push(pool.splice(bestIdx, 1)[0])
  }
  return ordered
}

/**
 * Tire un pool de films pour le mode chaîne. Seuil de votes abaissé (capte les
 * indies/mid), genre respecté, difficulté ignorée (portée par l'ordonnancement).
 */
export async function fetchMovieChain(
  count: number,
  filters: MovieFilters = {},
  excludeIds: number[] = [],
): Promise<MovieWithBudget[]> {
  const genreIds = (filters.genres ?? [])
    .filter((g) => g !== 'all')
    .map((g) => TMDB_GENRE_IDS[g])
    .filter((id): id is number => typeof id === 'number')
  // La difficulté filtre le VIVIER (Populaires/Récents/Classiques = quels films),
  // orthogonalement au mélange des paliers de budget (dureté des comparaisons).
  const difficulties = (filters.difficulties ?? [])
    .filter((d): d is DifficultyFilter => d !== 'all')
  // Sans "Populaires", on abaisse le seuil de votes pour capter indies/mid (budgets
  // variés). Avec "Populaires", on respecte son seuil élevé (films très connus) :
  // dans client.ts minVotes écrase vote_count, donc on l'omet ici.
  const hasPopular = difficulties.includes('popular')
  const discoverFilters: DiscoverFilters = hasPopular
    ? { genreIds, difficulties }
    : { genreIds, difficulties, minVotes: 150 }

  const firstPage = await discoverMoviesWithBudget(1, 'fr-FR', discoverFilters)
  const availablePages = Math.min(MAX_DISCOVER_PAGE, Math.max(1, firstPage.total_pages))
  // Vivier large : on hydrate ~2× le count visé (beaucoup de candidats n'ont pas
  // de budget renseigné) pour avoir de la marge à l'ordonnancement.
  const pageCount = availablePages
  const chosenPages = shuffle(
    Array.from({ length: availablePages }, (_, i) => i + 1),
  ).slice(0, pageCount)

  const pages = await Promise.all(
    chosenPages.map((p) =>
      p === 1 ? firstPage : discoverMoviesWithBudget(p, 'fr-FR', discoverFilters),
    ),
  )

  const excluded = new Set(excludeIds)
  const seen = new Set<number>()
  const unique = pages.flatMap((p) => p.results).filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
  const candidates = [
    ...shuffle(unique.filter((m) => !excluded.has(m.id))),
    ...shuffle(unique.filter((m) => excluded.has(m.id))),
  ]

  const valid = await hydrateUntil(candidates, count)
  return orderChain(valid)
}
