import Link from 'next/link'
import { type PostMeta, formatDate } from '@/lib/blog'

// Carte d'article pour l'index /blog. Server component. Couverture en image si
// fournie (avec dégradé corail en repli), sinon dégradé seul — jamais d'image
// cassée. Toute la carte est cliquable.

export default function BlogCard({ post }: { post: PostMeta }) {
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
        {post.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
        {/* Voile sombre bas pour lisibilité d'un éventuel libellé */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 55%)' }}
        />
      </div>

      {/* Texte */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: '#666677' }}>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span style={{ color: '#333344' }}>•</span>
          <span>{post.readingTime} min</span>
        </div>
        <h2 className="mb-2 font-bold leading-snug text-white transition-colors group-hover:text-[#FF4D2E]" style={{ fontSize: '1.2rem' }}>
          {post.title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#9999a5' }}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  )
}
