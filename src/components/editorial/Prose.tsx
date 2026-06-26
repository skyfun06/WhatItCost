import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Syne } from 'next/font/google'

// Rendu d'un corps Markdown en article lisible. Server component (react-markdown
// rend côté serveur → SSG). Le style privilégie la lecture d'un texte long :
// colonne étroite, interligne confortable, contraste élevé, titres en Syne.
//
// Plutôt que de surcharger chaque composant Markdown un par un, on enveloppe le
// rendu dans `.wic-prose` et on style les éléments via un bloc CSS scopé par ce
// préfixe — les tableaux, citations et listes GFM héritent ainsi du style.

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne', display: 'swap' })

export default function Prose({ children }: { children: string }) {
  return (
    <div className={`wic-prose ${syne.variable}`}>
      <style>{`
        .wic-prose {
          color: #e8e8ea;
          font-size: 1.075rem;
          line-height: 1.75;
          max-width: 700px;
        }
        .wic-prose > *:first-child { margin-top: 0; }
        .wic-prose p { margin: 1.25em 0; }
        .wic-prose h2 {
          font-family: var(--font-syne), system-ui, sans-serif;
          font-weight: 800;
          color: #ffffff;
          font-size: clamp(1.45rem, 4vw, 1.85rem);
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 2.4em 0 0.7em;
        }
        .wic-prose h3 {
          font-family: var(--font-syne), system-ui, sans-serif;
          font-weight: 700;
          color: #ffffff;
          font-size: clamp(1.2rem, 3vw, 1.4rem);
          line-height: 1.25;
          margin: 1.9em 0 0.5em;
        }
        .wic-prose a {
          color: #FF4D2E;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
        }
        .wic-prose a:hover { color: #ff7a5e; }
        .wic-prose strong { color: #ffffff; font-weight: 700; }
        .wic-prose em { color: #d0d0d6; }
        .wic-prose ul, .wic-prose ol { margin: 1.25em 0; padding-left: 1.4em; }
        .wic-prose li { margin: 0.5em 0; }
        .wic-prose ul li::marker { color: #FF4D2E; }
        .wic-prose ol li::marker { color: #FF4D2E; font-weight: 700; }
        .wic-prose blockquote {
          border-left: 3px solid #FF4D2E;
          margin: 1.6em 0;
          padding: 0.2em 0 0.2em 1.2em;
          color: #b8b8c0;
          font-style: italic;
        }
        .wic-prose hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 2.5em 0; }
        .wic-prose code {
          background: #1e1e2a;
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .wic-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.6em 0;
          font-size: 0.95rem;
          display: block;
          overflow-x: auto;
        }
        .wic-prose th, .wic-prose td {
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.6em 0.8em;
          text-align: left;
        }
        .wic-prose th {
          background: #1a1a1a;
          color: #ffffff;
          font-weight: 700;
          white-space: nowrap;
        }
        .wic-prose tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
