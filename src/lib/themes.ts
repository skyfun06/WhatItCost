// Thématiques : sélections de films ciblées (franchise, studio, décennie, pays,
// concept) utilisables par les modes normaux — et, à terme, par le défi du jour
// (phase 2b, via `dailyEligible`).
//
// Un thème REMPLACE les filtres genres + difficultés : il porte ses propres
// paramètres de tirage figés (pas de combinaison contradictoire possible).
//
// Les IDs TMDB (companies, keywords) sont codés en dur et ont été vérifiés un
// par un : /search/company renvoie souvent un homonyme en premier (faux "A24",
// "Blumhouse Television"…) — ne JAMAIS résoudre ces IDs dynamiquement.
//
// `supportsChain` n'est accordé qu'aux thèmes dont le vivier de films à budget
// connu est structurellement large (mesuré ≥ ~100 ; seuil de design : ≥ 25).
// Les thèmes plus maigres (Pixar ~25-30 longs métrages, James Bond 27) sont
// limités au Budget Guess : sanitizeSettings force le mode côté serveur.

export const THEME_KEYS = [
  'annees-80',
  'annees-90',
  'annees-2000',
  'super-heros',
  'marvel',
  'animation-studios',
  'pixar',
  'zombies',
  'braquages',
  'voyage-temporel',
  'cinema-francais',
  'james-bond',
] as const

export type ThemeKey = (typeof THEME_KEYS)[number]

/** Tirage via /discover (tous les thèmes actuels). */
export interface ThemeDiscoverSource {
  kind: 'discover'
  /** Sociétés de production TMDB, combinées en OU. */
  companyIds?: number[]
  /** Keywords TMDB, combinés en OU. */
  keywordIds?: number[]
  /** Pays d'origine (code ISO 3166-1, ex: 'FR'). */
  originCountry?: string
  /** IDs de genre TMDB, combinés en OU. */
  genreIds?: number[]
  /** Bornes de date de sortie (YYYY-MM-DD). */
  releasedFrom?: string
  releasedTo?: string
  /** Seuil vote_count.gte (bas pour les filtres précis type company). */
  minVotes?: number
  /**
   * Durée minimale (minutes). Indispensable pour les thèmes par société dont
   * le catalogue TMDB contient des courts-métrages sans budget (Pixar…).
   */
  minRuntime?: number
}

/**
 * Tirage par filmographie de réalisateur(s) via /person/{id}/movie_credits.
 * Déclaré pour l'architecture (phase 1) — aucun thème ne l'utilise encore, le
 * chemin de tirage correspondant sera implémenté avec le premier thème concerné.
 */
export interface ThemeDirectorsSource {
  kind: 'directors'
  personIds: number[]
}

export type ThemeSource = ThemeDiscoverSource | ThemeDirectorsSource

export interface Theme {
  key: ThemeKey
  /** Affiché devant le label i18n (t.settings.themes[key]). */
  emoji: string
  source: ThemeSource
  /** false → Budget Guess uniquement (vivier < 25 films à budget connu). */
  supportsChain: boolean
  /** Plafonne le pool initial de la chaîne pour un vivier limité (optionnel). */
  chainPoolCap?: number
  /** Phase 2b : éligible comme défi du jour (nécessite le cache taggé). */
  dailyEligible: boolean
}

// Seuils de votes par type de source : un filtre précis (company/keyword) peut
// descendre bas sans bruit ; un filtre large (décennie, pays) doit rester haut
// pour ne pas remonter des films obscurs sans budget renseigné.
const VOTES_COMPANY = 50
const VOTES_KEYWORD = 200
const VOTES_BROAD = 500

export const THEMES: Record<ThemeKey, Theme> = {
  'annees-80': {
    key: 'annees-80',
    emoji: '📼',
    source: {
      kind: 'discover',
      releasedFrom: '1980-01-01',
      releasedTo: '1989-12-31',
      minVotes: VOTES_BROAD,
    },
    supportsChain: true,
    dailyEligible: true,
  },
  'annees-90': {
    key: 'annees-90',
    emoji: '💾',
    source: {
      kind: 'discover',
      releasedFrom: '1990-01-01',
      releasedTo: '1999-12-31',
      minVotes: VOTES_BROAD,
    },
    supportsChain: true,
    dailyEligible: true,
  },
  'annees-2000': {
    key: 'annees-2000',
    emoji: '📀',
    source: {
      kind: 'discover',
      releasedFrom: '2000-01-01',
      releasedTo: '2009-12-31',
      minVotes: VOTES_BROAD,
    },
    supportsChain: true,
    dailyEligible: true,
  },
  'super-heros': {
    key: 'super-heros',
    emoji: '🦸',
    source: { kind: 'discover', keywordIds: [9715], minVotes: VOTES_KEYWORD },
    supportsChain: true,
    dailyEligible: true,
  },
  marvel: {
    key: 'marvel',
    emoji: '🕷️',
    // Marvel Studios + Marvel Entertainment + Marvel Enterprises
    source: { kind: 'discover', companyIds: [420, 7505, 19551], minVotes: VOTES_COMPANY },
    supportsChain: true,
    dailyEligible: true,
  },
  'animation-studios': {
    key: 'animation-studios',
    emoji: '🎨',
    // Pixar | DreamWorks Animation | Walt Disney Animation Studios | Illumination
    source: {
      kind: 'discover',
      companyIds: [3, 521, 6125, 6704],
      minVotes: VOTES_COMPANY,
      minRuntime: 60,
    },
    supportsChain: true,
    dailyEligible: true,
  },
  pixar: {
    key: 'pixar',
    emoji: '💡',
    source: { kind: 'discover', companyIds: [3], minVotes: VOTES_COMPANY, minRuntime: 60 },
    supportsChain: false, // ~25-30 longs métrages à budget connu
    dailyEligible: true,
  },
  zombies: {
    key: 'zombies',
    emoji: '🧟',
    source: { kind: 'discover', keywordIds: [12377], minVotes: VOTES_KEYWORD },
    supportsChain: true,
    dailyEligible: true,
  },
  braquages: {
    key: 'braquages',
    emoji: '💰',
    source: { kind: 'discover', keywordIds: [10051], minVotes: VOTES_KEYWORD },
    supportsChain: true,
    dailyEligible: true,
  },
  'voyage-temporel': {
    key: 'voyage-temporel',
    emoji: '⏳',
    source: { kind: 'discover', keywordIds: [4379], minVotes: VOTES_KEYWORD },
    supportsChain: true,
    dailyEligible: true,
  },
  'cinema-francais': {
    key: 'cinema-francais',
    emoji: '🥖',
    source: { kind: 'discover', originCountry: 'FR', minVotes: VOTES_KEYWORD },
    supportsChain: true,
    dailyEligible: true,
  },
  'james-bond': {
    key: 'james-bond',
    emoji: '🍸',
    source: { kind: 'discover', keywordIds: [306278], minVotes: VOTES_COMPANY },
    supportsChain: false, // 27 films à budget connu
    dailyEligible: true,
  },
}

/** Thème par clé, ou undefined (clé absente, inconnue ou invalide). */
export function getTheme(key: unknown): Theme | undefined {
  return typeof key === 'string' ? THEMES[key as ThemeKey] : undefined
}
