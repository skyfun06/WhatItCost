/**
 * Système de score — WhatItCost
 *
 * Formule : score = 5000 × e^(−3 × erreur_relative)
 * où erreur_relative = |guess − actual| / actual
 *
 * Table de correspondance :
 *   0 %  d'erreur  → 5 000 pts  (parfait)
 *  10 %  d'erreur  → 3 704 pts
 *  25 %  d'erreur  → 2 362 pts
 *  50 %  d'erreur  → 1 116 pts
 * 100 %  d'erreur  →   249 pts
 * 200 %  d'erreur  →    12 pts
 *
 * Choix de la formule exponentielle plutôt que par paliers :
 * - Progressive (pas de "cliff" frustrant à 1 $ près d'un seuil)
 * - Toujours récompense même les très mauvaises estimations
 * - Paramètre k=3 calibré pour que 100% d'erreur ≈ 250 pts (pas zéro)
 */

const MAX_SCORE = 5_000
const K = 3 // Coefficient de décroissance

/** Calcule le score pour une estimation donnée */
export function computeScore(guess: number, actual: number): number {
  if (actual <= 0 || guess < 0) return 0
  const relativeError = Math.abs(guess - actual) / actual
  return Math.max(0, Math.round(MAX_SCORE * Math.exp(-K * relativeError)))
}

/** Précision en % (0–100, 1 décimale). 100% = parfait, 0% = double du budget ou moins */
export function computeAccuracy(guess: number, actual: number): number {
  if (actual <= 0) return 0
  const error = Math.abs(guess - actual) / actual
  return Math.round((1 - Math.min(error, 1)) * 1000) / 10
}

/** Score maximum possible sur une partie complète */
export const MAX_GAME_SCORE = MAX_SCORE * 5 // 25 000 pts pour 5 films
