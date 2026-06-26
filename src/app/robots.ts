import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/share'

// robots.txt : tout est indexable sauf les routes d'API. Référence le sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
