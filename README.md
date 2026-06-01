# WhatItCost 🎬

Jeu de devinette de budgets de films. Le joueur voit l'affiche, le titre, le réalisateur et le casting d'un film, et doit estimer son budget de production. Solo ou multijoueur en temps réel.

> Architecture détaillée : voir [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

- **Next.js 14** (App Router) — SSR / Server Components / API Routes
- **Supabase** (PostgreSQL + Realtime) — parties, joueurs, rounds, classement
- **TMDB API** — données films (budget, affiche, casting)
- **Tailwind CSS v3** — design system (corail `#FF4D2E` / fond sombre `#111`)
- **i18n maison** (FR / EN) — React Context + fichiers de constantes, bascule instantanée

---

## Développement local

### 1. Prérequis
- Node.js 18+
- Un projet [Supabase](https://supabase.com)
- Un token de lecture [TMDB](https://www.themoviedb.org/settings/api)

### 2. Installation

```bash
npm install
```

### 3. Variables d'environnement

Copie `.env.example` vers `.env.local` et renseigne les valeurs :

```bash
cp .env.example .env.local
```

| Variable | Côté | Où la trouver |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + serveur | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + serveur | Supabase → Project Settings → API |
| `TMDB_API_READ_TOKEN` | **serveur uniquement** | themoviedb.org → Settings → API → *API Read Access Token* |

> ⚠️ `TMDB_API_READ_TOKEN` ne doit **jamais** porter le préfixe `NEXT_PUBLIC_` : il reste côté serveur et n'est jamais exposé au navigateur.

### 4. Base de données

Dans le **SQL Editor** du dashboard Supabase, exécute dans l'ordre :

1. [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) — tables, RLS, triggers, Realtime
2. [`supabase/migrations/002_game_settings.sql`](./supabase/migrations/002_game_settings.sql) — nombre de rounds variable (jusqu'à 20) + colonne `timer_seconds`

> Sans la migration `002`, la création de partie échoue (« Failed to create game ») et les parties à 10 rounds sont bloquées.

### 5. Lancer

```bash
npm run dev      # http://localhost:3000
```

Autres scripts : `npm run build` (build de prod), `npm run start` (serveur de prod), `npm run lint`.

---

## Déploiement sur Vercel

### 1. Importer le projet
Sur [vercel.com](https://vercel.com) → **Add New… → Project** → importe le dépôt GitHub `skyfun06/WhatItCost`. Vercel détecte Next.js automatiquement (aucune config de build à modifier).

### 2. Variables d'environnement
Dans **Project → Settings → Environment Variables**, ajoute les 3 variables avec tes vraies valeurs (Production + Preview) :

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
TMDB_API_READ_TOKEN
```

### 3. Base de données de production
Assure-toi que les migrations **`001` + `002`** sont appliquées sur la base Supabase utilisée en production.

### 4. Déployer
Lance le déploiement. Chaque `git push` sur `main` redéploie automatiquement ; les autres branches génèrent des Preview Deployments.

### Notes
- Aucune URL `localhost` en dur : les appels internes utilisent des chemins relatifs, et le lien d'invitation multijoueur se base sur `window.location.origin` → fonctionne sur n'importe quel domaine Vercel.
- Les images TMDB sont autorisées dans `next.config.mjs` (`image.tmdb.org`).
- Le Realtime Supabase (lobby / multijoueur) fonctionne sans configuration supplémentaire avec la clé anon.

---

## Structure

```
src/
├── app/            # Pages (App Router) + API Routes
├── components/     # Composants UI (AnimatedBackground, LanguageToggle…)
├── contexts/       # LocaleContext (FR/EN persisté en localStorage)
├── hooks/          # useTranslation
├── i18n/           # fr.ts / en.ts
├── lib/            # supabase/ + tmdb/ + utils/
└── types/
supabase/migrations # Schéma SQL (001, 002)
```
