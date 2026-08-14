-- ═══════════════════════════════════════════════════════════════════════════════
-- WhatItCost — Auth (Google OAuth) : profils + synchronisation des records
-- À exécuter dans l'éditeur SQL du dashboard Supabase (ou via supabase db push).
--
-- Introduit un compte OPTIONNEL. Le jeu reste jouable en anonyme (localStorage) ;
-- un compte permet de synchroniser le pseudo et les records entre appareils.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── TABLE : profiles ──────────────────────────────────────────────────────────
-- Une ligne par utilisateur authentifié (1-1 avec auth.users). On y stocke le
-- pseudo et les records synchronisables. `hol_best` = meilleure chaîne Higher or
-- Lower (le classement Budget Guess reste géré par la table `leaderboard`).
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT,
  hol_best   INTEGER     NOT NULL DEFAULT 0 CHECK (hol_best >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Chaque utilisateur ne voit et n'écrit QUE sa propre ligne.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── TRIGGER : création automatique du profil à l'inscription ───────────────────
-- À la création d'un utilisateur (auth.users), on crée sa ligne profiles en
-- récupérant le nom Google si présent. SECURITY DEFINER : le trigger tourne avec
-- les droits du propriétaire (contourne RLS pour cette insertion contrôlée).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
