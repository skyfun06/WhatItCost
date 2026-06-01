import type { Database } from '@/lib/supabase/database.types'

// ─── Alias pratiques des lignes de table ──────────────────────────────────────
export type Movie          = Database['public']['Tables']['movies']['Row']
export type Game           = Database['public']['Tables']['games']['Row']
export type Player         = Database['public']['Tables']['players']['Row']
export type Round          = Database['public']['Tables']['rounds']['Row']
export type LeaderboardEntry = Database['public']['Tables']['leaderboard']['Row']

// ─── Types composés pour l'UI ─────────────────────────────────────────────────

/** Partie avec ses joueurs déjà joints (utilisé dans le lobby et les résultats) */
export interface GameWithPlayers extends Game {
  players: Player[]
}

/** Résultat d'un round après révélation */
export interface RoundResult {
  movie: Movie
  roundNumber: number
  guess: number    // Estimation du joueur
  actual: number   // Budget réel
  score: number    // 0–5000
  accuracy: number // 0–100 %
}

/** Résultat complet d'une partie */
export interface GameResult {
  game: Game
  player: Player
  rounds: RoundResult[]
  totalScore: number
}
