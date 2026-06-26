import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/share'

// Sitemap généré au build : pages de jeu principales, pages éditoriales/légales,
// index du blog et chaque article. Aide l'indexation (SEO + AdSense).
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/daily', priority: 0.8, changeFrequency: 'daily' },
    { path: '/leaderboard', priority: 0.6, changeFrequency: 'daily' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/comment-jouer', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/a-propos', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/mentions-legales', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/confidentialite', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticEntries, ...postEntries]
}
