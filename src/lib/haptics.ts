// Retour haptique très léger pour les taps signature (onglet du dock, CTA « Jouer
// solo »). Purement optionnel et défensif :
//   - feature detection de l'API Vibration (absente sur iOS Safari → no-op),
//   - désactivé si prefers-reduced-motion est actif,
//   - jamais d'erreur, aucun fallback visuel.
export function tapHaptic(duration = 10): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (typeof navigator.vibrate === 'function') navigator.vibrate(duration)
  } catch {
    // API indisponible ou refusée : on ignore silencieusement.
  }
}
