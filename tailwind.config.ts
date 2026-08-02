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
        // Accent unique — la « goutte » orange (token CSS, cf. globals.css :root).
        accent: 'var(--accent)',
        'accent-glow': 'var(--accent-glow)',
        // Palette secondaire conservée (le jaune sert dans les dégradés signature).
        yellow: '#ffd166',
        muted:  '#888899',
      },
      fontFamily: {
        // Référence la variable CSS injectée par next/font dans layout.tsx
        sans: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Dégradé signature (accent → jaune) pour titres et boutons CTA.
        'brand-gradient': 'linear-gradient(120deg, var(--accent) 0%, #ffd166 100%)',
      },
      boxShadow: {
        'coral-sm': '0 4px 32px rgba(255,77,46,0.33)',
        'coral-lg': '0 8px 40px rgba(255,77,46,0.47)',
      },
      borderRadius: {
        // Rayons organiques (tokens CSS) sous des clés DÉDIÉES pour ne pas clobber
        // les défauts Tailwind (rounded-sm/md/lg) ni toucher game/[id] &
        // HigherLowerChain. Classes : rounded-o-sm / rounded-o-md / rounded-o-lg /
        // rounded-pill. En inline : borderRadius: 'var(--r-md)'.
        'o-sm': 'var(--r-sm)',
        'o-md': 'var(--r-md)',
        'o-lg': 'var(--r-lg)',
        pill: 'var(--r-pill)',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        liquid: 'var(--ease-liquid)',
        snappy: 'var(--ease-snappy)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
}

export default config
