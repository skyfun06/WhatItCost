import { fr } from './fr'
import { en } from './en'

export type Locale = 'fr' | 'en'

// Le type de toutes les clés de traduction — dérivé du FR (référence).
// LooseTranslations remplace les string literals par string pour permettre
// des valeurs différentes en EN tout en vérifiant la couverture des clés.
type LooseTranslations<T> = T extends string
  ? string
  : T extends object
    ? { readonly [K in keyof T]: LooseTranslations<T[K]> }
    : T

export type Translations = LooseTranslations<typeof fr>

// satisfies garantit la cohérence entre fr et en (mêmes clés, mêmes types)
export const translations = { fr, en } satisfies Record<Locale, Translations>

export const defaultLocale: Locale = 'fr'
export { fr, en }
