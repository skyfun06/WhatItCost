// Écran de résultats — affiché à la fin d'une partie solo ou multi
// Affiche : score total, détail par film, classement (multi), bouton partage
import { Header } from '@/components/layout/Header'
import { StubMessage } from '@/components/StubMessage'

export const metadata = { title: 'Résultats' }

interface Props {
  params: { id: string }
}

export default function ResultsPage({ params }: Props) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg flex items-center justify-center pt-14">
        <StubMessage kind="results" id={params.id} />
      </main>
    </>
  )
}
