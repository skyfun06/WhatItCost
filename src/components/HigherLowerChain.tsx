'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatBudget } from '@/lib/utils/format'
import AnimatedBackground from '@/components/AnimatedBackground'
import LeaderboardSubmit from '@/components/LeaderboardSubmit'
import DailyCountdown from '@/components/DailyCountdown'
import ShareScorecard from '@/components/ShareScorecard'
import { useTranslation } from '@/hooks/useTranslation'
import { recordWatchedMovieIds } from '@/lib/watchedMovies'
import { HOL_LOOKAHEAD } from '@/lib/gameSettings'
import { isDailyGame, recordDailyScore } from '@/lib/dailyChallenge'
import { captureCard, shareImage, downloadBlob, tweetIntentUrl, copyText, shareUrl, SITE_URL } from '@/lib/share'

// Film de la chaîne, SANS budget (les budgets restent serveur, révélés par /guess).
interface ChainMovie {
  id: number
  title: string
  title_fr: string
  year: number
  director: string | null
  cast_list: string[]
  poster_path: string | null
  poster_url: string
  genres: string[]
  overview: string
  overview_fr: string
}

interface PlayerScore {
  id: string
  name: string
  total_score: number
}

interface Props {
  gameId: string
  playerId: string
  gameMode: 'solo' | 'multiplayer'
}

const BEST_KEY = 'wic_hol_best'

// Phases : amorçage → jeu → révélation (compteur) → transition (glissement) →
// game over (ou victoire si la chaîne s'épuise vraiment).
type Phase = 'loading' | 'playing' | 'revealing' | 'sliding' | 'gameover' | 'victory'
// Valeur envoyée au serveur (droite ≥ gauche ?). Côté UI, le joueur clique sur la
// card qu'il pense la plus chère : gauche → 'lower', droite → 'higher'.
type Guess = 'higher' | 'lower'
type Side = 'left' | 'right'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export default function HigherLowerChain({ gameId, playerId, gameMode }: Props) {
  const router = useRouter()
  const { t, locale } = useTranslation()

  const [phase, setPhase] = useState<Phase>('loading')
  const [movies, setMovies] = useState<ChainMovie[]>([])
  // Index du film de référence (gauche). On compare movies[position] (visible) à
  // movies[position + 1] (caché). position = nombre de bonnes réponses = score.
  const [position, setPosition] = useState(0)
  const [refBudget, setRefBudget] = useState<number | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hover, setHover] = useState<Side | null>(null)
  const [actorPhotos, setActorPhotos] = useState<Record<string, string | null>>({})
  const [best, setBest] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [players, setPlayers] = useState<PlayerScore[]>([])
  const [loadError, setLoadError] = useState(false)
  // Cette partie est-elle le Défi du jour de ce navigateur ? (lu au montage)
  const [isDaily, setIsDaily] = useState(false)
  useEffect(() => { setIsDaily(isDailyGame(gameId)) }, [gameId])

  // Défi du jour : fige le résultat (un seul essai/jour) dès le game over.
  useEffect(() => {
    if (isDaily && (phase === 'gameover' || phase === 'victory')) {
      recordDailyScore(gameId, position)
    }
  }, [isDaily, phase, gameId, position])

  // Partage : modal d'aperçu de la scorecard + toast éphémère
  const [shareOpen, setShareOpen] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const scoreCardRef = useRef<HTMLDivElement>(null)

  // Résultat du maillon en cours de révélation (compteur animé + game over).
  const [reveal, setReveal] = useState<{ correct: boolean; revealedBudget: number; leftBudget: number; choice: Guess } | null>(null)
  const [displayBudget, setDisplayBudget] = useState(0) // valeur animée du compteur

  // Refs anti-course / closures fraîches
  const submittingRef = useRef(false)
  const extendingRef = useRef(false)
  const exhaustedRef = useRef(false)
  const positionRef = useRef(0)
  const moviesLenRef = useRef(0)
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { moviesLenRef.current = movies.length }, [movies.length])

  const ref = movies[position]
  const challenger = movies[position + 1]

  // ─── Amorçage : charge la chaîne (sans budgets) + position + budget de la réf ──
  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}?player_id=${playerId}`)
      if (!res.ok) { setLoadError(true); return }
      const data = await res.json()
      const list: ChainMovie[] = Array.isArray(data.movies) ? data.movies : []
      if (!list.length) { setLoadError(true); return }
      setMovies(list)
      recordWatchedMovieIds(list.map((m) => m.id))
      const pos = typeof data.hol_position === 'number' ? data.hol_position : 0
      setPosition(pos)
      setRefBudget(typeof data.reference_budget === 'number' ? data.reference_budget : null)
      setTimerSeconds(data.game?.timer_seconds ?? 0)
      setPhase('playing')
    } catch (e) {
      console.error('[WIC] HoL bootstrap', e)
      setLoadError(true)
    }
  }, [gameId, playerId])

  useEffect(() => {
    bootstrap()
    try {
      const raw = localStorage.getItem(BEST_KEY)
      if (raw) setBest(Number(raw) || 0)
    } catch { /* ignore */ }
  }, [bootstrap])

  // ─── Photos d'acteurs (réutilise /api/actors) pour les deux cartes affichées ──
  const castKey = `${ref?.id ?? ''}-${challenger?.id ?? ''}`
  useEffect(() => {
    const names = [...(ref?.cast_list ?? []), ...(challenger?.cast_list ?? [])]
    if (names.length === 0) return
    let cancelled = false
    fetch('/api/actors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setActorPhotos((prev) => ({ ...prev, ...(d.photos ?? {}) })) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castKey])

  // ─── Extension à la volée : prolonge la chaîne quand on approche de la fin ─────
  const ensureLookahead = useCallback(async () => {
    if (extendingRef.current || exhaustedRef.current) return
    if (moviesLenRef.current - (positionRef.current + 1) > HOL_LOOKAHEAD) return
    extendingRef.current = true
    try {
      const res = await fetch(`/api/games/${gameId}/extend-chain`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data?.exhausted) { exhaustedRef.current = true; return }
      // Re-GET : le serveur est la source de vérité (gère aussi l'extension par un
      // autre joueur en multi). On ne touche ni à la position ni au budget courant.
      const g = await fetch(`/api/games/${gameId}?player_id=${playerId}`)
      if (g.ok) {
        const gd = await g.json()
        if (Array.isArray(gd.movies) && gd.movies.length) setMovies(gd.movies)
      }
    } catch (e) {
      console.error('[WIC] HoL extend', e)
    } finally {
      extendingRef.current = false
    }
  }, [gameId, playerId])

  // ─── Compteur animé (budget caché qui monte) ─────────────────────────────────
  const animateCount = useCallback((target: number) => {
    const duration = 850
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setDisplayBudget(Math.round(target * eased))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])

  // ─── Soumission d'un choix ────────────────────────────────────────────────────
  const submit = useCallback(async (choice: Guess) => {
    if (submittingRef.current || phase !== 'playing') return
    if (!challenger) return
    submittingRef.current = true
    const pos = position
    try {
      const res = await fetch(`/api/games/${gameId}/higher-or-lower-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, position: pos, guess: choice }),
      })
      const data = await res.json()
      if (data?.need_extend) {
        // Pool épuisé pile au mauvais moment : on prolonge puis on laisse rejouer.
        await ensureLookahead()
        submittingRef.current = false
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setReveal({ correct: data.correct, revealedBudget: data.revealed_budget, leftBudget: data.left_budget, choice })
      setDisplayBudget(0)
      setPhase('revealing')
      animateCount(data.revealed_budget)

      if (data.correct) {
        // Révélation (≈1s) → glissement → maillon suivant.
        setTimeout(() => {
          setPhase('sliding')
          setTimeout(() => {
            setRefBudget(data.revealed_budget)
            setPosition(pos + 1)
            setReveal(null)
            setHover(null)
            setPhase('playing')
            submittingRef.current = false
            ensureLookahead()
          }, 320)
        }, 1000)
      } else {
        // Mauvaise réponse → game over après la révélation.
        setTimeout(() => {
          const finalScore = pos
          setBest((prevBest) => {
            if (finalScore > prevBest) {
              setNewRecord(true)
              try { localStorage.setItem(BEST_KEY, String(finalScore)) } catch { /* ignore */ }
              return finalScore
            }
            return prevBest
          })
          setPhase('gameover')
          submittingRef.current = false
        }, 1100)
      }
    } catch (e) {
      console.error('[WIC] HoL submit', e)
      submittingRef.current = false
    }
  }, [phase, challenger, position, gameId, playerId, ensureLookahead, animateCount])

  // ─── Minuteur optionnel par maillon ───────────────────────────────────────────
  const submitRef = useRef(submit)
  useEffect(() => { submitRef.current = submit }, [submit])
  useEffect(() => {
    if (phase !== 'playing' || timerSeconds <= 0) { setTimeLeft(timerSeconds); return }
    const deadline = Date.now() + timerSeconds * 1000
    let fired = false
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0 && !fired) {
        fired = true
        clearInterval(id)
        submitRef.current('higher') // temps écoulé → choix par défaut
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [phase, position, timerSeconds])

  // ─── Multi : classement live (poll des scores) sur l'écran de game over ───────
  useEffect(() => {
    if (gameMode !== 'multiplayer') return
    if (phase !== 'gameover' && phase !== 'victory') return
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch(`/api/games/${gameId}`)
        if (!r.ok) return
        const d = await r.json()
        if (!cancelled && Array.isArray(d.players)) setPlayers(d.players)
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [gameMode, phase, gameId])

  // Victoire : la chaîne est réellement épuisée (extension impossible) et on a
  // atteint le dernier film.
  useEffect(() => {
    if (phase === 'playing' && !challenger && exhaustedRef.current) {
      setBest((prevBest) => {
        if (position > prevBest) {
          setNewRecord(true)
          try { localStorage.setItem(BEST_KEY, String(position)) } catch { /* ignore */ }
          return position
        }
        return prevBest
      })
      setPhase('victory')
    }
  }, [phase, challenger, position])

  // ─── Rejouer (solo) : relance /game avec les réglages mémorisés, mode HoL ─────
  const replaySolo = useCallback(() => {
    const params = new URLSearchParams({ gameMode: 'higher_or_lower' })
    try {
      const raw = localStorage.getItem('gameSettings')
      if (raw) {
        const s = JSON.parse(raw)
        if (s.timer != null) params.set('timer', String(s.timer))
        ;(Array.isArray(s.genres) ? s.genres : []).forEach((g: string) => params.append('genres', g))
        ;(Array.isArray(s.difficulties) ? s.difficulties : []).forEach((d: string) => params.append('difficulties', d))
      }
    } catch { /* ignore */ }
    router.push(`/game?${params.toString()}`)
  }, [router])

  // ─── Partage ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  // Adapte la scorecard 1200×630 à la largeur de l'écran/modal.
  useEffect(() => {
    if (!shareOpen) return
    const maxW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - 48, 560)
    setPreviewScale(Math.min(1, maxW / 1200))
  }, [shareOpen])

  const shareText = isDaily
    ? t.daily.shareChain.replace('{n}', String(position))
    : t.game.holShareText.replace('{n}', String(position))
  const link = shareUrl({ mode: 'chain', score: position })

  const doShareNative = useCallback(async () => {
    const node = scoreCardRef.current
    if (!node) return
    const blob = await captureCard(node)
    if (!blob) return
    const res = await shareImage(blob, { text: `${shareText} ${SITE_URL}`, fileName: 'whatitcost-chaine.png' })
    if (res === 'downloaded') showToast(t.game.imageDownloaded)
  }, [shareText, showToast, t])

  const doTwitter = useCallback(async () => {
    const node = scoreCardRef.current
    if (node) {
      const blob = await captureCard(node)
      if (blob) downloadBlob(blob, 'whatitcost-chaine.png')
    }
    window.open(tweetIntentUrl(shareText, link), '_blank', 'noopener,noreferrer')
    showToast(t.game.shareTweetHint)
  }, [shareText, link, showToast, t])

  const doCopyLink = useCallback(async () => {
    const ok = await copyText(link)
    if (ok) showToast(t.game.linkCopied)
  }, [link, showToast, t])

  // Les 2–3 derniers films de la chaîne (affiches sur la scorecard, via proxy).
  const lastPosters = movies
    .slice(Math.max(0, position - 2), position + 1)
    .filter((m) => m.poster_path)
    .slice(-3)

  // Modal d'aperçu + partage de la scorecard (1200×630, ratio Open Graph).
  const renderShareModal = () => (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', animation: 'wicFadeIn 0.2s ease-out' }}
      onClick={() => setShareOpen(false)}
    >
      <style>{`@keyframes wicFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div
        className="w-full flex flex-col items-center gap-4"
        style={{ maxWidth: '600px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Aperçu : carte 1200×630 mise à l'échelle ; html2canvas la capture en natif. */}
        <div style={{ width: 1200 * previewScale, height: 630 * previewScale, overflow: 'hidden' }}>
          <ShareScorecard
            ref={scoreCardRef}
            variant="chain"
            daily={isDaily}
            score={position}
            newRecord={newRecord}
            posters={lastPosters.map((m) => ({ id: m.id, title: m.title, posterPath: m.poster_path as string }))}
            previewScale={previewScale}
          />
        </div>

        {/* Boutons de partage */}
        <div className="flex flex-wrap justify-center gap-3 w-full">
          <button onClick={doShareNative} className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider" style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}>
            {t.game.shareNative}
          </button>
          <button onClick={doTwitter} className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
            {t.game.shareTwitter}
          </button>
          <button onClick={doCopyLink} className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
            {t.game.shareCopyLink}
          </button>
          <button onClick={() => setShareOpen(false)} className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
            {t.game.close}
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    if (loadError) {
      return (
        <AnimatedBackground className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center text-white" style={{ backgroundColor: '#111111' }}>
          <p className="text-sm" style={{ color: '#888', maxWidth: '340px' }}>{t.game.loadTimeout}</p>
          <button onClick={() => router.push('/')} className="min-h-[44px] px-6 py-3 font-bold text-sm text-white uppercase tracking-wider" style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}>
            {t.game.backHome}
          </button>
        </AnimatedBackground>
      )
    }
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm" style={{ backgroundColor: '#111111' }}>
        {t.common.loading}
      </div>
    )
  }

  // ── Game over / victoire ──
  if (phase === 'gameover' || phase === 'victory') {
    const finalScore = position
    const sorted = [...players].sort((a, b) => b.total_score - a.total_score)
    return (
      <AnimatedBackground className="min-h-screen flex items-center justify-center p-4 sm:p-6 text-white text-center" style={{ backgroundColor: '#15331F', transition: 'background-color 0.6s ease' }} symbolOpacity={0.14}>
        <div className="w-full flex flex-col items-center gap-5 mx-auto p-7 sm:px-12 sm:py-11" style={{ maxWidth: '560px', backgroundColor: '#161616', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}>
          <p className="uppercase" style={{ color: isDaily ? '#FF4D2E' : 'rgba(255,255,255,0.6)', fontSize: '0.7rem', letterSpacing: '0.25em' }}>
            {phase === 'victory' ? t.game.holVictory : isDaily ? t.daily.title : t.game.holGameOver}
          </p>

          <div className="flex flex-col items-center gap-1">
            <p className="font-bold" style={{ fontSize: 'clamp(3.5rem, 16vw, 6rem)', lineHeight: 1, color: '#48D982' }}>
              {finalScore}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              {finalScore === 1 ? t.game.holReachedChainOne : t.game.holReachedChain.replace('{n}', String(finalScore))}
            </p>
          </div>

          {newRecord ? (
            <p className="font-bold" style={{ color: '#FF4D2E', fontSize: '1.2rem' }}>🏆 {t.game.holNewRecord}</p>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.55)' }}>{t.game.holBest} : <span className="font-bold text-white">{best}</span></p>
          )}

          {/* Film qui a brisé la chaîne */}
          {phase === 'gameover' && reveal && challenger && (
            <div className="w-full flex items-center gap-3 p-3 text-left" style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px' }}>
              {challenger.poster_path && (
                <Image src={challenger.poster_url} alt={challenger.title} width={48} height={72} unoptimized className="rounded-md object-cover shrink-0" style={{ width: '48px', height: '72px' }} />
              )}
              <div className="min-w-0">
                <p className="text-xs" style={{ color: '#888' }}>{t.game.holChainBrokeOn}</p>
                <p className="font-semibold text-white truncate">{challenger.title}</p>
                <p className="text-sm font-bold" style={{ color: '#FF4D2E' }}>{formatBudget(reveal.revealedBudget)}</p>
              </div>
            </div>
          )}

          {/* Multi : classement live */}
          {gameMode === 'multiplayer' && sorted.length > 0 && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs uppercase" style={{ color: '#666', letterSpacing: '0.15em' }}>{t.game.holLeaderboard}</p>
              {sorted.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: p.id === playerId ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>#{i + 1}</span>
                    <span className="font-medium truncate">{p.name}{p.id === playerId && <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>({t.common.you})</span>}</span>
                  </div>
                  <span className="font-bold text-white shrink-0 ml-2">{p.total_score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Partage — levier de viralité, mis en avant */}
          <button
            onClick={() => setShareOpen(true)}
            className="w-full min-h-[48px] px-8 py-3 font-bold text-white uppercase tracking-wider mt-1"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '8px' }}
          >
            {t.game.share}
          </button>

          {/* Soumission au classement global (score lu côté serveur) */}
          <LeaderboardSubmit gameId={gameId} playerId={playerId} />

          {/* Défi du jour : un seul essai → pas de "Rejouer", compte à rebours
              vers le prochain défi + emplacement du classement du jour (étape 2) */}
          {isDaily && (
            <div className="w-full flex flex-col items-center gap-1.5">
              <DailyCountdown />
              <p className="text-xs" style={{ color: '#555555' }}>{t.daily.rankingSoon}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 w-full">
            {gameMode === 'solo' ? (
              !isDaily && (
              <button onClick={replaySolo} className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
                {t.game.playAgain}
              </button>
              )
            ) : (
              <button onClick={() => router.push('/lobby')} className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
                {t.game.playAgain}
              </button>
            )}
            <button onClick={() => router.push('/')} className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider" style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}>
              {t.game.backHome}
            </button>
          </div>
        </div>

        {shareOpen && renderShareModal()}
        {toast && (
          <div className="fixed left-1/2 -translate-x-1/2 z-[120] text-sm font-semibold" style={{ bottom: '88px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 18px' }}>
            {toast}
          </div>
        )}
      </AnimatedBackground>
    )
  }

  // ── Écran de jeu (chaîne) ──
  if (!ref || !challenger) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm" style={{ backgroundColor: '#111111' }}>{t.common.loading}</div>
  }

  const sliding = phase === 'sliding'
  const revealing = phase === 'revealing'
  const canClick = phase === 'playing' && !submittingRef.current

  const renderCard = (movie: ChainMovie, side: 'ref' | 'challenger') => {
    const cardOverview = locale === 'fr' ? movie.overview_fr || movie.overview : movie.overview || movie.overview_fr
    const isChallenger = side === 'challenger'
    // Clic sur la card la plus chère : gauche (réf) = pari "gauche > droite" → 'lower' ;
    // droite (challenger) = pari "droite > gauche" → 'higher'.
    const thisSide: Side = isChallenger ? 'right' : 'left'
    const myGuess: Guess = isChallenger ? 'higher' : 'lower'
    const lifted = hover === thisSide && canClick
    const choose = () => { if (canClick) submit(myGuess) }
    return (
      <div
        className="relative flex-1 min-w-0 flex flex-col items-center gap-2 p-4"
        role={canClick ? 'button' : undefined}
        tabIndex={canClick ? 0 : -1}
        aria-label={movie.title}
        onClick={canClick ? choose : undefined}
        onMouseEnter={canClick ? () => setHover(thisSide) : undefined}
        onMouseLeave={canClick ? () => setHover(null) : undefined}
        onKeyDown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose() } } : undefined}
        style={{
          backgroundColor: lifted ? 'rgba(255,77,46,0.12)' : 'rgba(15,15,15,0.85)',
          border: lifted ? '2px solid #FF4D2E' : '2px solid #222',
          borderRadius: '16px',
          cursor: canClick ? 'pointer' : 'default',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
          transform: lifted ? 'scale(1.03) translateY(-4px)' : 'none',
          boxShadow: lifted ? '0 16px 40px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {movie.poster_path && (
          <Image src={movie.poster_url} alt={movie.title} width={300} height={450} unoptimized className="object-cover w-auto rounded-xl" style={{ maxHeight: '24vh' }} />
        )}
        <h2 className="font-bold text-white text-center leading-tight" style={{ fontSize: 'clamp(1rem, 3.5vw, 1.4rem)' }}>{movie.title}</h2>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {[String(movie.year), ...movie.genres.slice(0, 2)].map((tag, i) => (
            <span key={i} className="text-xs px-2.5 py-0.5 text-white" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '100px' }}>{tag}</span>
          ))}
        </div>
        {movie.director && (
          <p className="text-xs text-center leading-tight">
            <span style={{ color: '#666' }}>{t.game.director} </span>
            <span className="text-white font-semibold">{movie.director}</span>
          </p>
        )}
        {movie.cast_list.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2.5 max-w-full">
            {movie.cast_list.slice(0, 4).map((name, i) => {
              const profile = actorPhotos[name]
              return (
                <div key={i} className="flex flex-col items-center gap-1 shrink-0" style={{ width: '48px' }}>
                  {profile ? (
                    <Image src={`https://image.tmdb.org/t/p/w185${profile}`} alt={name} width={40} height={40} unoptimized style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="flex items-center justify-center text-[0.6rem] font-bold text-white/70" style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#2a2a2a' }}>{initials(name)}</div>
                  )}
                  <span className="text-center text-white/60 leading-tight" style={{ fontSize: '0.6rem' }} title={name}>{shortName(name)}</span>
                </div>
              )
            })}
          </div>
        )}
        {cardOverview && (
          <p className="text-xs leading-relaxed text-center" style={{ color: '#888', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cardOverview}</p>
        )}

        <div className="flex-1" />

        {/* Budget */}
        {isChallenger ? (
          <p className="font-bold mt-1" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', color: reveal ? (reveal.correct ? '#48D982' : '#FF5C5C') : '#666' }}>
            {reveal ? formatBudget(displayBudget) : '???'}
          </p>
        ) : (
          <p className="font-bold mt-1" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', color: '#FF4D2E' }}>
            {refBudget != null ? formatBudget(refBudget) : '—'}
          </p>
        )}

        {/* Badge correct/raté pendant la révélation */}
        {isChallenger && revealing && reveal && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full font-bold text-sm" style={{ backgroundColor: reveal.correct ? '#48D982' : '#FF5C5C', color: '#111' }}>
            {reveal.correct ? '✓' : '✗'}
          </div>
        )}
      </div>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen text-white">
      <style>{`
        @keyframes wicChainIn { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="flex flex-col min-h-screen">
        <nav className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center text-[0.7rem] sm:text-xs uppercase tracking-widest text-white/70 pl-16 pr-16 pt-6 pb-3 sm:pl-20 sm:pr-24 sm:pt-7">
          <span>{t.game.holStreak} {position}</span>
          {phase === 'playing' && timerSeconds > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <svg width="48" height="48" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#333" strokeWidth="4" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#FF4D2E" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - (timerSeconds ? timeLeft / timerSeconds : 0))}
                  transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
                <text x="28" y="28" textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="bold" fontSize="18">{timeLeft}</text>
              </svg>
            </div>
          )}
          <span>{t.game.holBest} {best}</span>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 pt-20 pb-6 w-full max-w-4xl mx-auto">
          <p className="text-sm text-center" style={{ color: '#888' }}>{t.game.holTapHint}</p>

          <div
            className="w-full flex flex-col md:flex-row items-stretch gap-3 md:gap-4"
            style={{
              transition: 'transform 0.32s ease, opacity 0.32s ease',
              transform: sliding ? 'translateX(-32px)' : 'none',
              opacity: sliding ? 0 : 1,
            }}
          >
            {renderCard(ref, 'ref')}
            <div className="flex items-center justify-center font-bold" style={{ color: '#FF4D2E', fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>VS</div>
            {/* key = id du challenger → animation d'entrée à chaque nouveau maillon */}
            <div key={challenger.id} className="flex-1 min-w-0 flex" style={{ animation: 'wicChainIn 0.35s ease-out' }}>
              {renderCard(challenger, 'challenger')}
            </div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  )
}
