import { getMovieById, getBackdropUrl, getPosterUrl } from '@/lib/tmdb/client'
import type { PostMeta } from '@/lib/blog'

// Résolution de la couverture d'un article, côté serveur (build/SSG). Ordre :
//   1. `cover` explicite dans le frontmatter (URL libre) ;
//   2. sinon `coverMovieId` → backdrop TMDB du film (repli sur l'affiche) ;
//   3. sinon null → l'appelant garde le dégradé corail (jamais d'image cassée).
// Toute erreur réseau / token TMDB absent retombe sur null sans casser le build.

export interface ResolvedCover {
  url: string
  /** Crédit affiché (la mention TMDB globale reste dans le footer). */
  credit?: string
}

type CoverInput = Pick<PostMeta, 'cover' | 'coverCredit' | 'coverMovieId'>

export async function resolveCover(post: CoverInput): Promise<ResolvedCover | null> {
  if (post.cover) {
    return { url: post.cover, credit: post.coverCredit }
  }
  if (!post.coverMovieId) return null

  try {
    const movie = await getMovieById(post.coverMovieId, 'en-US')
    const credit = post.coverCredit ?? `Image : ${movie.title} — source The Movie Database (TMDB)`

    const backdrop = getBackdropUrl(movie.backdrop_path, 'w1280')
    if (backdrop) return { url: backdrop, credit }

    // Pas de backdrop disponible → repli sur l'affiche (verticale, mais évite le vide).
    if (movie.poster_path) return { url: getPosterUrl(movie.poster_path, 'w500'), credit }

    return null
  } catch {
    return null
  }
}
