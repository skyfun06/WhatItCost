// Retour haptique très léger pour les taps signature (onglet du dock, CTA « Jouer
// solo »). Purement optionnel et défensif :
//   - préférence utilisateur (page Paramètres) respectée en priorité,
//   - feature detection de l'API Vibration (absente sur iOS Safari → no-op),
//   - désactivé si prefers-reduced-motion est actif,
//   - jamais d'erreur, aucun fallback visuel.

// Préférence persistée depuis la page Paramètres. Activé par défaut : la clé
// n'est écrite qu'au moment où l'utilisateur désactive explicitement le retour.
const HAPTICS_KEY = 'wic_haptics'

/** Retour haptique actif ? (défaut : oui). Client uniquement. */
export function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(HAPTICS_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Mémorise la préférence de retour haptique (no-op si localStorage indisponible). */
export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

export function tapHaptic(duration = 10): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  try {
    if (!hapticsEnabled()) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (typeof navigator.vibrate === 'function') navigator.vibrate(duration)
  } catch {
    // API indisponible ou refusée : on ignore silencieusement.
  }
}
