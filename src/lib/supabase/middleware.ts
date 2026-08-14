import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rafraîchit la session Supabase à chaque requête et propage les cookies mis à
 * jour (access/refresh token) vers la réponse. Indispensable avec l'auth SSR :
 * sans ça, les Server Components voient une session périmée et l'utilisateur est
 * « déconnecté » de façon aléatoire. Appelé depuis src/middleware.ts.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Ne PAS retirer : c'est cet appel qui déclenche le refresh + le setAll ci-dessus.
  await supabase.auth.getUser()

  return response
}
