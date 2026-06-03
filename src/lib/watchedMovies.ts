// Mémoire locale (par navigateur) des films déjà joués, pour éviter de retomber
// sur les mêmes d'une partie à l'autre. Ces IDs sont envoyés à la création / au
// démarrage d'une partie (param `excludeIds`) et exclus du tirage côté serveur.
//
// Volontairement plafonné : on ne garde que les N derniers films vus (FIFO), pour
// ne pas finir par exclure tout le vivier et provoquer un « pas assez de films ».

const STORAGE_KEY = 'wic_watched_movie_ids'
const MAX_IDS = 50

/** Liste des movie_ids déjà joués (les plus anciens en tête). */
export function getWatchedMovieIds(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : []
  } catch {
    return []
  }
}

/**
 * Ajoute les films d'une partie à l'historique. Déduplique, conserve l'ordre
 * d'apparition et ne garde que les `MAX_IDS` plus récents (les plus anciens sont
 * supprimés au-delà). Idempotent : rejouer les mêmes IDs ne grossit pas la liste.
 */
export function recordWatchedMovieIds(ids: number[]): void {
  if (typeof window === 'undefined') return
  const clean = ids.filter((id) => Number.isInteger(id))
  if (!clean.length) return
  try {
    const merged = [...getWatchedMovieIds(), ...clean]
    const deduped = Array.from(new Set(merged))
    const trimmed = deduped.slice(Math.max(0, deduped.length - MAX_IDS))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage indisponible (mode privé, quota) — on ignore.
  }
}
