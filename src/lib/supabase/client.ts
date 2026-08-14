import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Client Supabase côté navigateur.
 *
 * Appelé dans les Client Components ('use client').
 * Crée un singleton par convention — l'instancier dans un useMemo ou
 * module-level si les re-renders posent problème.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Type du client navigateur, dérivé de createClient — évite de réécrire à la main
// les génériques de SupabaseClient (dont la signature varie selon la version).
export type BrowserClient = ReturnType<typeof createClient>
