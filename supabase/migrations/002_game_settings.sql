-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Migration 002 : paramètres de partie configurables
-- Idempotente : peut être ré-exécutée sans risque (IF EXISTS / IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Nombre de rounds variable (3 / 5 / 10) ──────────────────────────────────
-- L'ancienne contrainte limitait round_number à 1–5, ce qui faisait échouer
-- l'insertion des rounds 6 à 10. On l'élargit à 1–20.
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_round_number_check;
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_round_number_check CHECK (round_number BETWEEN 1 AND 20);

-- ─── 2. Durée du minuteur par round ─────────────────────────────────────────────
-- En secondes. 0 = pas de minuteur (∞). Lue par les joueurs (notamment les
-- invités multijoueur qui rejoignent une partie déjà configurée par l'hôte).
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS timer_seconds SMALLINT NOT NULL DEFAULT 30
  CHECK (timer_seconds >= 0);
