import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Callback OAuth (Google). Supabase redirige ici avec un `code` (flux PKCE) que
 * l'on échange contre une session ; le cookie de session est posé par le client
 * serveur. On revient ensuite sur `next` (par défaut la page Paramètres).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/settings'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[WIC] auth/callback exchange error', error.message)
  }

  // Échec (code absent ou échange refusé) → retour Paramètres avec un flag.
  return NextResponse.redirect(`${origin}/settings?auth_error=1`)
}
