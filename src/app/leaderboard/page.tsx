// Classement global — onglets par mode, top 50, lecture via /api/leaderboard.
// Pas de Header local : comme sur les autres pages, l'en-tête est assuré par le
// layout global (logo fixé en haut à gauche + LanguageToggle en haut à droite).
import AnimatedBackground from '@/components/AnimatedBackground'
import LeaderboardTable from '@/components/LeaderboardTable'

export const metadata = { title: 'Classement' }

export default function LeaderboardPage() {
  return (
    <AnimatedBackground className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <main className="min-h-screen flex justify-center">
        {/* pt-20 : laisse respirer le logo / toggle de langue fixés par le layout */}
        <div className="w-full max-w-2xl px-4 pt-20 pb-16 sm:pt-24">
          <LeaderboardTable />
        </div>
      </main>
    </AnimatedBackground>
  )
}
