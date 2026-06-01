import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fond sombre principal
        bg: {
          DEFAULT: '#0e0e12',
          card: '#16161e',    // Cartes / blocs contenus
          surface: '#1e1e2a', // Éléments interactifs (inputs, hover)
        },
        // Palette d'accents (identité visuelle WhatItCost)
        coral:  '#ff5c3a',
        orange: '#ff8c42',
        yellow: '#ffd166',
        muted:  '#888899',
      },
      fontFamily: {
        // Référence la variable CSS injectée par next/font dans layout.tsx
        sans: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Dégradé signature pour les titres et boutons CTA
        'brand-gradient': 'linear-gradient(120deg, #ff5c3a 0%, #ff8c42 50%, #ffd166 100%)',
      },
      boxShadow: {
        'coral-sm': '0 4px 32px #ff5c3a55',
        'coral-lg': '0 8px 40px #ff5c3a77',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
