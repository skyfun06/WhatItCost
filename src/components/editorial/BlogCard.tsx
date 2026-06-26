import Link from 'next/link'
import { Syne } from 'next/font/google'
import { type PostMeta, formatDate } from '@/lib/blog'
import { resolveCover } from '@/lib/blogCover'

// Carte d'article pour l'index /blog. Server component asynchrone : la couverture
// (backdrop TMDB du film déclaré dans le frontmatter) est résolue au build. Si rien
// n'est trouvé, on garde le dégradé corail — jamais d'image cassée. Toute la carte
// est cliquable.

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' })

export default async function BlogCard({ post }: { post: PostMeta }) {
  const cover = await resolveCover(post)

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: '#16161e',
        border: '1px solid #222230',
        borderRadius: '14px',
      }}
    >
      {/* Couverture */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          background: 'linear-gradient(120deg, #ff5c3a 0%, #ff8c42 55%, #ffd166 100%)',
        }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
        {/* Voile sombre bas : garde un éventuel texte blanc lisible par-dessus l'image */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05) 55%)' }}
        />
      </div>

      {/* Texte — espacements aérés via gap, titre en Syne */}
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: '#666677' }}>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span style={{ color: '#333344' }}>•</span>
          <span>{post.readingTime} min</span>
        </div>
        <h2
          className={`${syne.className} text-white transition-colors group-hover:text-[#FF4D2E]`}
          style={{ fontSize: '1.25rem', lineHeight: 1.35, letterSpacing: '-0.01em' }}
        >
          {post.title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#9999a5' }}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  )
}
