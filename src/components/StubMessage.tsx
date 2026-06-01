'use client'

import { useTranslation } from '@/hooks/useTranslation'

/**
 * Texte de remplacement traduit pour les pages non encore implémentées
 * (classement, résultats). Composant client glissé dans une page serveur
 * pour conserver l'ISR / les métadonnées de la page tout en étant traduit.
 */
export function StubMessage({ kind, id }: { kind: 'leaderboard' | 'results'; id?: string }) {
  const { t } = useTranslation()
  const text =
    kind === 'leaderboard' ? t.leaderboard.todo : t.results.todo.replace('{id}', id ?? '')

  return <p className="text-muted text-sm text-center">{text}</p>
}
