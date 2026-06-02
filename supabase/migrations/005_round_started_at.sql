-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Migration 005 : minuteur synchronisé entre joueurs
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Horodatage de début du round courant. Référence COMMUNE à tous les clients :
-- chacun calcule le temps restant comme (round_started_at + timer_seconds − now),
-- au lieu de lancer un compte à rebours local indépendant (qui dérivait selon la
-- latence et se remettait à fond après un refresh).
--   • Posé par /start (round 1) et /advance (chaque nouveau round).
--   • NULL en attente / solo (le solo garde un minuteur purement local).
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS round_started_at TIMESTAMPTZ;
