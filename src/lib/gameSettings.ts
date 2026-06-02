// Réglages de partie partagés (page Réglages, lobby, routes API).

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
  difficulty: Difficulty
  genre: Genre
  gameMode: GameModeType
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 5,
  timer: 30,
  difficulty: 'all',
  genre: 'all',
  gameMode: 'budget_guess',
}

// Replie n'importe quelle entrée (URL, body, JSONB) sur des valeurs sûres.
export function sanitizeSettings(raw: unknown): GameSettings {
  const r = (raw ?? {}) as Record<string, unknown>
  const rounds = [3, 5, 10].includes(Number(r.rounds)) ? Number(r.rounds) : 5
  const timer = [0, 15, 30, 60].includes(Number(r.timer)) ? Number(r.timer) : 30
  const difficulty = (DIFFICULTY_KEYS as readonly string[]).includes(r.difficulty as string)
    ? (r.difficulty as Difficulty)
    : 'all'
  const genre = (GENRE_KEYS as readonly string[]).includes(r.genre as string)
    ? (r.genre as Genre)
    : 'all'
  const gameMode = (GAME_MODE_KEYS as readonly string[]).includes(r.gameMode as string)
    ? (r.gameMode as GameModeType)
    : 'budget_guess'
  return { rounds, timer, difficulty, genre, gameMode }
}

// Nombre de films à charger : Higher or Lower compare 2 films par round.
export function moviesNeeded(s: GameSettings): number {
  return s.gameMode === 'higher_or_lower' ? s.rounds * 2 : s.rounds
}
