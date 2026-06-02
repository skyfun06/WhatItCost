/**
 * Types TypeScript générés manuellement depuis le schéma SQL.
 * En production, ces types peuvent être auto-générés via :
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * Chaque Row/Insert/Update inclut [key: string]: unknown pour satisfaire
 * GenericTable de @supabase/postgrest-js. Les propriétés nommées restent
 * strictement typées — l'index signature n'affecte que les clés inconnues.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {

      // ── movies ────────────────────────────────────────────────────────────────
      movies: {
        Row: {
          id: number
          title: string
          title_fr: string | null
          year: number
          director: string | null
          cast_list: Json
          poster_path: string | null
          budget: number
          genres: Json
          overview: string | null
          overview_fr: string | null
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id: number
          title: string
          title_fr?: string | null
          year: number
          director?: string | null
          cast_list?: Json
          poster_path?: string | null
          budget: number
          genres?: Json
          overview?: string | null
          overview_fr?: string | null
          created_at?: string
          [key: string]: unknown
        }
        Update: {
          id?: number
          title?: string
          title_fr?: string | null
          year?: number
          director?: string | null
          cast_list?: Json
          poster_path?: string | null
          budget?: number
          genres?: Json
          overview?: string | null
          overview_fr?: string | null
          created_at?: string
          [key: string]: unknown
        }
        Relationships: []
      }

      // ── games ─────────────────────────────────────────────────────────────────
      games: {
        Row: {
          id: string
          code: string
          mode: 'solo' | 'multiplayer'
          status: 'waiting' | 'playing' | 'finished'
          movie_ids: number[]
          current_round: number
          timer_seconds: number
          difficulty: string
          genre: string
          game_settings: Json
          rematch_game_id: string | null
          round_started_at: string | null
          locale: 'fr' | 'en'
          created_at: string
          finished_at: string | null
          [key: string]: unknown
        }
        Insert: {
          id?: string
          code?: string
          mode: 'solo' | 'multiplayer'
          status?: 'waiting' | 'playing' | 'finished'
          movie_ids: number[]
          current_round?: number
          timer_seconds?: number
          difficulty?: string
          genre?: string
          game_settings?: Json
          rematch_game_id?: string | null
          round_started_at?: string | null
          locale?: 'fr' | 'en'
          created_at?: string
          finished_at?: string | null
          [key: string]: unknown
        }
        Update: {
          id?: string
          code?: string
          mode?: 'solo' | 'multiplayer'
          status?: 'waiting' | 'playing' | 'finished'
          movie_ids?: number[]
          current_round?: number
          timer_seconds?: number
          difficulty?: string
          genre?: string
          game_settings?: Json
          rematch_game_id?: string | null
          round_started_at?: string | null
          locale?: 'fr' | 'en'
          created_at?: string
          finished_at?: string | null
          [key: string]: unknown
        }
        Relationships: []
      }

      // ── players ───────────────────────────────────────────────────────────────
      players: {
        Row: {
          id: string
          game_id: string
          name: string
          is_host: boolean
          total_score: number
          source_player_id: string | null
          joined_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          is_host?: boolean
          total_score?: number
          source_player_id?: string | null
          joined_at?: string
          [key: string]: unknown
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          is_host?: boolean
          total_score?: number
          source_player_id?: string | null
          joined_at?: string
          [key: string]: unknown
        }
        Relationships: []
      }

      // ── rounds ────────────────────────────────────────────────────────────────
      rounds: {
        Row: {
          id: string
          game_id: string
          player_id: string
          movie_id: number
          round_number: number
          guess_amount: number
          score: number
          answered_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          movie_id: number
          round_number: number
          guess_amount: number
          score?: number
          answered_at?: string
          [key: string]: unknown
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          movie_id?: number
          round_number?: number
          guess_amount?: number
          score?: number
          answered_at?: string
          [key: string]: unknown
        }
        Relationships: []
      }

      // ── leaderboard ───────────────────────────────────────────────────────────
      leaderboard: {
        Row: {
          id: string
          player_name: string
          score: number
          game_id: string | null
          mode: 'solo' | 'multiplayer'
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          player_name: string
          score: number
          game_id?: string | null
          mode: 'solo' | 'multiplayer'
          created_at?: string
          [key: string]: unknown
        }
        Update: {
          id?: string
          player_name?: string
          score?: number
          game_id?: string | null
          mode?: 'solo' | 'multiplayer'
          created_at?: string
          [key: string]: unknown
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_game_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
