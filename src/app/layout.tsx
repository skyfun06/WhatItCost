import type { Metadata } from 'next'
import Link from 'next/link'
import { Space_Grotesk } from 'next/font/google'
import { LocaleProvider } from '@/contexts/LocaleContext'
import LanguageToggle from '@/components/LanguageToggle'
import CoffeeBanner from '@/components/CoffeeBanner'
import Footer from '@/components/layout/Footer'
import { MotifStripes } from '@/components/AnimatedBackground'
import './globals.css'

// next/font charge la police en build time, sans requête client vers Google Fonts
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk', // exposée comme variable CSS, référencée dans tailwind.config.ts
  weight: ['400', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'WhatItCost',
    template: '%s — WhatItCost',
  },
  description: 'Devine le budget de production de tes films préférés.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
  other: {
    'google-adsense-account': 'ca-pub-5977412568098329',
  },
  openGraph: {
    title: 'WhatItCost?',
    description: 'Guess the production budget of iconic movies. Can you beat 15,000 pts?',
    url: 'https://whatitcost.fr',
    siteName: 'WhatItCost',
    images: [
      {
        url: 'https://whatitcost.fr/api/og',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WhatItCost?',
    description: 'Guess the production budget of iconic movies.',
    images: ['https://whatitcost.fr/api/og'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang défini ici ; le hook useTranslation le met à jour dynamiquement via <html lang>
    <html lang="fr" className={spaceGrotesk.variable}>
      {/* L'og:image est émis par Next depuis `metadata.openGraph.images` (défaut ci-dessus,
          ou personnalisé par le generateMetadata de la home pour un lien porteur de score). */}
      <body className="bg-bg text-white font-sans antialiased min-h-screen overflow-x-hidden flex flex-col">
        {/*
          Fond GLOBAL unique : couche fixe couvrant tout le viewport (#111111 + motif
          « $ ? »), derrière tout le contenu (-z-10). C'est LE seul motif du footer :
          les pages posent leur propre fond opaque par-dessus (le motif global y est
          donc masqué, pas dupliqué), et le footer — transparent — laisse simplement
          transparaître cette couche, d'où une surface continue sur toute la page,
          footer compris. Opacité volontairement basse pour la lisibilité des liens.
        */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
          style={{ backgroundColor: '#111111' }}
        >
          <MotifStripes symbolOpacity={0.04} />
        </div>

        {/*
          LocaleProvider est un Client Component qui wrap toute l'app.
          Cela permet d'utiliser useTranslation() dans n'importe quel composant client
          sans prop drilling ni rechargement de page.
        */}
        <LocaleProvider>
          {/* Logo cliquable, fixé en haut à gauche de chaque page */}
          <Link
            href="/"
            aria-label="WhatItCost"
            className="fixed top-0 left-0 z-50"
            style={{ padding: '12px 16px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="WhatItCost" style={{ height: '32px', width: 'auto' }} />
          </Link>

          {/* Sélecteur de langue global — en haut à droite */}
          <LanguageToggle />

          {children}

          {/* Footer global — liens éditoriaux + légaux, crawlables sur tout le site.
              mt-auto le colle en bas via le body flex-col. Section additive : il
              s'affiche sous le contenu plein écran du jeu sans en changer la mise en page. */}
          <Footer />

          {/* Bannière de soutien — fixée en bas, masquable */}
          <CoffeeBanner />
        </LocaleProvider>
      </body>
    </html>
  )
}
