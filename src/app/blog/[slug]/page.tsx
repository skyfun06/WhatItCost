import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Syne } from 'next/font/google'
import AnimatedBackground from '@/components/AnimatedBackground'
import Prose from '@/components/editorial/Prose'
import { getAllSlugs, getPostBySlug, formatDate } from '@/lib/blog'
import { resolveCover } from '@/lib/blogCover'
import { SITE_URL } from '@/lib/share'

const syne = Syne({ subsets: ['latin'], weight: ['800'], display: 'swap' })

interface Params {
  params: { slug: string }
}

// SSG : une page statique par fichier Markdown.
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'Article introuvable' }

  const url = `${SITE_URL}/blog/${post.slug}`
  const cover = await resolveCover(post)
  const image = cover?.url ?? `${SITE_URL}/api/og`

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.date,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  }
}

export default async function BlogPostPage({ params }: Params) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const url = `${SITE_URL}/blog/${post.slug}`
  const cover = await resolveCover(post)

  // JSON-LD BlogPosting — aide les moteurs à comprendre l'article (rich results).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    mainEntityOfPage: url,
    ...(cover ? { image: cover.url } : {}),
    author: { '@type': 'Organization', name: 'WhatItCost' },
    publisher: { '@type': 'Organization', name: 'WhatItCost' },
  }

  return (
    <AnimatedBackground
      className="min-h-screen px-5 pt-24 pb-20 sm:px-6"
      style={{ backgroundColor: '#111111' }}
      symbolOpacity={0.03}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto w-full" style={{ maxWidth: '720px' }}>
        <header className="mb-8">
          <Link href="/blog" className="text-sm font-semibold" style={{ color: '#FF4D2E' }}>
            ← Tous les articles
          </Link>

          <h1
            className={`${syne.className} mt-5 text-white`}
            style={{ fontSize: 'clamp(2rem, 5.5vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            {post.title}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: '#666677' }}>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span style={{ color: '#333344' }}>•</span>
            <span>{post.readingTime} min de lecture</span>
          </div>
        </header>

        {cover && (
          <figure className="mb-10">
            <div
              className="relative w-full overflow-hidden"
              style={{
                borderRadius: '14px',
                aspectRatio: '16 / 9',
                background: 'linear-gradient(120deg, #ff5c3a 0%, #ff8c42 55%, #ffd166 100%)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Léger voile sombre : lisibilité d'un texte blanc superposé + intégration au fond */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05) 60%)' }}
              />
            </div>
            {cover.credit && (
              <figcaption className="mt-2 text-xs" style={{ color: '#555566' }}>
                {cover.credit}
              </figcaption>
            )}
          </figure>
        )}

        <Prose>{post.content}</Prose>

        {/* CTA de fin d'article → renvoie vers le jeu */}
        <div
          className="mt-14 p-7"
          style={{ backgroundColor: '#16161e', border: '1px solid #222230', borderRadius: '14px' }}
        >
          <p className={`${syne.className} text-white`} style={{ fontSize: '1.4rem', lineHeight: 1.2 }}>
            À toi de jouer.
          </p>
          <p className="mt-2 text-sm" style={{ color: '#9999a5' }}>
            Maintenant que tu connais les chiffres, teste ton flair sur WhatItCost : devine
            le budget de production de films cultes, seul ou entre amis.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/settings?mode=solo"
              className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
            >
              Jouer maintenant
            </Link>
            <Link
              href="/daily"
              className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
              style={{ color: '#FF4D2E', border: '1px solid rgba(255,77,46,0.6)', borderRadius: '6px' }}
            >
              🎬 Défi du jour
            </Link>
          </div>
        </div>
      </article>
    </AnimatedBackground>
  )
}
