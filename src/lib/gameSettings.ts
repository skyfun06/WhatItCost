// Réglages de partie partagés (page Réglages, lobby, routes API).

import { getTheme } from '@/lib/themes'

export const ROUND_OPTIONS = [3, 5, 10] as const

export const TIMER_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 0, label: '∞' }, // 0 = pas de minuteur
] as const

export const DIFFICULTY_KEYS = ['all', 'popular', 'recent', 'classics'] as const
export const GENRE_KEYS = ['all', 'action', 'drama', 'comedy', 'horror', 'scifi', 'romance'] as const
export const GAME_MODE_KEYS = ['budget_guess', 'higher_or_lower'] as const

export type Difficulty = (typeof DIFFICULTY_KEYS)[number]
export type Genre = (typeof GENRE_KEYS)[number]
export type GameModeType = (typeof GAME_MODE_KEYS)[number]

export interface GameSettings {
  rounds: number
  timer: number
  // Multi-sélection : soit ['all'], soit un sous-ensemble non vide de clés
  // spécifiques (jamais 'all' mélangé à des spécifiques — voir collapseMulti).
  difficulties: Difficulty[]
  genres: Genre[]
  gameMode: GameModeType
  /**
   * Clé de thématique (src/lib/themes.ts). Présente → le tirage ignore genres
   * et difficultés (le thème les remplace). Absente → comportement historique.
   */
  theme?: string
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 5,
  timer: 30,
  difficulties: ['popular'], // défaut : Populaires (films au budget plus devinable)
  genres: ['all'],
  gameMode: 'budget_guess',
}

const ALL = 'all'

/**
 * Normalise une sélection multiple selon la règle « Tous » :
 *  - vide → repli sur `fallback`
 *  - contient 'all' → uniquement ['all']
 *  - tous les spécifiques cochés → repli sur ['all']
 *  - sinon → les spécifiques valides, ordonnés selon `keys`
 */
function collapseMulti<T extends string>(
  values: readonly string[],
  keys: readonly T[],
  fallback: readonly T[],
): T[] {
  const valid = new Set<string>(keys)
  const picked = new Set(values.filter((v) => valid.has(v)))
  if (picked.size === 0) return [...fallback]
  if (picked.has(ALL)) return [ALL as T]
  const specifics = keys.filter((k) => k !== ALL)
  if (specifics.every((s) => picked.has(s))) return [ALL as T]
  return specifics.filter((s) => picked.has(s))
}

/**
 * Bascule une option dans une sélection multiple (clic UI), en appliquant la
 * règle « Tous ». Partagé par la page Réglages et le lobby pour un comportement
 * identique :
 *  - clic sur 'all' → uniquement ['all']
 *  - 'all' était actif + clic sur un spécifique → uniquement ce spécifique
 *  - sinon coche/décoche, puis collapseMulti (vide → fallback, complet → ['all'])
 */
export function toggleMultiSelect<T extends string>(
  current: readonly T[],
  clicked: T,
  keys: readonly T[],
  fallback: readonly T[],
): T[] {
  if (clicked === (ALL as T)) return [ALL as T]
  const base = current.includes(ALL as T) ? [] : current.filter((v) => v !== clicked)
  const next = current.includes(clicked) && !current.includes(ALL as T)
    ? base // on retire le cliqué
    : [...base, clicked] // on l'ajoute
  return collapseMulti(next, keys, fallback)
}

// Accepte un tableau (nouveau format) OU une chaîne unique (ancien format stocké
// en base / localStorage) et normalise vers un tableau valide.
function sanitizeMulti<T extends string>(
  rawArray: unknown,
  rawSingle: unknown,
  keys: readonly T[],
  fallback: readonly T[],
): T[] {
  let values: string[] = []
  if (Array.isArray(rawArray)) {
    values = rawArray.filter((v): v is string => typeof v === 'string')
  } else if (typeof rawSingle === 'string') {
    values = [rawSingle]
  }
  return collapseMulti(values, keys, fallback)
}

// Replie n'importe quelle entrée (URL, body, JSONB) sur des valeurs sûres.
export function sanitizeSettings(raw: unknown): GameSettings {
  const r = (raw ?? {}) as Record<string, unknown>
  const rounds = [3, 5, 10].includes(Number(r.rounds)) ? Number(r.rounds) : 5
  const timer = [0, 15, 30, 60].includes(Number(r.timer)) ? Number(r.timer) : 30
  const difficulties = sanitizeMulti(r.difficulties, r.difficulty, DIFFICULTY_KEYS, ['popular'])
  const genres = sanitizeMulti(r.genres, r.genre, GENRE_KEYS, ['all'])
  let gameMode = (GAME_MODE_KEYS as readonly string[]).includes(r.gameMode as string)
    ? (r.gameMode as GameModeType)
    : 'budget_guess'
  // Thème : clé inconnue → absent (tirage normal). Toutes les routes passent par
  // ici (create, start, settings, rematch), donc ces invariants tiennent partout.
  const theme = getTheme(r.theme)
  // Thème au vivier trop maigre pour la chaîne → Budget Guess forcé CÔTÉ SERVEUR
  // (même un body forgé ne peut pas démarrer une chaîne Pixar/Bond).
  if (theme && !theme.supportsChain && gameMode === 'higher_or_lower') {
    gameMode = 'budget_guess'
  }
  return { rounds, timer, difficulties, genres, gameMode, ...(theme ? { theme: theme.key } : {}) }
}

// ─── Higher or Lower (chaîne infinie) ────────────────────────────────────────
// Le mode chaîne ne dépend plus du réglage `rounds` : il précharge un pool de films
// (N films = N−1 maillons) puis le prolonge à la volée quand on approche la fin.
export const HOL_INITIAL_POOL = 40 // films préchargés au démarrage
export const HOL_REFILL = 20 // films ajoutés à chaque extension
export const HOL_LOOKAHEAD = 6 // déclenche l'extension quand il reste ≤ N maillons

// Filet pour les chaînes THÉMATIQUES uniquement : si les exclusions (films déjà
// joués) + les budgets manquants réduisent temporairement le tirage sous le pool
// visé, on démarre quand même avec ≥ N films (l'épuisement déclenche l'écran de
// victoire existant) au lieu d'un 503. Les thèmes supportant la chaîne ont tous
// un vivier structurellement large (≥ 25 par design, ≥ ~100 mesuré) : ce filet
// couvre l'aléa de session, pas un thème maigre — et les thèmes Budget-only ne
// peuvent pas l'atteindre (sanitizeSettings force budget_guess en amont).
export const HOL_THEMED_MIN_START = 15

// Nombre de films à charger au démarrage. Budget Guess = 1 film/round ; Higher or
// Lower = pool initial fixe (chaîne infinie, le réglage `rounds` est ignoré),
// éventuellement plafonné par le thème (vivier limité → chaîne plus courte).
export function moviesNeeded(s: GameSettings): number {
  if (s.gameMode !== 'higher_or_lower') return s.rounds
  const cap = getTheme(s.theme)?.chainPoolCap
  return cap ? Math.min(HOL_INITIAL_POOL, cap) : HOL_INITIAL_POOL
}
