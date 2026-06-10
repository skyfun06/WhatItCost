/**
 * Pseudo persistant du joueur — partagé entre le leaderboard global et le multi
 * (lobby/create, join). Stocké en localStorage sous une clé dédiée (on ne touche
 * pas aux clés de jeu existantes : wic_movies, wic_hol_best, …).
 *
 * La validation (sanitizePlayerName) est pure et sans dépendance navigateur :
 * elle est réutilisée telle quelle côté serveur par /api/leaderboard/submit.
 */

export const PLAYER_NAME_KEY = 'wic_player_name'
export const PLAYER_NAME_MIN = 2
export const PLAYER_NAME_MAX = 20

// Caractères interdits dans un pseudo (anti-injection HTML basique).
const FORBIDDEN_CHARS = '<>{}[]\\'

/**
 * Nettoie et valide un pseudo : caractères de contrôle (code point < 0x20 et
 * 0x7F) et caractères interdits retirés, espaces normalisés + trim.
 * Retourne le pseudo normalisé, ou null si invalide (longueur hors 2–20).
 */
export function sanitizePlayerName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code >= 0x20 && code !== 0x7f && !FORBIDDEN_CHARS.includes(ch)
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length < PLAYER_NAME_MIN || cleaned.length > PLAYER_NAME_MAX) return null
  return cleaned
}

/** Pseudo mémorisé (déjà validé), ou null si absent/invalide. Client uniquement. */
export function getStoredPlayerName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sanitizePlayerName(localStorage.getItem(PLAYER_NAME_KEY))
  } catch {
    return null
  }
}

/** Mémorise le pseudo (no-op si invalide ou localStorage indisponible). */
export function storePlayerName(name: string): void {
  const cleaned = sanitizePlayerName(name)
  if (!cleaned) return
  try {
    localStorage.setItem(PLAYER_NAME_KEY, cleaned)
  } catch {
    /* ignore */
  }
}
