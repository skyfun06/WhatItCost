// Base de données CURÉE À LA MAIN des budgets de séries & animés (par épisode).
//
// Pourquoi un fichier statique et non TMDB : les séries et les animés n'ont pas
// de budget exploitable dans l'API TMDB. Ce fichier est donc la source de vérité
// d'un futur mode de jeu « Séries / Animés » (QCM Budget Guess) — l'UI, le mode et
// la génération des propositions QCM viendront dans une étape ULTÉRIEURE. Ici :
// uniquement les données, leurs types et des accesseurs. Aucune logique de jeu.
//
// Données :
//  - Budget PAR ÉPISODE, en USD. Une SAISON = une entrée distincte (GoT 8 saisons
//    = 8 entrées), car le budget/épisode évolue fortement d'une saison à l'autre.
//  - Ce sont des ESTIMATIONS issues de la presse spécialisée (les studios ne
//    publient pas de chiffres officiels) : le futur mode devra afficher une mention
//    type « budget estimé ». `confidence: 'estimated'` marque les chiffres les plus
//    flous (à présenter avec d'autant plus de prudence).
//  - DEUX ÉCHELLES À NE JAMAIS MÉLANGER : séries live-action en MILLIONS $/épisode,
//    animés en MILLIERS/CENTAINES DE MILLIERS $/épisode (~×100 d'écart). D'où le
//    champ `kind` ('series' | 'anime') : le futur QCM générera ses 3 mauvaises
//    réponses DANS la même catégorie d'échelle pour rester cohérent.
//
// Toutes les valeurs ci-dessous sont fournies/validées à la main. NE PAS inventer
// de budget : pour étendre, voir les blocs « AJOUTER ICI » au bas de chaque
// catégorie et n'utiliser que des chiffres sourcés.

export type EntryKind = 'series' | 'anime'

/** 'estimated' = chiffre plus flou (à afficher avec prudence) ; 'reliable' = mieux étayé. */
export type Confidence = 'reliable' | 'estimated'

export interface BudgetEntry {
  /** Slug unique, ex: 'got-s1', 'one-piece'. */
  id: string
  /** Catégorie d'échelle — sépare strictement séries (M$) et animés (k$). */
  kind: EntryKind
  /** Titre de l'œuvre, ex: 'Game of Thrones'. */
  title: string
  /** Numéro de saison (séries). Absent pour les animés au long cours. */
  season?: number
  /** Libellé affiché, ex: 'Game of Thrones — Saison 1'. */
  label: string
  /** Diffuseur (séries) ou studio d'animation (animés), si fourni. */
  studio?: string
  /** Année de diffusion de la saison, si connue. */
  year?: number
  /** Budget estimé PAR ÉPISODE en USD (valeur centrale retenue). */
  budgetPerEpisodeUsd: number
  /** Nombre d'épisodes de la saison, si connu. */
  episodes?: number
  confidence: Confidence
  /** Contexte court, ex: 'épisode Blackwater à part', 'budget en hausse'. */
  note?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// SÉRIES (budget PAR ÉPISODE, en MILLIONS de dollars — kind: 'series')
// ─────────────────────────────────────────────────────────────────────────────
const SERIES_ENTRIES: BudgetEntry[] = [
  // ── Game of Thrones (HBO) ──
  { id: 'got-s1', kind: 'series', title: 'Game of Thrones', season: 1, label: 'Game of Thrones — Saison 1', studio: 'HBO', year: 2011, budgetPerEpisodeUsd: 6_000_000, episodes: 10, confidence: 'reliable', note: 'Budget initial 50-60 M$/saison' },
  { id: 'got-s2', kind: 'series', title: 'Game of Thrones', season: 2, label: 'Game of Thrones — Saison 2', studio: 'HBO', year: 2012, budgetPerEpisodeUsd: 6_500_000, episodes: 10, confidence: 'reliable', note: 'Épisode « Blackwater » ~8 M$ à part' },
  { id: 'got-s3', kind: 'series', title: 'Game of Thrones', season: 3, label: 'Game of Thrones — Saison 3', studio: 'HBO', year: 2013, budgetPerEpisodeUsd: 7_000_000, episodes: 10, confidence: 'reliable' },
  { id: 'got-s4', kind: 'series', title: 'Game of Thrones', season: 4, label: 'Game of Thrones — Saison 4', studio: 'HBO', year: 2014, budgetPerEpisodeUsd: 8_000_000, episodes: 10, confidence: 'reliable' },
  { id: 'got-s5', kind: 'series', title: 'Game of Thrones', season: 5, label: 'Game of Thrones — Saison 5', studio: 'HBO', year: 2015, budgetPerEpisodeUsd: 8_000_000, episodes: 10, confidence: 'reliable' },
  { id: 'got-s6', kind: 'series', title: 'Game of Thrones', season: 6, label: 'Game of Thrones — Saison 6', studio: 'HBO', year: 2016, budgetPerEpisodeUsd: 10_000_000, episodes: 10, confidence: 'reliable', note: 'Saison à ~100 M$' },
  { id: 'got-s7', kind: 'series', title: 'Game of Thrones', season: 7, label: 'Game of Thrones — Saison 7', studio: 'HBO', year: 2017, budgetPerEpisodeUsd: 10_000_000, episodes: 7, confidence: 'reliable', note: 'Saison à ~70 M$' },
  { id: 'got-s8', kind: 'series', title: 'Game of Thrones', season: 8, label: 'Game of Thrones — Saison 8', studio: 'HBO', year: 2019, budgetPerEpisodeUsd: 15_000_000, episodes: 6, confidence: 'reliable', note: 'Saison à ~90 M$' },

  // ── The Witcher (Netflix) — données les plus précises ──
  { id: 'witcher-s1', kind: 'series', title: 'The Witcher', season: 1, label: 'The Witcher — Saison 1', studio: 'Netflix', year: 2019, budgetPerEpisodeUsd: 11_500_000, episodes: 8, confidence: 'reliable', note: 'Saison $92,1 M' },
  { id: 'witcher-s2', kind: 'series', title: 'The Witcher', season: 2, label: 'The Witcher — Saison 2', studio: 'Netflix', year: 2021, budgetPerEpisodeUsd: 22_000_000, episodes: 8, confidence: 'reliable', note: 'Saison $176,3 M' },
  { id: 'witcher-s3', kind: 'series', title: 'The Witcher', season: 3, label: 'The Witcher — Saison 3', studio: 'Netflix', year: 2023, budgetPerEpisodeUsd: 21_800_000, episodes: 8, confidence: 'reliable', note: 'Saison $175 M' },
  { id: 'witcher-s4', kind: 'series', title: 'The Witcher', season: 4, label: 'The Witcher — Saison 4', studio: 'Netflix', year: 2025, budgetPerEpisodeUsd: 27_000_000, episodes: 8, confidence: 'reliable', note: 'Saison $221 M' },

  // ── Stranger Things (Netflix) ──
  { id: 'stranger-things-s1', kind: 'series', title: 'Stranger Things', season: 1, label: 'Stranger Things — Saison 1', studio: 'Netflix', year: 2016, budgetPerEpisodeUsd: 6_000_000, episodes: 8, confidence: 'reliable', note: 'Saison ~$48 M' },
  { id: 'stranger-things-s2', kind: 'series', title: 'Stranger Things', season: 2, label: 'Stranger Things — Saison 2', studio: 'Netflix', year: 2017, budgetPerEpisodeUsd: 9_000_000, episodes: 9, confidence: 'reliable', note: 'Saison ~$72 M' },
  { id: 'stranger-things-s3', kind: 'series', title: 'Stranger Things', season: 3, label: 'Stranger Things — Saison 3', studio: 'Netflix', year: 2019, budgetPerEpisodeUsd: 9_000_000, episodes: 8, confidence: 'reliable', note: 'Saison ~$80 M, fourchette 8-10 M$' },
  { id: 'stranger-things-s4', kind: 'series', title: 'Stranger Things', season: 4, label: 'Stranger Things — Saison 4', studio: 'Netflix', year: 2022, budgetPerEpisodeUsd: 30_000_000, episodes: 9, confidence: 'reliable', note: 'Saison ~$270 M' },
  { id: 'stranger-things-s5', kind: 'series', title: 'Stranger Things', season: 5, label: 'Stranger Things — Saison 5', studio: 'Netflix', year: 2025, budgetPerEpisodeUsd: 55_000_000, episodes: 8, confidence: 'estimated', note: 'Saison $400-480 M, fourchette 50-60 M$/ép' },

  // ── The Crown (Netflix) ──
  { id: 'the-crown-s1', kind: 'series', title: 'The Crown', season: 1, label: 'The Crown — Saison 1', studio: 'Netflix', year: 2016, budgetPerEpisodeUsd: 13_000_000, episodes: 10, confidence: 'reliable', note: 'Saison ~$130 M' },
  { id: 'the-crown-s2', kind: 'series', title: 'The Crown', season: 2, label: 'The Crown — Saison 2', studio: 'Netflix', year: 2017, budgetPerEpisodeUsd: 13_000_000, episodes: 10, confidence: 'estimated' },
  { id: 'the-crown-s3', kind: 'series', title: 'The Crown', season: 3, label: 'The Crown — Saison 3', studio: 'Netflix', year: 2019, budgetPerEpisodeUsd: 13_000_000, episodes: 10, confidence: 'estimated' },
  { id: 'the-crown-s4', kind: 'series', title: 'The Crown', season: 4, label: 'The Crown — Saison 4', studio: 'Netflix', year: 2020, budgetPerEpisodeUsd: 13_000_000, episodes: 10, confidence: 'estimated' },
  { id: 'the-crown-s5', kind: 'series', title: 'The Crown', season: 5, label: 'The Crown — Saison 5', studio: 'Netflix', year: 2022, budgetPerEpisodeUsd: 14_400_000, episodes: 10, confidence: 'reliable', note: 'Chiffre Forbes' },
  { id: 'the-crown-s6', kind: 'series', title: 'The Crown', season: 6, label: 'The Crown — Saison 6', studio: 'Netflix', year: 2023, budgetPerEpisodeUsd: 14_400_000, episodes: 10, confidence: 'estimated' },

  // ── The Mandalorian (Disney+) ──
  { id: 'mandalorian-s1', kind: 'series', title: 'The Mandalorian', season: 1, label: 'The Mandalorian — Saison 1', studio: 'Disney+', year: 2019, budgetPerEpisodeUsd: 13_500_000, episodes: 8, confidence: 'reliable', note: 'Saison ~$100-120 M, fourchette 12,5-15 M$' },
  { id: 'mandalorian-s2', kind: 'series', title: 'The Mandalorian', season: 2, label: 'The Mandalorian — Saison 2', studio: 'Disney+', year: 2020, budgetPerEpisodeUsd: 13_500_000, episodes: 8, confidence: 'reliable' },
  { id: 'mandalorian-s3', kind: 'series', title: 'The Mandalorian', season: 3, label: 'The Mandalorian — Saison 3', studio: 'Disney+', year: 2023, budgetPerEpisodeUsd: 15_000_000, episodes: 8, confidence: 'estimated', note: 'Saison ~$120 M' },

  // ── House of the Dragon (HBO) ──
  { id: 'house-of-the-dragon-s1', kind: 'series', title: 'House of the Dragon', season: 1, label: 'House of the Dragon — Saison 1', studio: 'HBO', year: 2022, budgetPerEpisodeUsd: 20_000_000, episodes: 10, confidence: 'reliable', note: 'Saison ~$200 M' },
  { id: 'house-of-the-dragon-s2', kind: 'series', title: 'House of the Dragon', season: 2, label: 'House of the Dragon — Saison 2', studio: 'HBO', year: 2024, budgetPerEpisodeUsd: 20_000_000, episodes: 8, confidence: 'estimated' },
  { id: 'house-of-the-dragon-s3', kind: 'series', title: 'House of the Dragon', season: 3, label: 'House of the Dragon — Saison 3', studio: 'HBO', year: 2026, budgetPerEpisodeUsd: 20_000_000, episodes: 8, confidence: 'reliable', note: 'Saison ~$160 M' },

  // ── Breaking Bad (AMC) ──
  { id: 'breaking-bad-s1', kind: 'series', title: 'Breaking Bad', season: 1, label: 'Breaking Bad — Saison 1', studio: 'AMC', year: 2008, budgetPerEpisodeUsd: 3_000_000, episodes: 7, confidence: 'reliable' },
  { id: 'breaking-bad-s2', kind: 'series', title: 'Breaking Bad', season: 2, label: 'Breaking Bad — Saison 2', studio: 'AMC', year: 2009, budgetPerEpisodeUsd: 3_000_000, episodes: 13, confidence: 'reliable' },
  { id: 'breaking-bad-s3', kind: 'series', title: 'Breaking Bad', season: 3, label: 'Breaking Bad — Saison 3', studio: 'AMC', year: 2010, budgetPerEpisodeUsd: 3_000_000, episodes: 13, confidence: 'reliable' },
  { id: 'breaking-bad-s4', kind: 'series', title: 'Breaking Bad', season: 4, label: 'Breaking Bad — Saison 4', studio: 'AMC', year: 2011, budgetPerEpisodeUsd: 3_500_000, episodes: 13, confidence: 'estimated' },
  { id: 'breaking-bad-s5', kind: 'series', title: 'Breaking Bad', season: 5, label: 'Breaking Bad — Saison 5', studio: 'AMC', year: 2012, budgetPerEpisodeUsd: 6_000_000, episodes: 16, confidence: 'reliable', note: 'Saison 5 (2012-13), budget en hausse en fin de série' },

  // ── Prestige / one-shots marquants ──
  { id: 'andor-s1', kind: 'series', title: 'Andor', season: 1, label: 'Andor — Saison 1', studio: 'Disney+', year: 2022, budgetPerEpisodeUsd: 20_000_000, episodes: 12, confidence: 'reliable', note: 'Saison $250 M' },
  { id: 'obi-wan-kenobi', kind: 'series', title: 'Obi-Wan Kenobi', label: 'Obi-Wan Kenobi', studio: 'Disney+', year: 2022, budgetPerEpisodeUsd: 25_000_000, episodes: 6, confidence: 'estimated', note: 'Saison ~$150 M' },
  { id: 'rings-of-power-s1', kind: 'series', title: 'The Lord of the Rings: The Rings of Power', season: 1, label: 'The Lord of the Rings: The Rings of Power — Saison 1', studio: 'Prime Video', year: 2022, budgetPerEpisodeUsd: 58_000_000, episodes: 8, confidence: 'reliable', note: 'Saison $465 M (inclut coûts de lancement)' },
  { id: 'loki-s1', kind: 'series', title: 'Loki', season: 1, label: 'Loki — Saison 1', studio: 'Disney+', year: 2021, budgetPerEpisodeUsd: 25_000_000, episodes: 6, confidence: 'estimated', note: 'Séries Marvel ~$25 M/ép' },

  // AJOUTER ICI de nouvelles SÉRIES (chiffres sourcés uniquement, valeur/épisode en USD).
]

// ─────────────────────────────────────────────────────────────────────────────
// ANIMÉS (budget PAR ÉPISODE, en MILLIERS de dollars — kind: 'anime')
// Échelle ~×100 plus basse que les séries : NE JAMAIS mélanger les deux catégories.
// Budgets japonais peu publics → plusieurs entrées en 'estimated'.
// ─────────────────────────────────────────────────────────────────────────────
const ANIME_ENTRIES: BudgetEntry[] = [
  { id: 'one-piece', kind: 'anime', title: 'One Piece', label: 'One Piece', studio: 'Toei', budgetPerEpisodeUsd: 90_000, confidence: 'reliable', note: 'Post-time skip, moyenne longue série' },
  { id: 'naruto-shippuden', kind: 'anime', title: 'Naruto Shippuden', label: 'Naruto Shippuden', studio: 'Pierrot', budgetPerEpisodeUsd: 100_000, confidence: 'reliable' },
  { id: 'dragon-ball-super', kind: 'anime', title: 'Dragon Ball Super', label: 'Dragon Ball Super', studio: 'Toei', budgetPerEpisodeUsd: 160_000, confidence: 'reliable', note: 'Parmi les plus chers' },
  { id: 'demon-slayer', kind: 'anime', title: 'Demon Slayer', label: 'Demon Slayer', studio: 'Ufotable', budgetPerEpisodeUsd: 80_000, confidence: 'estimated', note: "Qualité d'animation élevée pour le coût" },
  { id: 'jujutsu-kaisen', kind: 'anime', title: 'Jujutsu Kaisen', label: 'Jujutsu Kaisen', studio: 'MAPPA', budgetPerEpisodeUsd: 120_000, confidence: 'estimated' },
  { id: 'black-clover', kind: 'anime', title: 'Black Clover', label: 'Black Clover', studio: 'Pierrot', budgetPerEpisodeUsd: 140_000, confidence: 'estimated' },
  { id: 'one-punch-man-s1', kind: 'anime', title: 'One Punch Man', season: 1, label: 'One Punch Man — Saison 1', studio: 'Madhouse', budgetPerEpisodeUsd: 80_000, confidence: 'estimated' },
  { id: 'ghost-in-the-shell-sac', kind: 'anime', title: 'Ghost in the Shell: SAC', label: 'Ghost in the Shell: SAC', budgetPerEpisodeUsd: 215_000, confidence: 'estimated', note: '~30 M¥/ép' },

  // AJOUTER ICI de nouveaux ANIMÉS (chiffres sourcés uniquement, valeur/épisode en USD).
]

// Base complète (séries puis animés). Ordre stable : pratique pour un futur tirage.
const ALL_ENTRIES: BudgetEntry[] = [...SERIES_ENTRIES, ...ANIME_ENTRIES]

// ─── Accesseurs (pas de logique de jeu — juste l'accès aux données) ───────────

/** Toutes les entrées « série » (live-action), échelle en millions $/épisode. */
export function getSeriesEntries(): BudgetEntry[] {
  return SERIES_ENTRIES
}

/** Toutes les entrées « animé », échelle en milliers $/épisode. */
export function getAnimeEntries(): BudgetEntry[] {
  return ANIME_ENTRIES
}

/** Toutes les entrées, séries et animés confondus. */
export function getAllEntries(): BudgetEntry[] {
  return ALL_ENTRIES
}

/** Entrées d'une catégorie d'échelle donnée. */
export function getEntriesByKind(kind: EntryKind): BudgetEntry[] {
  return kind === 'anime' ? ANIME_ENTRIES : SERIES_ENTRIES
}

/** Une entrée par son slug, ou undefined si introuvable. */
export function getEntryById(id: string): BudgetEntry | undefined {
  return ALL_ENTRIES.find((e) => e.id === id)
}
