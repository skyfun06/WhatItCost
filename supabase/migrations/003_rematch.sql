-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Migration 003 : revanche multijoueur ("Rejouer ensemble")
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Paramètres de partie persistés (pour les rejouer à l'identique lors d'une revanche)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS genre TEXT NOT NULL DEFAULT 'all';

-- Lien vers la partie de revanche : quand il est posé, tous les clients encore
-- sur l'écran final détectent le changement (Realtime games UPDATE / polling) et
-- sont redirigés vers le nouveau lobby.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS rematch_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL;

-- Permet à chaque joueur de retrouver son nouveau player_id dans la partie de
-- revanche à partir de son ancien id (les joueurs sont recopiés à l'identique).
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS source_player_id UUID;

CREATE INDEX IF NOT EXISTS idx_players_source ON public.players (source_player_id);
