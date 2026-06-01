import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { LocaleProvider } from '@/contexts/LocaleContext'
import LanguageToggle from '@/components/LanguageToggle'
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
          {/* Sélecteur de langue global — visible sur toutes les pages */}
          <LanguageToggle />
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
