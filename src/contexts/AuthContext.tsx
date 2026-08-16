'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient, type BrowserClient } from '@/lib/supabase/client'

interface AuthContextValue {
  user: User | null
  /** true tant que la session initiale n'a pas été résolue. */
  loading: boolean
  /** Client Supabase navigateur partagé (singleton du provider). */
  supabase: BrowserClient
  /**
   * Lance le flux OAuth Google. En cas de succès, le navigateur est redirigé
   * vers Google (la promesse ne « résout » donc pas côté UI). Retourne une
   * erreur lisible si l'appel échoue avant la redirection (provider non activé,
   * config manquante, réseau) pour que l'appelant puisse l'afficher.
   */
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Fournit l'état d'authentification (compte optionnel Google) à toute l'app.
 * Un seul client navigateur est instancié ici et réutilisé partout, et un seul
 * abonnement onAuthStateChange suit les connexions/déconnexions.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/settings`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) {
        console.error('[WIC] signInWithGoogle', error.message)
        return { error: error.message }
      }
      // Succès : signInWithOAuth déclenche la redirection vers Google.
      return { error: null }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown'
      console.error('[WIC] signInWithGoogle', message)
      return { error: message }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
