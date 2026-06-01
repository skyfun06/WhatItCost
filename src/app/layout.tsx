import type { Metadata } from 'next'
import Link from 'next/link'
import { Space_Grotesk } from 'next/font/google'
import { LocaleProvider } from '@/contexts/LocaleContext'
import LanguageToggle from '@/components/LanguageToggle'
import CoffeeBanner from '@/components/CoffeeBanner'
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
    title: 'WhatItCost',
    description: 'Guess the production budget of iconic movies.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang défini ici ; le hook useTranslation le met à jour dynamiquement via <html lang>
    <html lang="fr" className={spaceGrotesk.variable}>
      <body className="bg-bg text-white font-sans antialiased min-h-screen overflow-x-hidden">
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

          {/* Bannière de soutien — fixée en bas, masquable */}
          <CoffeeBanner />
        </LocaleProvider>
      </body>
    </html>
  )
}
