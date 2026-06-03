/**
 * Système de score — WhatItCost
 *
 * Principe : le score est proportionnel à la « proximité » entre l'estimation et
 * le vrai budget, mesurée comme un RATIO (et non un écart absolu) :
 *
 *   proximité = min(guess, actual) / max(guess, actual)   ∈ [0, 1]
 *   score     = 5000 × proximité
 *
 * Pourquoi un ratio plutôt que |guess − actual| / actual ?
 * → Cohérence : se tromper d'un facteur 2 vaut le même score qu'on devine la
 *   moitié OU le double du budget (l'ancienne formule punissait 2× plus fort le
 *   sur-estimation : 50 % d'erreur = 1116 pts mais 100 % = 249 pts pour le même
 *   facteur 2). Estimer un budget se pense en ordres de grandeur, pas en écart $.
 * → Lisibilité : le score en % = exactement « à quel point tu étais proche ».
 *   80 % de proximité → 80 % des points. Pas de courbe opaque.
 *
 * Table de correspondance (proximité → score) :
 *   exact          → 5 000 pts  (100 %)
 *   ±10 %          → ~4 500 pts  (≈ 90 %)
 *   ±25 %          → ~4 000 pts  (≈ 80 %)
 *   facteur 1.5    → ~3 300 pts  (≈ 67 %)
 *   facteur 2      → 2 500 pts   (50 %)
 *   facteur 3      → ~1 670 pts  (≈ 33 %)
 *   facteur 5      → 1 000 pts   (20 %)
 *   facteur 10     →   500 pts   (10 %)
 *
 * Volontairement bien plus généreux que l'ancienne courbe exponentielle (k=3) :
 * une bonne estimation se sent enfin récompensée, et même une mauvaise garde des
 * points (jamais zéro tant que l'estimation est positive).
 */

const MAX_SCORE = 5_000

/** Proximité [0, 1] entre estimation et budget réel (ratio petit/grand). */
function closeness(guess: number, actual: number): number {
  if (actual <= 0 || guess <= 0) return 0
  return Math.min(guess, actual) / Math.max(guess, actual)
}

/** Calcule le score pour une estimation donnée (0 à 5000). */
export function computeScore(guess: number, actual: number): number {
  return Math.round(MAX_SCORE * closeness(guess, actual))
}

/** Précision en % (0–100, 1 décimale). 100 % = parfait. */
export function computeAccuracy(guess: number, actual: number): number {
  return Math.round(closeness(guess, actual) * 1000) / 10
}

/** Score maximum possible pour un round (film) en mode estimation de budget. */
export const MAX_ROUND_SCORE = MAX_SCORE
