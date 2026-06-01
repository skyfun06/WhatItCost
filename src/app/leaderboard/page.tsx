// Classement global — requête Supabase côté serveur, rendu statique avec ISR
import { Header } from '@/components/layout/Header'
import { StubMessage } from '@/components/StubMessage'

export const metadata = { title: 'Classement' }

// Revalidation toutes les 60 secondes (ISR) pour garder le classement frais sans SSR complet
export const revalidate = 60

export default function LeaderboardPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg pt-14">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <StubMessage kind="leaderboard" />
        </div>
      </main>
    </>
  )
}
