-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Migration 004 : réglages en lobby + modes de jeu
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Réglages de partie complets (configurés dans le lobby par l'hôte) :
-- { rounds, timer, difficulty, genre, gameMode }
-- gameMode ∈ { 'budget_guess', 'higher_or_lower' }
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS game_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Le mode multijoueur récupère désormais ses films AU DÉMARRAGE (après config
-- dans le lobby) : movie_ids peut donc être un tableau vide à la création.
-- (Aucune contrainte de longueur n'existait, rien à modifier — note seulement.)
