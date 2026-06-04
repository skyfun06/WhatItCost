import type { Metadata } from 'next'
import HomeContent from './HomeContent'

const SITE_URL = 'https://whatitcost.fr'

// Métadonnées dynamiques : un lien partagé porteur du score (whatitcost.fr/?mode=chain
// &score=29) produit un embed Open Graph personnalisé (image /api/og + titre/description).
// Sans params → on hérite des métadonnées par défaut du layout.
export async function generateMetadata(
  { searchParams }: { searchParams: { mode?: string; score?: string } },
): Promise<Metadata> {
  const mode = searchParams.mode
  const scoreNum = Number(searchParams.score)
  const score = Number.isFinite(scoreNum) && scoreNum >= 0 ? Math.floor(scoreNum) : null

  if ((mode === 'chain' || mode === 'budget') && score !== null) {
    const ogImage = `${SITE_URL}/api/og?mode=${mode}&score=${score}`
    const title =
      mode === 'chain' ? `Chaîne de ${score} films — WhatItCost` : `${score} pts — WhatItCost`
    const description =
      mode === 'chain'
        ? `J'ai enchaîné ${score} films sur WhatItCost. Tu fais mieux ?`
        : `J'ai scoré ${score} pts sur WhatItCost. Tu fais mieux ?`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: SITE_URL,
        siteName: 'WhatItCost',
        images: [{ url: ogImage, width: 1200, height: 630 }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  }

  // Pas de params → métadonnées par défaut (héritées du layout)
  return {}
}

export default function HomePage() {
  return <HomeContent />
}
