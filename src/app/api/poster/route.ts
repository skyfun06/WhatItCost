// Proxy d'affiches TMDB servies en same-origin. html2canvas tainte le canvas (rendu
// blanc) sur des images cross-origin sans en-têtes CORS fiables ; en passant par ce
// proxy, les affiches de la scorecard sont same-origin et capturables.

export const runtime = 'edge'

const ALLOWED_SIZES = new Set(['w92', 'w154', 'w185', 'w342', 'w500', 'original'])
// path TMDB : commence par '/', caractères de fichier simples, extension image.
const PATH_RE = /^\/[\w./-]+\.(jpg|jpeg|png|webp)$/i

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') ?? ''
  const sizeParam = searchParams.get('size') ?? 'w342'
  const size = ALLOWED_SIZES.has(sizeParam) ? sizeParam : 'w342'

  if (!PATH_RE.test(path)) {
    return new Response('Bad path', { status: 400 })
  }

  try {
    const upstream = await fetch(`https://image.tmdb.org/t/p/${size}${path}`, {
      // Cache CDN Next : les affiches sont immuables.
      next: { revalidate: 86400 },
    })
    if (!upstream.ok || !upstream.body) {
      return new Response('Not found', { status: 404 })
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    console.error('[WIC] poster proxy', e)
    return new Response('Upstream error', { status: 502 })
  }
}
