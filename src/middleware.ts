import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rafraîchit la session Supabase (auth SSR) sur chaque navigation. Exclut les
// assets statiques et images pour ne pas tourner inutilement.
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
