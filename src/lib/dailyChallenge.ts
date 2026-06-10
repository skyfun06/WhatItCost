/**
 * Défi du jour — seed déterministe par date.
 *
 * RÉFÉRENCE MONDIALE : MINUIT UTC. La date du défi est la date UTC courante
 * (toISOString) ; le défi bascule à 00:00 UTC partout dans le monde (02:00 à
 * Paris l'été, 01:00 l'hiver). Deux joueurs, où qu'ils soient, au même instant,
 * ont la même date → le même seed → le même défi.
 *
 * Chaîne de détermination (aucun Math.random) :
 *   date UTC "YYYY-MM-DD"
 *     → xmur3("wic-daily-" + date)  : hash 32 bits de la chaîne
 *     → mulberry32(seed)            : PRNG déterministe
 *     → tirage 1 = MODE du jour (budget_guess / higher_or_lower)
 *     → tirages suivants = échantillon de films (côté serveur, vivier gelé —
 *       voir /api/daily/start : movies.created_at < minuit UTC du jour).
 *
 * L'ordre des tirages fait partie du contrat : mode D'ABORD, films ENSUITE.
 */

import { type GameModeType } from '@/lib/gameSettings'

// ─── Constantes du défi (identiques pour tous, non seedées) ───────────────────
export const DAILY_BUDGET_ROUNDS = 5 // Budget Guess : 5 films
export const DAILY_CHAIN_POOL = 40 // Higher or Lower : 40 films = 39 maillons max (pas d'extension)
export const DAILY_TIMER_SECONDS = 30

// ─── Date et compte à rebours ─────────────────────────────────────────────────

/** Date du défi courant : la date UTC du moment ("YYYY-MM-DD"). */
export function dailyDateUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Millisecondes restantes avant le prochain défi (prochain minuit UTC). */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.max(0, next - now.getTime())
}

// ─── PRNG déterministe ────────────────────────────────────────────────────────

// xmur3 : hash de chaîne → graine 32 bits (implémentation standard).
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

// mulberry32 : PRNG 32 bits rapide et déterministe → flottants [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * PRNG du jour, déjà "avancé" du tirage du mode : renvoie le mode du défi et
 * le générateur prêt pour les tirages suivants (échantillon de films).
 */
export function dailyDraw(dateStr: string): { mode: GameModeType; rng: () => number } {
  const rng = mulberry32(xmur3(`wic-daily-${dateStr}`)())
  const mode: GameModeType = rng() < 0.5 ? 'budget_guess' : 'higher_or_lower'
  return { mode, rng }
}

/** Mode du défi pour une date (raccourci sans consommer le générateur appelant). */
export function dailyMode(dateStr: string): GameModeType {
  return dailyDraw(dateStr).mode
}

/**
 * Échantillon déterministe de n éléments (Fisher-Yates partiel piloté par rng).
 * L'ordre du résultat est lui aussi déterministe.
 */
export function seededSample<T>(items: readonly T[], n: number, rng: () => number): T[] {
  const a = [...items]
  const k = Math.min(n, a.length)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

// ─── État local "un essai par jour" (contournable, assumé — comme Wordle) ─────

const DAILY_STORAGE_KEY = 'wic_daily'

export interface DailyState {
  date: string
  gameId: string
  mode: GameModeType
  done: boolean
  score: number | null
}

/** État du défi du JOUR COURANT, ou null (jamais joué / état d'un autre jour). */
export function getDailyState(): DailyState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as DailyState
    if (s?.date !== dailyDateUTC()) return null // état périmé (défi d'un autre jour)
    return s
  } catch {
    return null
  }
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** La partie donnée est-elle le défi du jour de ce navigateur ? */
export function isDailyGame(gameId: string): boolean {
  return getDailyState()?.gameId === gameId
}

/** Marque le défi du jour comme terminé avec son score (no-op si autre partie). */
export function recordDailyScore(gameId: string, score: number): void {
  const state = getDailyState()
  if (!state || state.gameId !== gameId) return
  saveDailyState({ ...state, done: true, score })
}
