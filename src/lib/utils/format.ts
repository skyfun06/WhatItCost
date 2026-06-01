/**
 * Formate un montant en dollars US.
 *
 * @param compact  true  → "$45M", "$1.2B"  (affiché dans le slider)
 *                 false → "$45,000,000"     (affiché dans la révélation)
 */
export function formatBudget(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
    if (amount >= 1_000_000)     return `$${Math.round(amount / 1_000_000)}M`
    if (amount >= 1_000)         return `$${Math.round(amount / 1_000)}K`
    return `$${amount}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formate un score avec séparateur de milliers (ex: 23 400 → "23,400") */
export function formatScore(score: number): string {
  return new Intl.NumberFormat('en-US').format(score)
}

/** Extrait l'année d'une date ISO TMDB ("2001-07-18" → 2001) */
export function extractYear(releaseDate: string): number {
  return parseInt(releaseDate.slice(0, 4), 10)
}
