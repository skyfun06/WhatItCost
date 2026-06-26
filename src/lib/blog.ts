import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

// Couche d'accès aux articles du blog. Côté serveur uniquement (fs + gray-matter) :
// consommée par des Server Components → génération statique (SSG) au build. Un
// fichier Markdown = un article, le nom du fichier (sans .md) = le slug.

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog')

export interface PostMeta {
  slug: string
  title: string
  /** Date ISO (YYYY-MM-DD) */
  date: string
  /** Résumé court affiché sur les cartes et en meta description. */
  excerpt: string
  /** URL d'image de couverture explicite — prioritaire sur coverMovieId. */
  cover?: string
  /** ID TMDB d'un film de l'article : sa couverture utilise le backdrop de ce film. */
  coverMovieId?: number
  /** Crédit/source de l'image de couverture — optionnel. */
  coverCredit?: string
  tags?: string[]
  /** Temps de lecture estimé en minutes (calculé). */
  readingTime: number
}

export interface Post extends PostMeta {
  /** Corps de l'article en Markdown brut. */
  content: string
}

function readingTimeOf(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function listSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

function parseFile(slug: string): Post | null {
  const fullPath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(fullPath)) return null

  const raw = fs.readFileSync(fullPath, 'utf-8')
  const { data, content } = matter(raw)

  // Un article sans titre/date est ignoré (brouillon incomplet) plutôt que de
  // casser le build.
  if (!data.title || !data.date) return null

  return {
    slug,
    title: String(data.title),
    date: String(data.date),
    excerpt: String(data.excerpt ?? ''),
    cover: data.cover ? String(data.cover) : undefined,
    coverMovieId: Number.isFinite(Number(data.coverMovieId)) && data.coverMovieId
      ? Number(data.coverMovieId)
      : undefined,
    coverCredit: data.coverCredit ? String(data.coverCredit) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    readingTime: readingTimeOf(content),
    content,
  }
}

/** Tous les articles (métadonnées seules), triés du plus récent au plus ancien. */
export function getAllPosts(): PostMeta[] {
  return listSlugs()
    .map(parseFile)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ content: _content, ...meta }) => meta)
}

/** Un article complet (métadonnées + corps Markdown), ou null s'il n'existe pas. */
export function getPostBySlug(slug: string): Post | null {
  return parseFile(slug)
}

/** Slugs pour generateStaticParams. */
export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug)
}

/** Date ISO → libellé lisible FR (ex. « 26 juin 2026 »). */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
