import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialPage from '@/components/editorial/EditorialPage'
import BlogCard from '@/components/editorial/BlogCard'
import { getAllPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    "Le blog WhatItCost : budgets de films, coulisses de production, plus gros flops et succès surprises du cinéma. Des chiffres réels et du contexte sur l'économie des films.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Blog — WhatItCost',
    description: "Budgets, coulisses et chiffres du cinéma : tout ce que le jeu effleure, expliqué en détail.",
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <EditorialPage
      eyebrow="Le blog"
      title="Budgets, coulisses & chiffres du cinéma"
      intro="Combien coûte vraiment un film ? Pourquoi les blockbusters explosent les compteurs ? Quels petits budgets ont rapporté des fortunes ? On creuse ici ce que le jeu te fait deviner."
      maxWidth={960}
    >
      {posts.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{ backgroundColor: '#16161e', border: '1px solid #222230', borderRadius: '12px', color: '#9999a5' }}
        >
          <p>Les premiers articles arrivent très bientôt. Reviens vite !</p>
          <Link href="/settings?mode=solo" className="mt-4 inline-block font-semibold" style={{ color: '#FF4D2E' }}>
            En attendant, lance une partie →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </EditorialPage>
  )
}
