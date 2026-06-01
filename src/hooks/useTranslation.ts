'use client'

import { useLocale } from '@/contexts/LocaleContext'
import { translations } from '@/i18n'

/**
 * Hook principal pour accéder aux traductions.
 *
 * Usage :
 *   const { t, locale, setLocale } = useTranslation()
 *   <p>{t.game.round} 1 {t.game.of} 5</p>
 */
export function useTranslation() {
  const { locale, setLocale } = useLocale()
  return { t: translations[locale], locale, setLocale }
}
