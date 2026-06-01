-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Schéma initial
-- À exécuter dans l'éditeur SQL du dashboard Supabase (ou via supabase db push)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ─────────────────────────────────────────────────────────────────
-- pgcrypto est déjà actif sur Supabase ; gen_random_uuid() est dispo nativement.

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE : movies
-- Cache des métadonnées TMDB. Peuplée via un script d'import ou à la volée
-- lors de la création d'une partie. Le budget=0 signifie "non renseigné" dans
-- TMDB — ces films sont exclus de la sélection.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.movies (
  id          INTEGER      PRIMARY KEY,               -- ID TMDB natif (stable)
  title       TEXT         NOT NULL,                  -- Titre original
  title_fr    TEXT,                                   -- Titre FR si différent
  year        SMALLINT     NOT NULL,
  director    TEXT,
  cast_list   JSONB        NOT NULL DEFAULT '[]'::JSONB, -- string[] (5 premiers acteurs)
  poster_path TEXT,                                   -- Chemin TMDB ex: "/abc.jpg"
  budget      BIGINT       NOT NULL CHECK (budget > 0),  -- En USD, jamais zéro
  genres      JSONB        NOT NULL DEFAULT '[]'::JSONB, -- string[] ex: ["Action","Drama"]
  overview    TEXT,                                   -- Synopsis EN
  overview_fr TEXT,                                   -- Synopsis FR
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_year    ON public.movies (year);
CREATE INDEX IF NOT EXISTS idx_movies_budget  ON public.movies (budget);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE : games
-- Une session de jeu. Créée au clic "Jouer" (solo) ou "Créer une partie" (multi).
-- movie_ids contient les 5 IDs TMDB dans l'ordre des rounds — fixé à la création.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.games (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT         NOT NULL UNIQUE,         -- Code lisible ex: "FILM42" (auto-généré)
  mode          TEXT         NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
  status        TEXT         NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting', 'playing', 'finished')),
  movie_ids     INTEGER[]    NOT NULL,                -- Exactement 5 IDs TMDB
  current_round SMALLINT     NOT NULL DEFAULT 0,      -- 0=pas commencé, 1–5=round actif
  locale        TEXT         NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

-- Index utiles pour le polling et le nettoyage des vieilles parties
CREATE INDEX IF NOT EXISTS idx_games_code    ON public.games (code);
CREATE INDEX IF NOT EXISTS idx_games_status  ON public.games (status, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE : players
-- Un joueur dans une partie. Pas d'auth — le nom est saisi librement.
-- L'identité est persistée en localStorage côté client (player_id + game_id).
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.players (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID         NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL CHECK (length(trim(name)) >= 1),
  is_host     BOOLEAN      NOT NULL DEFAULT FALSE,
  total_score INTEGER      NOT NULL DEFAULT 0,
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players (game_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE : rounds
-- La réponse d'un joueur pour un film donné dans une partie.
-- UNIQUE (game_id, player_id, round_number) → un seul guess par film par joueur.
-- Le score est calculé côté serveur (API Route) avant insertion.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rounds (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID         NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id    UUID         NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  movie_id     INTEGER      NOT NULL REFERENCES public.movies(id),
  round_number SMALLINT     NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  guess_amount BIGINT       NOT NULL CHECK (guess_amount >= 0), -- Estimation en USD
  score        SMALLINT     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 5000),
  answered_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (game_id, player_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_game_id   ON public.rounds (game_id);
CREATE INDEX IF NOT EXISTS idx_rounds_player_id ON public.rounds (player_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE : leaderboard
-- Classement global. Alimentée à la fin de chaque partie via une API Route.
-- Table dénormalisée intentionnellement : le nom du joueur est copié ici
-- pour éviter les JOINs lors de la lecture du classement.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT         NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0),
  game_id     UUID         REFERENCES public.games(id) ON DELETE SET NULL,
  mode        TEXT         NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index principal : classement trié par score décroissant
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard (score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_mode  ON public.leaderboard (mode, score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- FONCTION + TRIGGER : génération automatique du code de partie
-- Caractères : sans I, O, 0, 1 pour éviter la confusion visuelle.
-- Longueur : 6 chars → 32^6 = ~1 milliard de combinaisons possibles.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_game_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT    := '';
  i     INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_game_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Génère un code unique par retry (collision très improbable)
  IF NEW.code IS NULL OR NEW.code = '' THEN
    LOOP
      NEW.code := public.generate_game_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.games WHERE code = NEW.code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_game_code ON public.games;
CREATE TRIGGER trigger_set_game_code
  BEFORE INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_game_code();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Pas d'authentification en v1 — accès public pour les anon.
-- À restreindre en v2 avec des tokens de session signés côté serveur.
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.movies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- movies : lecture et écriture publiques (cache TMDB, données non sensibles)
CREATE POLICY "movies_public_read"
  ON public.movies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "movies_public_insert"
  ON public.movies FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "movies_public_update"
  ON public.movies FOR UPDATE TO anon, authenticated USING (true);

-- games : lecture et mise à jour publiques (status, current_round)
CREATE POLICY "games_public_read"
  ON public.games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "games_public_insert"
  ON public.games FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "games_public_update"
  ON public.games FOR UPDATE TO anon, authenticated USING (true);

-- players : lecture publique, écriture libre (pas d'auth)
CREATE POLICY "players_public_read"
  ON public.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "players_public_insert"
  ON public.players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "players_public_update"
  ON public.players FOR UPDATE TO anon, authenticated USING (true);

-- rounds : lecture et insertion publiques
CREATE POLICY "rounds_public_read"
  ON public.rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rounds_public_insert"
  ON public.rounds FOR INSERT TO anon, authenticated WITH CHECK (true);

-- leaderboard : lecture publique, insertion publique
CREATE POLICY "leaderboard_public_read"
  ON public.leaderboard FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaderboard_public_insert"
  ON public.leaderboard FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- REALTIME
-- Active la réplication temps réel sur les tables nécessaires au multijoueur.
-- games   : pour détecter les changements de status (waiting → playing → finished)
-- players : pour afficher les joueurs qui rejoignent le lobby
-- rounds  : pour synchroniser la progression (tous ont répondu → passer au round suivant)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
