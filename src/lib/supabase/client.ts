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
