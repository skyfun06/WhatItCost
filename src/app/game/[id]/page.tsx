'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatBudget, formatScore } from '@/lib/utils/format'
import AnimatedBackground from '@/components/AnimatedBackground'
import HigherLowerChain from '@/components/HigherLowerChain'
import { useTranslation } from '@/hooks/useTranslation'
import { recordWatchedMovieIds } from '@/lib/watchedMovies'
import { captureCard, shareImage, downloadBlob, tweetIntentUrl, copyText, shareUrl, SITE_URL } from '@/lib/share'
import { type Translations } from '@/i18n'

interface GameMovie {
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
  // Présent uniquement pour les films "gauche" en Higher or Lower (budget révélé)
  budget?: number | null
}

interface RoundResult {
  score: number
  actual_budget: number
  accuracy: number
  guess: number
}

interface PlayerScore {
  id: string
  name: string
  total_score: number
  is_host: boolean
}

type Phase = 'loading' | 'guessing' | 'revealing' | 'waiting_others' | 'finished'

// ─── Game config ──────────────────────────────────────────────────────────────
// Le nombre de rounds = nombre de films (movies.length) et la durée du minuteur
// (timer_seconds) proviennent désormais des paramètres de partie. Valeurs de
// repli si rien n'est défini.
const DEFAULT_ROUND_COUNT = 5
const DEFAULT_TIMER_SECONDS = 30

// Nombre de rounds depuis le nombre de films (Higher or Lower = 2 films/round)
function roundsFromMovies(movieCount: number, mode: string): number {
  if (movieCount <= 0) return DEFAULT_ROUND_COUNT
  return mode === 'higher_or_lower' ? Math.floor(movieCount / 2) : movieCount
}

function scoreLabel(score: number, g: Translations['game']): string {
  if (score >= 4500) return g.scoreLabels.perfect
  if (score >= 3500) return g.scoreLabels.great
  if (score >= 2500) return g.scoreLabels.good
  if (score >= 1000) return g.scoreLabels.close
  return g.scoreLabels.miss
}

// Final-screen background tint + verdict, by score percentage (0–100).
// Muted, dark tones — recognizable hue without being flashy.
function finalBgColor(pct: number): string {
  if (pct < 20) return '#3E1616'
  if (pct < 40) return '#3E2816'
  if (pct < 60) return '#383116'
  if (pct < 80) return '#1B3315'
  return '#15331F'
}

function performanceLabel(pct: number, g: Translations['game']): string {
  if (pct < 20) return g.verdicts.terrible
  if (pct < 40) return g.verdicts.poor
  if (pct < 60) return g.verdicts.ok
  if (pct < 80) return g.verdicts.good
  return g.verdicts.great
}

// Vivid score text color by performance percentage (red → green)
function scoreTextColor(pct: number): string {
  if (pct < 20) return '#FF5C5C'
  if (pct < 40) return '#FF9F4D'
  if (pct < 60) return '#FFD24D'
  if (pct < 80) return '#8FD957'
  return '#48D982'
}

// ─── Logarithmic budget slider helpers ($1,000 → $500,000,000) ────────────────
const MIN_DOLLARS = 1_000
const MAX_DOLLARS = 500_000_000
const MIN_LOG = Math.log10(MIN_DOLLARS) // 3
const MAX_LOG = Math.log10(MAX_DOLLARS) // ~8.699
const SLIDER_MAX = 1000

function posToDollars(pos: number): number {
  const logv = MIN_LOG + (pos / SLIDER_MAX) * (MAX_LOG - MIN_LOG)
  return Math.pow(10, logv)
}

function dollarsToPos(d: number): number {
  return Math.round(((Math.log10(d) - MIN_LOG) / (MAX_LOG - MIN_LOG)) * SLIDER_MAX)
}

// Round to a clean, human-readable figure for the live display
function niceRound(d: number): number {
  if (d >= 100_000_000) return Math.round(d / 10_000_000) * 10_000_000
  if (d >= 10_000_000) return Math.round(d / 1_000_000) * 1_000_000
  if (d >= 1_000_000) return Math.round(d / 100_000) * 100_000
  if (d >= 100_000) return Math.round(d / 10_000) * 10_000
  if (d >= 10_000) return Math.round(d / 1_000) * 1_000
  return Math.round(d / 100) * 100
}

function budgetZone(d: number, g: Translations['game']): { label: string; color: string } {
  if (d < 5_000_000) return { label: g.zones.indie, color: '#3ddc84' }
  if (d < 50_000_000) return { label: g.zones.mid, color: '#ffd166' }
  if (d < 150_000_000) return { label: g.zones.major, color: '#ff8c42' }
  return { label: g.zones.blockbuster, color: '#FF4D2E' }
}

// Écart en % entre l'estimation et le budget réel
function gapPercent(r: { guess: number; actual_budget: number }): number {
  if (!r.actual_budget) return 0
  return Math.round((Math.abs(r.guess - r.actual_budget) / r.actual_budget) * 100)
}

const DEFAULT_POS = dollarsToPos(10_000_000) // start around $10M

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

// "John Travolta" → "John T." — full first name + last-name initial
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const { t, locale } = useTranslation()
  const gameId = params.id as string

  const [phase, setPhase] = useState<Phase>('loading')
  const [movies, setMovies] = useState<GameMovie[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [gameMode, setGameMode] = useState<'solo' | 'multiplayer'>('solo')
  const [currentRound, setCurrentRound] = useState(1)
  const [guessMillions, setGuessMillions] = useState('')
  const [sliderPos, setSliderPos] = useState(DEFAULT_POS)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayerScore[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actorPhotos, setActorPhotos] = useState<Record<string, string | null>>({})
  // Durée du minuteur par round (0 = ∞, pas de compte à rebours).
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER_SECONDS)
  // Instant de début du round courant, partagé par tous les joueurs (multi).
  // Sert de référence commune au minuteur. NULL en solo (compteur local).
  const [roundStartedAt, setRoundStartedAt] = useState<string | null>(null)
  // Multi : score de chaque joueur pour le round qu'on révèle (comparaison dans la popup).
  const [roundScores, setRoundScores] = useState<{ id: string; name: string; score: number }[]>([])
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [isHost, setIsHost] = useState(false)
  // Échappatoire hôte : si l'attente s'éternise (joueur parti, minuteur ∞),
  // l'hôte peut forcer le round suivant pour ne jamais rester bloqué.
  const [showForceAdvance, setShowForceAdvance] = useState(false)
  // Indice (tous joueurs) après une longue attente : suggère de rafraîchir.
  const [showStuckHint, setShowStuckHint] = useState(false)
  // Toast éphémère (ex : "Image copiée !") sur l'écran final
  const [toast, setToast] = useState<string | null>(null)
  // Modal d'aperçu de la carte-score + facteur d'échelle de l'aperçu
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  // Carte-score (rendue dans le modal) capturée par html2canvas
  const scoreCardRef = useRef<HTMLDivElement>(null)
  // Échec de chargement (timeout 8s) → écran d'erreur avec retour au lobby
  const [loadError, setLoadError] = useState(false)
  // Mode de jeu : 'budget_guess' (slider) ou 'higher_or_lower' (comparaison)
  const [gameModeType, setGameModeType] = useState<'budget_guess' | 'higher_or_lower'>('budget_guess')
  const gameModeTypeRef = useRef<'budget_guess' | 'higher_or_lower'>('budget_guess')
  // Note : le mode Higher or Lower (chaîne) est entièrement géré par le composant
  // <HigherLowerChain> ; ce qui suit ne concerne plus que Budget Guess.

  // Refs to avoid stale closures in Realtime callbacks
  const currentRoundRef = useRef(1)
  const phaseRef = useRef<Phase>('loading')
  // Nombre de rounds = nombre de films chargés (lu dans les callbacks).
  const roundCountRef = useRef(DEFAULT_ROUND_COUNT)
  // Synchronous guard against double-submit (state updates are async, so the
  // `submitting` state alone can't block a fast double-click or timer+click race)
  const submittingRef = useRef(false)
  // playerId lu dans les callbacks Realtime/poll sans dépendance (évite les stale closures)
  const playerIdRef = useRef<string | null>(null)
  // Garde anti double-avance côté hôte (le PATCH advance n'est pas atomique)
  const advancingRef = useRef(false)
  // Garde anti double-redirection vers la partie de revanche
  const rematchRedirectingRef = useRef(false)
  useEffect(() => { currentRoundRef.current = currentRound }, [currentRound])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { playerIdRef.current = playerId }, [playerId])
  useEffect(() => { gameModeTypeRef.current = gameModeType }, [gameModeType])

  // Revanche : bascule ce joueur vers le nouveau lobby. Retrouve son nouveau
  // player_id via source_player_id, récupère films + timer, puis redirige.
  const goToRematch = useCallback(async (newGameId: string) => {
    if (rematchRedirectingRef.current) return
    rematchRedirectingRef.current = true
    console.log(`[WIC] rematch: bascule vers /lobby/${newGameId}`)
    try {
      const supabase = createClient() as any
      let newPlayerId: string | null = null
      let newIsHost = false
      if (playerIdRef.current) {
        const mine = await supabase
          .from('players')
          .select('id, is_host')
          .eq('game_id', newGameId)
          .eq('source_player_id', playerIdRef.current)
          .maybeSingle()
        if (mine.error) console.error('[WIC] rematch: lookup nouveau joueur', mine.error)
        newPlayerId = mine.data?.id ?? null
        newIsHost = mine.data?.is_host ?? false
      }

      const res = await fetch(`/api/games/${newGameId}`)
      const data = res.ok ? await res.json() : null

      if (data?.movies && newPlayerId) {
        localStorage.setItem('wic_game_id', newGameId)
        localStorage.setItem('wic_player_id', newPlayerId)
        localStorage.setItem('wic_movies', JSON.stringify(data.movies))
        localStorage.setItem('wic_timer', String(data.game?.timer_seconds ?? 30))
        localStorage.setItem('wic_game_mode', 'multiplayer')
        localStorage.setItem('wic_is_host', newIsHost ? 'true' : 'false')
        router.replace(`/lobby/${newGameId}`)
      } else {
        console.error('[WIC] rematch: données incomplètes → fallback /lobby', { hasMovies: !!data?.movies, newPlayerId })
        router.replace('/lobby')
      }
    } catch (e) {
      console.error('[WIC] goToRematch error', e)
      rematchRedirectingRef.current = false // autorise un nouvel essai
    }
  }, [router])

  // ── Réconciliation multijoueur ────────────────────────────────────────────
  // Source de vérité = l'état serveur. Appelée par les événements Realtime
  // (chemin rapide) ET par un polling de secours (filet anti-événement perdu).
  // Décide la phase à partir de : statut, current_round serveur, et nombre de
  // réponses pour le round courant. Idempotente.
  const reconcile = useCallback(async () => {
    try {
      console.log(`[WIC] reconcile: GET /api/games/${gameId} (phase=${phaseRef.current}, ref=${currentRoundRef.current})`)
      const res = await fetch(`/api/games/${gameId}`)
      if (!res.ok) {
        console.error(`[WIC] reconcile: GET /api/games/${gameId} → ${res.status}`)
        return
      }
      const data = await res.json()
      const game = data.game
      if (!game) {
        console.error('[WIC] reconcile: réponse sans game', data)
        return
      }

      // Revanche prioritaire (fonctionne même après "finished") : redirige tout
      // le monde vers le nouveau lobby dès que le lien est posé.
      if (game.rematch_game_id) {
        console.log(`[WIC] reconcile: rematch détecté → ${game.rematch_game_id}`)
        goToRematch(game.rematch_game_id)
        return
      }

      // Mode de jeu partagé via game_settings (multi). Films chargés depuis le
      // serveur s'ils ne sont pas encore en mémoire (multi : récupérés au start).
      const gm: 'budget_guess' | 'higher_or_lower' =
        (game.game_settings && (game.game_settings as { gameMode?: string }).gameMode) === 'higher_or_lower'
          ? 'higher_or_lower'
          : gameModeTypeRef.current
      if (gm !== gameModeTypeRef.current) {
        gameModeTypeRef.current = gm
        setGameModeType(gm)
      }
      if (Array.isArray(data.movies) && data.movies.length) {
        setMovies((prev) => (prev.length ? prev : (data.movies as GameMovie[])))
        roundCountRef.current = roundsFromMovies(data.movies.length, gm)
      }

      // Une fois la partie terminée, plus rien à réconcilier (hors revanche ci-dessus)
      if (phaseRef.current === 'finished') return

      console.log(`[WIC] reconcile: status=${game.status}, current_round=${game.current_round}, players=${data.players?.length ?? '?'}`)

      // Le minuteur est porté par la partie (défini par l'hôte)
      setTimerSeconds(game.timer_seconds ?? DEFAULT_TIMER_SECONDS)
      // Référence commune du minuteur (posée par /start et /advance côté serveur).
      setRoundStartedAt(game.round_started_at ?? null)

      // 1) Partie terminée → écran final avec scores serveur
      if (game.status === 'finished') {
        console.log('[WIC] reconcile: → finished')
        setAllPlayers(data.players ?? [])
        setPhase('finished')
        return
      }

      const serverRound: number = game.current_round ?? 1

      // 2) Round serveur en avance → nouveau round (rattrape un UPDATE manqué / refresh)
      if (serverRound > currentRoundRef.current) {
        console.log(`[WIC] reconcile: → guessing (advance to round ${serverRound})`)
        setCurrentRound(serverRound)
        setGuessMillions('')
        setRoundResult(null)
        setAlreadyAnswered(false)
        setPhase('guessing')
        return
      }

      // 3) Même round → décider guessing / waiting / reveal d'après les réponses
      const supabase = createClient() as any
      const [roundsRes, playersRes, mineRes] = await Promise.all([
        supabase.from('rounds').select('id', { count: 'exact', head: true })
          .eq('game_id', gameId).eq('round_number', serverRound),
        supabase.from('players').select('id', { count: 'exact', head: true })
          .eq('game_id', gameId),
        playerIdRef.current
          ? supabase.from('rounds').select('id', { count: 'exact', head: true })
              .eq('game_id', gameId).eq('round_number', serverRound).eq('player_id', playerIdRef.current)
          : Promise.resolve({ count: 0, error: null }),
      ])
      if (roundsRes.error) console.error('[WIC] reconcile: comptage rounds', roundsRes.error)
      if (playersRes.error) console.error('[WIC] reconcile: comptage players', playersRes.error)
      if (mineRes.error) console.error('[WIC] reconcile: comptage round perso', mineRes.error)

      const answered = roundsRes.count ?? 0
      const totalPlayers = playersRes.count ?? 0
      const iAnswered = (mineRes.count ?? 0) > 0
      console.log(`[WIC] reconcile: round ${serverRound} → answered=${answered}/${totalPlayers}, iAnswered=${iAnswered}`)

      if (totalPlayers > 0 && answered >= totalPlayers) {
        // Tout le monde a répondu (donc nous aussi) → révélation pour tous
        if (phaseRef.current !== 'revealing') {
          console.log('[WIC] reconcile: → revealing (all answered)')
          // Score de chaque joueur pour ce round → comparaison dans la popup.
          const scoresRes = await supabase
            .from('rounds')
            .select('player_id, score')
            .eq('game_id', gameId)
            .eq('round_number', serverRound)
          if (scoresRes.error) console.error('[WIC] reconcile: scores du round', scoresRes.error)
          const scoreByPlayer: Record<string, number> = Object.fromEntries(
            (scoresRes.data ?? []).map((r: { player_id: string; score: number }) => [r.player_id, r.score]),
          )
          setRoundScores(
            ((data.players ?? []) as PlayerScore[]).map((p) => ({
              id: p.id,
              name: p.name,
              score: scoreByPlayer[p.id] ?? 0,
            })),
          )
          setPhase('revealing')
        }
      } else if (iAnswered) {
        // On a déjà répondu, en attente des autres (gère aussi le retour après refresh)
        if (phaseRef.current === 'guessing' || phaseRef.current === 'loading') {
          console.log('[WIC] reconcile: → waiting_others (we answered)')
          setCurrentRound(serverRound)
          setPhase('waiting_others')
        }
      } else {
        // On n'a pas encore répondu ce round → écran de jeu.
        // CRITIQUE : couvre le démarrage de partie (round 1) où la phase est encore
        // 'loading' et serverRound == ref, donc le test (2) ne déclenche pas.
        if (phaseRef.current === 'loading') {
          console.log('[WIC] reconcile: → guessing (initial load, round ' + serverRound + ')')
          setCurrentRound(serverRound)
          setPhase('guessing')
        }
      }
    } catch (e) {
      console.error('[WIC] reconcile error', e)
    }
  }, [gameId, goToRematch])

  useEffect(() => {
    const storedGameId = localStorage.getItem('wic_game_id')
    const storedPlayerId = localStorage.getItem('wic_player_id')
    const storedMovies = localStorage.getItem('wic_movies')
    const storedMode = (localStorage.getItem('wic_game_mode') ?? 'solo') as 'solo' | 'multiplayer'

    console.log(`[WIC] game mount: gameId=${gameId}, storedGameId=${storedGameId}, hasPlayer=${!!storedPlayerId}, hasMovies=${!!storedMovies}, mode=${storedMode}`)

    // En multi, les films sont récupérés au démarrage et chargés depuis le serveur,
    // donc wic_movies peut être absent/vide ici. En solo on l'exige.
    const needsLocalMovies = storedMode !== 'multiplayer'
    if (storedGameId !== gameId || !storedPlayerId || (needsLocalMovies && !storedMovies)) {
      console.error('[WIC] game mount: localStorage manquant/incohérent → redirection /game')
      router.replace('/game')
      return
    }

    let parsedMovies: GameMovie[] = []
    try { parsedMovies = storedMovies ? JSON.parse(storedMovies) : [] } catch { parsedMovies = [] }
    const storedModeType =
      (localStorage.getItem('wic_game_mode_type') as 'budget_guess' | 'higher_or_lower') ?? 'budget_guess'
    console.log(`[WIC] game mount: ${parsedMovies.length} films chargés, mode=${storedModeType}, isHost=${localStorage.getItem('wic_is_host')}`)
    setPlayerId(storedPlayerId)
    setMovies(parsedMovies)
    setGameMode(storedMode)
    setGameModeType(storedModeType)
    gameModeTypeRef.current = storedModeType
    setIsHost(localStorage.getItem('wic_is_host') === 'true')
    // Le nombre de rounds dépend du mode (Higher or Lower = 2 films/round).
    roundCountRef.current = roundsFromMovies(parsedMovies.length, storedModeType)

    if (storedMode === 'multiplayer') {
      console.log('[WIC] game mount: multijoueur → détection du mode')
      // Filet anti-blocage : si toujours en "loading" après 8s, écran d'erreur.
      const loadTimer = setTimeout(() => {
        if (phaseRef.current === 'loading') {
          console.error('[WIC] game mount: timeout 8s, toujours en loading → écran d\'erreur')
          setLoadError(true)
        }
      }, 8000)

      let cancelled = false
      let teardown: (() => void) | null = null

      // On détecte d'abord le mode (game_settings). Higher or Lower → composant
      // chaîne autonome, AUCUNE machinerie round-based (reconcile/Realtime/poll).
      // Budget Guess → on installe la synchro round-based habituelle.
      fetch(`/api/games/${gameId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return
          const gm: 'budget_guess' | 'higher_or_lower' =
            (data.game?.game_settings as { gameMode?: string } | null)?.gameMode === 'higher_or_lower'
              ? 'higher_or_lower'
              : 'budget_guess'
          setGameModeType(gm)
          gameModeTypeRef.current = gm

          if (gm === 'higher_or_lower') {
            // Phase non-"loading" → le rendu bascule sur <HigherLowerChain>.
            setPhase('guessing')
            return
          }

          // ── Budget Guess : reconcile + Realtime + polling ──
          reconcile()
          const supabase = createClient()
          const channel = supabase
            .channel(`game-${gameId}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
              () => { reconcile() },
            )
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'rounds', filter: `game_id=eq.${gameId}` },
              () => { reconcile() },
            )
            .subscribe((status) => {
              if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error(`Realtime: canal game-${gameId} → ${status}`)
              }
            })
          const poll = setInterval(reconcile, 3000)
          teardown = () => {
            clearInterval(poll)
            supabase.removeChannel(channel)
          }
        })
        .catch((e) => console.error('[WIC] game mount: détection mode', e))

      return () => {
        cancelled = true
        clearTimeout(loadTimer)
        teardown?.()
      }
    } else {
      // Solo : le minuteur est stocké en localStorage à la création de la partie.
      const rawTimer = localStorage.getItem('wic_timer')
      const storedTimer = rawTimer !== null ? Number(rawTimer) : NaN
      setTimerSeconds(Number.isFinite(storedTimer) && storedTimer >= 0 ? storedTimer : DEFAULT_TIMER_SECONDS)
      setPhase('guessing')
    }
  }, [gameId, router, reconcile])

  // UI: when a new guessing round starts, reset the slider to its default and
  // seed guessMillions so the displayed amount is always coherent/submittable.
  useEffect(() => {
    if (phase === 'guessing') {
      setSliderPos(DEFAULT_POS)
      setGuessMillions((posToDollars(DEFAULT_POS) / 1_000_000).toString())
      setAlreadyAnswered(false)
      setRoundScores([]) // évite un flash des scores du round précédent
    }
  }, [phase, currentRound])

  // Mémorise les films de cette partie (solo : chargés au mount ; multi : via
  // reconcile) pour les exclure des prochains tirages → moins de répétitions.
  useEffect(() => {
    if (movies.length) recordWatchedMovieIds(movies.map((m) => m.id))
  }, [movies])

  const currentMovie = movies[currentRound - 1]
  const totalScore = scores.reduce((a, b) => a + b, 0)

  // Films affichés : en Higher or Lower, deux films par round (indices 2n / 2n+1).
  const holLeft = gameModeType === 'higher_or_lower' ? movies[(currentRound - 1) * 2] : undefined
  const holRight = gameModeType === 'higher_or_lower' ? movies[(currentRound - 1) * 2 + 1] : undefined

  // Acteurs à charger : les DEUX cartes en HoL, sinon le seul film courant.
  // (le film courant en HoL n'est pas une des cartes affichées → bug de photos)
  const castNames =
    gameModeType === 'higher_or_lower'
      ? [...(holLeft?.cast_list ?? []), ...(holRight?.cast_list ?? [])]
      : currentMovie?.cast_list ?? []
  const actorFetchKey =
    gameModeType === 'higher_or_lower'
      ? `${holLeft?.id ?? ''}-${holRight?.id ?? ''}`
      : String(currentMovie?.id ?? '')

  // Fetch real actor photos from TMDB (via server route) for the displayed movie(s)
  useEffect(() => {
    if (castNames.length === 0) return
    let cancelled = false
    setActorPhotos({}) // clear stale photos while the new ones load
    fetch('/api/actors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: castNames }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setActorPhotos(data.photos ?? {}) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorFetchKey])

  const handleSubmit = useCallback(async () => {
    // Synchronous re-entry guard: blocks a fast double-click / timer+click race
    // before the async `submitting` state has a chance to update.
    if (submittingRef.current || alreadyAnswered) return
    if (!playerId || !guessMillions) return
    const numVal = parseFloat(guessMillions)
    if (isNaN(numVal) || numVal <= 0) return
    const guessAmount = Math.round(numVal * 1_000_000)
    const submittedRound = currentRound

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/games/${gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, round_number: currentRound, guess_amount: guessAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      const result: RoundResult = {
        score: data.score,
        actual_budget: data.actual_budget,
        accuracy: data.accuracy,
        guess: data.guess_amount ?? guessAmount,
      }
      setRoundResult(result)
      setScores((prev) => [...prev, result.score])

      if (gameMode === 'multiplayer') {
        // Wait for the others; reveal happens once everyone has answered.
        // Reconcile immediately in case this player was the last to answer.
        setPhase('waiting_others')
        reconcile()
      } else {
        // Solo: stay on the reveal until the player clicks "Film suivant"
        setPhase('revealing')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur serveur'
      // Already answered → just lock the button, no scary red message.
      // Ignore a stale 409 that lands after we've already moved to a later round.
      if (msg === 'Round already answered') {
        if (currentRoundRef.current === submittedRound) setAlreadyAnswered(true)
      } else {
        setError(msg)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [playerId, guessMillions, alreadyAnswered, gameId, currentRound, gameMode, reconcile])

  // Slider interaction → keep guessMillions (consumed by handleSubmit) in sync
  const handleSliderChange = (pos: number) => {
    setSliderPos(pos)
    const dollars = niceRound(posToDollars(pos))
    setGuessMillions((dollars / 1_000_000).toString())
  }

  // Solo: player advances themselves
  const advanceSolo = useCallback(() => {
    if (currentRoundRef.current >= roundCountRef.current) {
      setPhase('finished')
      return
    }
    setCurrentRound((r) => r + 1)
    setRoundResult(null)
    setGuessMillions('')
    setPhase('guessing')
  }, [])

  // Multiplayer host: advances everyone (server bumps games.current_round / finishes).
  // All clients then converge via Realtime + le polling de réconciliation.
  const advanceHost = useCallback(async () => {
    if (!playerId || advancingRef.current) return // garde anti double-clic (PATCH non atomique)
    advancingRef.current = true
    try {
      const res = await fetch(`/api/games/${gameId}/advance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('advanceHost: échec advance', res.status, data.error)
      } else {
        // Réconcilie tout de suite côté hôte (ne dépend pas de son propre événement Realtime)
        reconcile()
      }
    } catch (e) {
      console.error('advanceHost error', e)
    } finally {
      // Libère la garde une fois qu'on a quitté l'écran de révélation
      setTimeout(() => { advancingRef.current = false }, 500)
    }
  }, [gameId, playerId, reconcile])

  // Revanche (écran final, multijoueur) : crée la nouvelle partie côté serveur
  // (idempotent — même si plusieurs joueurs cliquent) puis bascule ce joueur.
  // Les autres sont redirigés via la détection rematch de reconcile.
  const handleRematch = useCallback(async () => {
    if (rematchRedirectingRef.current) return
    try {
      console.log('[WIC] rematch: POST /rematch')
      const res = await fetch(`/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerIdRef.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.gameId) {
        console.error('[WIC] rematch: échec', res.status, data)
        return
      }
      goToRematch(data.gameId)
    } catch (e) {
      console.error('[WIC] handleRematch error', e)
    }
  }, [gameId, goToRematch])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  // Texte + lien de partage (Budget Guess) — lien porteur du score pour l'embed OG.
  const budgetShareText = t.game.shareText.replace('{score}', formatScore(totalScore))
  const budgetLink = shareUrl({ mode: 'budget', score: totalScore })

  // a) Partage natif (Web Share niveau fichier) → menu OS ; repli téléchargement.
  const doShareNative = useCallback(async () => {
    const node = scoreCardRef.current
    if (!node) return
    const blob = await captureCard(node)
    if (!blob) return
    const res = await shareImage(blob, { text: `${budgetShareText} ${SITE_URL}`, fileName: 'mon-score-whatitcost.png' })
    if (res === 'downloaded') showToast(t.game.imageDownloaded)
  }, [budgetShareText, showToast, t])

  // b) Twitter/X : télécharge l'image (l'intent ne la porte pas) + ouvre l'intent.
  const doTwitter = useCallback(async () => {
    const node = scoreCardRef.current
    if (node) {
      const blob = await captureCard(node)
      if (blob) downloadBlob(blob, 'mon-score-whatitcost.png')
    }
    window.open(tweetIntentUrl(budgetShareText, budgetLink), '_blank', 'noopener,noreferrer')
    showToast(t.game.shareTweetHint)
  }, [budgetShareText, budgetLink, showToast, t])

  // c) Copier le lien (porteur du score → embed Discord/Twitter personnalisé).
  const doCopyLink = useCallback(async () => {
    const ok = await copyText(budgetLink)
    if (ok) showToast(t.game.linkCopied)
  }, [budgetLink, showToast, t])

  // Soumission auto au timeout (Budget Guess)
  const autoSubmit = useCallback(() => {
    handleSubmit()
  }, [handleSubmit])

  // Always call the latest autoSubmit from the timer without re-arming it
  const handleSubmitRef = useRef(autoSubmit)
  useEffect(() => { handleSubmitRef.current = autoSubmit }, [autoSubmit])

  // Countdown timer: runs during 'guessing', resets each round, auto-submits at 0.
  // Leaving 'guessing' (incl. clicking VALIDER → phase changes) clears the interval.
  // timerSeconds === 0 → mode ∞ : aucun compte à rebours, aucune soumission auto.
  //
  // Échéance calculée à partir d'une référence COMMUNE (round_started_at) en multi :
  // tous les clients convergent vers le même temps restant, et un refresh ne remet
  // pas le compteur à fond. Solo / fallback : échéance locale (Date.now()).
  useEffect(() => {
    if (phase !== 'guessing') return
    if (timerSeconds <= 0) return

    const startMs =
      gameMode === 'multiplayer' && roundStartedAt ? new Date(roundStartedAt).getTime() : Date.now()
    const deadline = startMs + timerSeconds * 1000

    let id: ReturnType<typeof setInterval>
    let autoSubmitted = false
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0 && !autoSubmitted) {
        autoSubmitted = true
        clearInterval(id)
        handleSubmitRef.current() // auto-submit with the current slider value
      }
    }
    tick() // initialise immédiatement (évite un flash à timerSeconds avant le 1er intervalle)
    id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, currentRound, timerSeconds, gameMode, roundStartedAt])

  // Anti-blocage : l'hôte peut forcer l'avancement après 12s d'attente
  // (utile si un joueur a abandonné, surtout avec un minuteur ∞).
  useEffect(() => {
    if (phase !== 'waiting_others' || !isHost) {
      setShowForceAdvance(false)
      return
    }
    const id = setTimeout(() => setShowForceAdvance(true), 12000)
    return () => clearTimeout(id)
  }, [phase, isHost, currentRound])

  // Indice de connexion après 45s bloqué en attente (sans progression de round).
  useEffect(() => {
    if (phase !== 'waiting_others') {
      setShowStuckHint(false)
      return
    }
    const id = setTimeout(() => setShowStuckHint(true), 45000)
    return () => clearTimeout(id)
  }, [phase, currentRound])

  // Échelle de l'aperçu : ajuste la carte 800×450 à la largeur du modal/écran.
  useEffect(() => {
    if (!shareModalOpen) return
    const maxW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - 80, 520)
    setPreviewScale(Math.min(1, maxW / 800))
  }, [shareModalOpen])

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    if (loadError) {
      return (
        <AnimatedBackground
          className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center text-white"
          style={{ backgroundColor: '#111111' }}
        >
          <p className="text-sm" style={{ color: '#888', maxWidth: '340px' }}>{t.game.loadTimeout}</p>
          <button
            onClick={() => router.push('/lobby')}
            className="min-h-[44px] px-6 py-3 font-bold text-sm text-white uppercase tracking-wider"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {t.game.backToLobby}
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

  // ─── HIGHER OR LOWER (chaîne infinie) ───────────────────────────────────────
  // Composant autonome : sa propre machine à états (chaîne, révélation, game over)
  // et sa propre synchro multi (classement live). Court-circuite toute la logique
  // round-based ci-dessous, qui reste réservée au mode Budget Guess.
  if (gameModeType === 'higher_or_lower' && playerId) {
    return <HigherLowerChain gameId={gameId} playerId={playerId} gameMode={gameMode} />
  }

  // ─── Finished ─────────────────────────────────────────────────────────────

  if (phase === 'finished') {
    const sortedPlayers = [...allPlayers].sort((a, b) => b.total_score - a.total_score)
    const isSolo = gameMode === 'solo' || sortedPlayers.length === 0
    // Score max par round selon le mode (HoL = 1000, Budget Guess = 5000)
    const perRoundMax = gameModeType === 'higher_or_lower' ? 1000 : 5000
    const finishedRounds = roundsFromMovies(movies.length, gameModeType)
    const maxGameScore = finishedRounds * perRoundMax
    const pct = maxGameScore > 0 ? (totalScore / maxGameScore) * 100 : 0
    const bgColor = finalBgColor(pct)

    return (
      <AnimatedBackground
        className="min-h-screen flex items-center justify-center p-4 sm:p-6 text-white text-center"
        style={{ backgroundColor: bgColor, transition: 'background-color 0.8s ease' }}
        symbolOpacity={0.14}
      >
        {/* Everything in one centered card */}
        <div
          className="w-full flex flex-col items-center gap-5 mx-auto p-7 sm:px-12 sm:py-11"
          style={{
            maxWidth: '640px',
            backgroundColor: '#161616',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px',
          }}
        >
          {/* Label */}
          <p
            className="uppercase"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', letterSpacing: '0.25em' }}
          >
            {t.game.finalScore}
          </p>

          {/* Big score — colored by performance */}
          <div className="flex flex-col items-center gap-1">
            <p className="font-bold" style={{ fontSize: 'clamp(3rem, 14vw, 5rem)', lineHeight: 1, color: scoreTextColor(pct) }}>
              {formatScore(totalScore)}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)' }}>/ {formatScore(maxGameScore)} {t.game.points}</p>
          </div>

          {/* Performance verdict */}
          <p className="font-bold text-white" style={{ fontSize: 'clamp(1.1rem, 4.5vw, 1.3rem)' }}>
            {performanceLabel(pct, t.game)}
          </p>

          {/* Divider */}
          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.15)' }} />

          {/* Breakdown — one row per round, title left / points right, no wrap */}
          {isSolo ? (
            <div className="flex flex-col gap-2 text-sm w-full">
              {scores.map((s, i) => {
                const rowTitle = gameModeType === 'higher_or_lower'
                  ? movies[i * 2 + 1]?.title
                  : movies[i]?.title
                return (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-white truncate min-w-0">{rowTitle ?? `${t.game.round} ${i + 1}`}</span>
                  <span className="shrink-0 whitespace-nowrap">
                    <span className="font-semibold" style={{ color: scoreTextColor((s / perRoundMax) * 100) }}>
                      {formatScore(s)} {t.game.points}
                    </span>
                    {' '}
                    <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.5)' }}>({scoreLabel(s, t.game)})</span>
                  </span>
                </div>
                )
              })}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2">
              {sortedPlayers.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    border: p.id === playerId ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-5" style={{ color: 'rgba(255,255,255,0.6)' }}>#{i + 1}</span>
                    <span className="font-medium">{p.name}</span>
                    {p.id === playerId && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>({t.common.you})</span>}
                  </div>
                  <span className="font-bold text-white">{formatScore(p.total_score)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-2 w-full">
            {gameMode === 'multiplayer' ? (
              <button
                onClick={handleRematch}
                className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
              >
                {t.game.rematch}
              </button>
            ) : (
              <button
                onClick={() => router.push('/game')}
                className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
              >
                {t.game.playAgain}
              </button>
            )}
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider"
              style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
            >
              {t.game.share}
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 min-w-[140px] min-h-[44px] px-8 py-3 font-bold text-white uppercase tracking-wider"
              style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
            >
              {t.game.backHome}
            </button>
          </div>

          {/* Toast éphémère (fallback de partage : "Lien copié !") */}
          {toast && (
            <div
              className="fixed left-1/2 -translate-x-1/2 z-[120] text-sm font-semibold"
              style={{
                bottom: '88px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '10px 18px',
              }}
            >
              {toast}
            </div>
          )}
        </div>

        {/* ─── Modal d'aperçu + partage de la carte-score ─── */}
        {shareModalOpen && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', animation: 'wicFadeIn 0.2s ease-out' }}
            onClick={() => setShareModalOpen(false)}
          >
            <div
              className="w-full flex flex-col items-center gap-4"
              style={{
                maxWidth: '560px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '16px',
                padding: '20px',
                animation: 'wicPopIn 0.25s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Aperçu : la carte 800×450 est mise à l'échelle pour l'affichage,
                  mais html2canvas la capture à sa taille native (haute résolution). */}
              <div style={{ width: 800 * previewScale, height: 450 * previewScale, overflow: 'hidden' }}>
                <div
                  ref={scoreCardRef}
                  style={{
                    width: '800px',
                    height: '450px',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Motif $ ? statique en diagonale */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-20%',
                      transform: 'rotate(-20deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '38px',
                      pointerEvents: 'none',
                    }}
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          whiteSpace: 'nowrap',
                          fontSize: '46px',
                          fontWeight: 700,
                          letterSpacing: '46px',
                          color: '#ffffff',
                          opacity: 0.05,
                          lineHeight: 1,
                        }}
                      >
                        {i % 2 === 0 ? '$ ? $ ? $ ? $ ? $ ? $ ? $ ?' : '? $ ? $ ? $ ? $ ? $ ? $'}
                      </div>
                    ))}
                  </div>

                  {/* Contenu */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '30px 44px',
                    }}
                  >
                    <p style={{ color: '#FF4D2E', fontSize: '15px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' }}>
                      WHATITCOST.FR
                    </p>
                    <p style={{ fontSize: '5rem', fontWeight: 700, lineHeight: 1, marginTop: '8px' }}>
                      {formatScore(totalScore)}
                      <span style={{ fontSize: '2rem', marginLeft: '8px', color: 'rgba(255,255,255,0.7)' }}>PTS</span>
                    </p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>
                      {performanceLabel(pct, t.game)} 🎬
                    </p>
                    <div style={{ marginTop: '16px', width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {scores.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888888' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                            {(gameModeType === 'higher_or_lower' ? movies[i * 2 + 1]?.title : movies[i]?.title) ?? `${t.game.round} ${i + 1}`}
                          </span>
                          <span style={{ color: '#cccccc', fontWeight: 600, marginLeft: '12px', whiteSpace: 'nowrap' }}>
                            {formatScore(s)} {t.game.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bas : texte + barre d'accent corail */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    <p style={{ textAlign: 'center', fontSize: '14px', color: '#ffffff', marginBottom: '12px' }}>whatitcost.fr</p>
                    <div style={{ height: '8px', backgroundColor: '#FF4D2E' }} />
                  </div>
                </div>
              </div>

              {/* Actions de partage (Web Share natif / X / copier le lien) */}
              <div className="flex flex-wrap justify-center gap-3 w-full">
                <button
                  onClick={doShareNative}
                  className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                  style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
                >
                  {t.game.shareNative}
                </button>
                <button
                  onClick={doTwitter}
                  className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                  style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
                >
                  {t.game.shareTwitter}
                </button>
                <button
                  onClick={doCopyLink}
                  className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                  style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
                >
                  {t.game.shareCopyLink}
                </button>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="flex-1 min-w-[120px] min-h-[44px] px-5 py-3 font-bold text-sm text-white uppercase tracking-wider"
                  style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px' }}
                >
                  {t.game.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedBackground>
    )
  }

  // ─── Communs aux deux modes ─────────────────────────────────────────────────
  const roundCount = roundsFromMovies(movies.length, gameModeType)
  const isLastRound = currentRound >= roundCount
  const nextLabel = isLastRound
    ? `${t.game.seeResults} →`
    : gameMode === 'solo'
      ? `${t.game.nextMovie} →`
      : `${t.game.nextRound} →`

  // ─── Popup de révélation (unifiée : solo / multi, Budget Guess & Higher or Lower) ──
  // Affiche le résultat perso du round, puis — en multi — le score de chaque joueur
  // pour ce round (comparaison). Le bouton d'avancement dépend du rôle.
  const perRoundMaxForReveal = gameModeType === 'higher_or_lower' ? 1000 : 5000
  const revealModal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', animation: 'wicFadeIn 0.2s ease-out' }}
    >
      <div
        className="w-full flex flex-col text-center p-7 sm:p-9"
        style={{
          maxWidth: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '16px',
          animation: 'wicPopIn 0.25s ease-out',
        }}
      >
        {/* Résultat personnel du round (Budget Guess) */}
        {roundResult && (
          <>
            <p className="font-bold text-white" style={{ fontSize: '1.2rem' }}>{scoreLabel(roundResult.score, t.game)}</p>
            <p className="font-bold" style={{ color: '#FF4D2E', fontSize: 'clamp(2.2rem, 11vw, 3rem)', lineHeight: 1.1 }}>
              +{formatScore(roundResult.score)} {t.game.points}
            </p>
            <p className="text-white mt-4">
              {t.game.yourGuess} : <span className="font-semibold">{formatBudget(roundResult.guess)}</span>
            </p>
            <p className="mt-1 font-semibold" style={{ color: '#FF4D2E' }}>
              {t.game.actualBudget} : {formatBudget(roundResult.actual_budget)}
            </p>
            <p className="text-muted mt-1">
              {t.game.gap} : <span>{gapPercent(roundResult)}%</span>
            </p>
          </>
        )}

        {/* Multi : score de chaque joueur pour ce round (comparaison) */}
        {gameMode === 'multiplayer' && roundScores.length > 0 && (
          <>
            <p className="text-xs uppercase mt-5 mb-2" style={{ color: '#666', letterSpacing: '0.15em' }}>
              {t.game.roundScores}
            </p>
            <div className="flex flex-col gap-1.5">
              {[...roundScores]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      border: p.id === playerId ? '1px solid rgba(255,255,255,0.4)' : '1px solid #2a2a2a',
                    }}
                  >
                    <span className="text-sm text-white truncate min-w-0">
                      {p.name}
                      {p.id === playerId && (
                        <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>({t.common.you})</span>
                      )}
                    </span>
                    <span
                      className="text-sm font-semibold shrink-0 ml-2"
                      style={{ color: scoreTextColor((p.score / perRoundMaxForReveal) * 100) }}
                    >
                      {formatScore(p.score)}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid #333', margin: '24px 0 0' }} />

        {/* Avancement : solo → soi-même ; multi → hôte (les invités attendent) */}
        {gameMode === 'solo' ? (
          <button
            onClick={advanceSolo}
            className="mt-6 w-full py-3 font-bold text-white uppercase tracking-wider"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {nextLabel}
          </button>
        ) : isHost ? (
          <button
            onClick={advanceHost}
            className="mt-6 w-full py-3 font-bold text-white uppercase tracking-wider"
            style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
          >
            {nextLabel}
          </button>
        ) : (
          <p className="mt-6 text-xs text-muted">{t.game.waitingHost}</p>
        )}
      </div>
    </div>
  )

  // ─── BUDGET GUESS ───────────────────────────────────────────────────────────
  if (!currentMovie) return null

  const dollars = niceRound(posToDollars(sliderPos))
  const zone = budgetZone(dollars, t.game)
  // Synopsis dans la langue active (repli sur l'autre langue si vide)
  const overview =
    locale === 'fr'
      ? currentMovie.overview_fr || currentMovie.overview
      : currentMovie.overview || currentMovie.overview_fr
  const showSlider = phase === 'guessing'

  return (
    <AnimatedBackground className="min-h-screen md:h-screen md:overflow-hidden text-white">
      <style>{`
        .wic-slider { -webkit-appearance:none; appearance:none; width:100%; height:10px; border-radius:5px; outline:none; }
        .wic-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:50%; background:#fff; border:3px solid #FF4D2E; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.4); }
        .wic-slider::-moz-range-thumb { width:24px; height:24px; border-radius:50%; background:#fff; border:3px solid #FF4D2E; cursor:pointer; }
        @keyframes wicSpin { to { transform: rotate(360deg); } }
        @keyframes wicFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wicPopIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="flex flex-col min-h-screen md:h-screen">

        {/* ─── Full-width transparent navbar ──────────────────────────────
            pr élargi à droite pour ne pas passer sous le sélecteur de langue global. */}
        <nav
          className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center text-[0.7rem] sm:text-xs uppercase tracking-widest text-white/70 pl-16 pr-16 pt-6 pb-3 sm:pl-20 sm:pr-24 sm:pt-7"
        >
          <span>{t.game.round} {currentRound}/{roundCount}</span>

          {/* Circular countdown — only while guessing AND a timer is set (∞ → masqué) */}
          {showSlider && timerSeconds > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#333" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#FF4D2E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - timeLeft / timerSeconds)}
                  transform="rotate(-90 28 28)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <text
                  x="28"
                  y="28"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {timeLeft}
                </text>
              </svg>
            </div>
          )}

          <span>{formatScore(totalScore)} {t.game.points}</span>
        </nav>

        {/* ─── Split content ──────────────────────────────────────────────
            Mobile : pile verticale (poster → carte info → slider) via flex order.
            Desktop (md+) : deux colonnes (poster + slider à gauche, info à droite).
            Le wrapper passe en `display:contents` sur mobile pour que ses enfants
            participent au même contexte flex que la carte info (ordre global). */}
        <div className="flex flex-col md:flex-row flex-1 md:min-h-0 pt-16 sm:pt-20">

          <div className="contents md:flex md:w-[45%] md:flex-col md:items-center md:justify-center md:gap-5 md:p-6">
            {/* Poster — pleine largeur 35vh sur mobile, aspect naturel sur desktop */}
            {currentMovie.poster_path && (
              <div className="order-1 md:order-none w-full flex justify-center px-4 pt-1 md:p-0">
                <Image
                  src={currentMovie.poster_url}
                  alt={currentMovie.title}
                  width={400}
                  height={600}
                  className="object-cover w-full h-[35vh] rounded-xl md:w-auto md:h-auto md:max-h-[55vh]"
                  unoptimized
                  priority
                />
              </div>
            )}

            {/* Slider / result zone */}
            <div className="order-3 md:order-none w-full max-w-md mx-auto px-4 pb-6 md:p-0">
              {showSlider ? (
                <div className="flex flex-col gap-3">
                  <div className="text-center">
                    <p className="font-bold text-white" style={{ fontSize: 'clamp(1.4rem, 6vw, 1.8rem)' }}>
                      {formatBudget(dollars)}
                    </p>
                    <p className="font-semibold mt-1" style={{ color: zone.color }}>
                      {zone.label}
                    </p>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={SLIDER_MAX}
                    value={sliderPos}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="wic-slider"
                    style={{
                      background:
                        'linear-gradient(90deg, #3ddc84 0%, #ffd166 35%, #ff8c42 65%, #FF4D2E 100%)',
                    }}
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || alreadyAnswered}
                    className="w-full py-3 font-bold text-white uppercase tracking-wider disabled:opacity-40"
                    style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
                  >
                    {submitting ? '…' : t.game.submit}
                  </button>
                  {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </div>
              ) : phase === 'waiting_others' ? (
                <div
                  className="flex flex-col items-center gap-4 p-6 text-center"
                  style={{ backgroundColor: 'rgba(26,26,26,0.9)', borderRadius: '10px', border: '1px solid #222' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '3px solid #333',
                      borderTopColor: '#FF4D2E',
                      animation: 'wicSpin 0.8s linear infinite',
                    }}
                  />
                  <p className="text-sm text-muted">{t.game.waitingOthers}</p>
                  {/* Échappatoire hôte après une longue attente */}
                  {isHost && showForceAdvance && (
                    <button
                      onClick={advanceHost}
                      className="mt-2 w-full py-2.5 font-bold text-sm text-white uppercase tracking-wider"
                      style={{ border: '1px solid rgba(255,255,255,0.35)', borderRadius: '6px' }}
                    >
                      {t.game.forceNext} →
                    </button>
                  )}
                  {/* Indice de connexion après 45s d'attente */}
                  {showStuckHint && (
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: '#666' }}>
                      {t.game.stuckHint}
                    </p>
                  )}
                </div>
              ) : null /* révélation : popup unifiée en bas */}
            </div>
          </div>

          {/* RIGHT (55%) : centered info card */}
          <div className="order-2 md:order-none w-full md:w-[55%] flex items-center justify-center px-4 py-3 md:p-6 md:overflow-y-auto">
            <div
              className="w-full flex flex-col gap-4 sm:gap-5 p-5 sm:p-8"
              style={{
                maxWidth: '500px',
                backgroundColor: 'rgba(15,15,15,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid #222',
                borderRadius: '16px',
              }}
            >
              {/* Title */}
              <h1 className="font-bold text-white leading-tight" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.5rem)' }}>
                {currentMovie.title}
              </h1>

              {/* Year + genres pills */}
              <div className="flex flex-wrap gap-2">
                {[String(currentMovie.year), ...currentMovie.genres].map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 text-white"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '100px' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Director — clean label / value pair */}
              {currentMovie.director && (
                <div className="flex flex-col gap-0.5">
                  <span style={{ color: '#666', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                    {t.game.director}
                  </span>
                  <span className="text-white" style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {currentMovie.director}
                  </span>
                </div>
              )}

              {/* Cast — défile horizontalement sur mobile (pas de retour à la ligne) */}
              {currentMovie.cast_list.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {currentMovie.cast_list.map((name, i) => {
                    const profile = actorPhotos[name]
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: '64px' }}>
                        {profile ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${profile}`}
                            alt={name}
                            width={52}
                            height={52}
                            unoptimized
                            style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="flex items-center justify-center text-xs font-bold text-white/70"
                            style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#2a2a2a' }}
                          >
                            {initials(name)}
                          </div>
                        )}
                        <span
                          className="text-center text-white/70 leading-tight"
                          style={{ fontSize: '0.75rem' }}
                          title={name}
                        >
                          {shortName(name)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Overview — dans la langue active */}
              {overview && (
                <p
                  className="text-[0.9rem] leading-relaxed"
                  style={{
                    color: '#888',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {overview}
                </p>
              )}

              {/* Bottom label */}
              <div className="pt-2">
                <p className="font-bold text-white uppercase tracking-wide">{t.game.whatBudget}</p>
                <p className="text-xs text-muted mt-1">
                  {t.game.sliderHint}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Popup de score unifiée (solo & multi, Budget Guess) */}
      {phase === 'revealing' && revealModal}
    </AnimatedBackground>
  )
}
