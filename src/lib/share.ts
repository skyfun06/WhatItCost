// Helpers de partage réutilisés par les deux modes (Budget Guess & chaîne HoL).
// Capture une scorecard en image et propose Web Share natif / Twitter / lien.

export const SITE_URL = 'https://whatitcost.fr'

// Capture un nœud DOM en blob PNG via html2canvas (chargé en dynamic import).
// backgroundColor #111 + useCORS pour les images same-origin (proxy /api/poster).
export async function captureCard(node: HTMLElement): Promise<Blob | null> {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(node, {
    backgroundColor: '#111111',
    scale: 2,
    useCORS: true,
    logging: false,
  })
  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// Télécharge un blob via une ancre <a download> éphémère.
export function downloadBlob(blob: Blob, fileName = 'whatitcost.png') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Partage natif (Web Share API niveau fichier) si supporté → menu OS (Discord,
// Twitter, Insta…). Sinon repli sur téléchargement. Renvoie le chemin emprunté.
export async function shareImage(
  blob: Blob,
  opts: { text?: string; fileName?: string; title?: string } = {},
): Promise<'shared' | 'downloaded'> {
  const fileName = opts.fileName ?? 'whatitcost.png'
  try {
    const file = new File([blob], fileName, { type: 'image/png' })
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean
    }
    if (typeof navigator !== 'undefined' && nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: opts.text, title: opts.title })
      return 'shared'
    }
  } catch (e) {
    // L'utilisateur a annulé le menu natif (AbortError) → on n'enchaîne pas le
    // téléchargement (ce serait surprenant). Autres erreurs → repli download.
    if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
    console.error('[WIC] shareImage', e)
  }
  downloadBlob(blob, fileName)
  return 'downloaded'
}

// URL d'intent Twitter/X (l'image ne peut pas y être jointe → on télécharge à côté).
export function tweetIntentUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

// Lien à partager, porteur du score → embed Open Graph personnalisé (cf. /api/og
// + generateMetadata de la home).
export function shareUrl(params: { mode: 'chain' | 'budget'; score: number }): string {
  const sp = new URLSearchParams({ mode: params.mode, score: String(params.score) })
  return `${SITE_URL}/?${sp.toString()}`
}

// Copie un texte dans le presse-papier (repli execCommand pour vieux navigateurs).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
