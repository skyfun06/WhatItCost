// Classement global — onglets par mode, top 50, lecture via /api/leaderboard.
// Shell serveur statique ; les données sont chargées côté client (toujours
// fraîches, pas d'ISR nécessaire).
import AnimatedBackground from '@/components/AnimatedBackground'
import { Header } from '@/components/layout/Header'
import LeaderboardTable from '@/components/LeaderboardTable'

export const metadata = { title: 'Classement' }

export default function LeaderboardPage() {
  return (
    <AnimatedBackground className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <Header />
      <main className="min-h-screen flex justify-center pt-14">
        <div className="w-full max-w-2xl px-4 pt-10 pb-16">
          <LeaderboardTable />
        </div>
      </main>
    </AnimatedBackground>
  )
}
