# WhatItCost — Architecture

Jeu de devinette de budgets de films/séries. Le joueur voit l'affiche, titre, réalisateur et casting d'un film, et doit estimer son budget de production.

---

## Stack

| Couche | Technologie | Pourquoi |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR natif, ISR pour le leaderboard, Server Components pour les requêtes DB |
| Base de données | Supabase (PostgreSQL) | Realtime intégré pour le multijoueur, RLS, SDK TypeScript typé |
| Style | Tailwind CSS v3 | Utilitaires inline, design tokens dans `tailwind.config.ts` |
| Données films | TMDB API v3 | Données riches (budget, casting, affiche), gratuit |
| Hébergement | Vercel (recommandé) | Edge Network + déploiement Next.js optimal |

---

## Structure des fichiers

```
src/
├── app/                        # App Router (Next.js 14)
│   ├── layout.tsx              # Root layout : font, LocaleProvider
│   ├── page.tsx                # Page d'accueil
│   ├── game/
│   │   ├── page.tsx            # Jeu solo
│   │   └── [id]/page.tsx       # Jeu multijoueur (rejoint via lobby)
│   ├── lobby/
│   │   ├── page.tsx            # Créer / rejoindre une partie
│   │   └── [id]/page.tsx       # Salle d'attente (Realtime)
│   ├── results/
│   │   └── [id]/page.tsx       # Résultats solo + classement multi
│   └── leaderboard/
│       └── page.tsx            # Classement global (ISR 60s)
│
├── components/
│   ├── layout/                 # Header (navigation + switch langue)
│   ├── game/                   # MovieCard, BudgetSlider, ScoreReveal, RoundTimer
│   └── ui/                     # Button, Card, Badge (composants génériques)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient() — Client Components
│   │   ├── server.ts           # createServerClient() — Server Components / Route Handlers
│   │   └── database.types.ts   # Types TypeScript dérivés du schéma SQL
│   ├── tmdb/
│   │   ├── client.ts           # tmdbFetch(), getMovieById(), discoverMovies()
│   │   └── types.ts            # TMDBMovie, TMDBCrewMember, etc.
│   └── utils/
│       ├── scoring.ts          # computeScore(), computeAccuracy()
│       └── format.ts           # formatBudget(), formatScore()
│
├── contexts/
│   └── LocaleContext.tsx       # Provider + useLocale() — gestion FR/EN
│
├── hooks/
│   └── useTranslation.ts       # useTranslation() → { t, locale, setLocale }
│
├── i18n/
│   ├── fr.ts                   # Toutes les chaînes FR
│   ├── en.ts                   # Toutes les chaînes EN
│   └── index.ts                # Type Locale, type Translations, translations map
│
└── types/
    └── index.ts                # Alias (Movie, Game, Player, Round…) + types composés
```

---

## Schéma de base de données

### Relations

```
movies (cache TMDB)
  └── utilisés dans → games.movie_ids[]

games (session de jeu)
  ├── players (1..N)
  │     └── rounds (1..N, max 5 par joueur)
  │           └── référence → movies
  └── leaderboard (inséré à la fin de la partie)
```

### Tables clés

**`movies`** — Cache des données TMDB. Budget > 0 obligatoire (contrainte SQL). Peuplée par script d'import ou à la volée lors de la création d'une partie.

**`games`** — Une session de jeu. `movie_ids[]` (5 IDs fixés à la création), `current_round` (0–5), `status` (`waiting` → `playing` → `finished`). Le `code` court (ex: `FILM42`) est auto-généré par un trigger PostgreSQL.

**`players`** — Joueur dans une partie. Pas d'auth — `player_id` (UUID) stocké en `localStorage` côté client pour identifier le joueur lors de ses prochaines actions.

**`rounds`** — Une réponse par joueur par film. Contrainte `UNIQUE(game_id, player_id, round_number)`. Le `score` est calculé côté serveur (API Route) avant insertion pour éviter la falsification.

**`leaderboard`** — Table dénormalisée (nom copié) pour lire le classement sans JOIN. Alimentée par une API Route à la fin de chaque partie.

---

## Flux de données

### Solo

```
Home → /game
  → POST /api/games       (crée game solo, choisit 5 films aléatoires)
  → redirect /game/[id]
  → Affiche film 1
  → Joueur bouge le slider
  → POST /api/rounds      (calcule score, insère round)
  → Révèle le budget réel + score
  → Répète × 5
  → POST /api/leaderboard (insère score final)
  → redirect /results/[id]
```

### Multijoueur

```
Hôte → /lobby
  → POST /api/games       (crée game multi, génère code)
  → redirect /lobby/[id]  (affiche le code, attend les joueurs)

Invités → /lobby (saisissent le code)
  → POST /api/players     (rejoint la partie)
  → redirect /lobby/[id]

Realtime: subscription games(id) + players(game_id=id)
  → Tous voient les joueurs arriver en temps réel

Hôte clique "Lancer" → PATCH /api/games/[id] { status: 'playing', current_round: 1 }

Realtime: status → 'playing'
  → Tous redirigés vers /game/[id]

Chaque joueur répond → POST /api/rounds
Realtime: rounds(game_id=id) → quand tous ont répondu au round N
  → PATCH /api/games/[id] { current_round: N+1 } (fait par l'hôte ou une Edge Function)
  → Tous passent au film suivant

Fin (round 5 terminé) → PATCH { status: 'finished' }
  → Tous redirigés vers /results/[id]
```

---

## Multijoueur — Synchronisation Realtime

Les abonnements Supabase Realtime sont activés sur trois tables :

| Table | Événements écoutés | Utilisation |
|---|---|---|
| `games` | `UPDATE` | Détecter `status` et `current_round` qui changent |
| `players` | `INSERT` | Afficher les joueurs qui rejoignent le lobby |
| `rounds` | `INSERT` | Savoir quand tous les joueurs ont répondu (→ round suivant) |

```typescript
// Exemple d'écoute dans un composant
const channel = supabase
  .channel(`game-${id}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` },
    (payload) => handleGameUpdate(payload.new))
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${id}` },
    (payload) => handlePlayerJoin(payload.new))
  .subscribe()
```

---

## API Routes (à créer)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/games` | Crée une partie (choisit les 5 films) |
| `PATCH` | `/api/games/[id]` | Met à jour status / current_round |
| `POST` | `/api/players` | Rejoint une partie |
| `POST` | `/api/rounds` | Soumet une estimation (calcule le score côté serveur) |
| `POST` | `/api/leaderboard` | Enregistre le score final |
| `GET` | `/api/movies/random` | Sélectionne N films avec budget connu depuis la DB |

---

## i18n

Approche : **React Context + fichiers de constantes** (sans bibliothèque externe).

- `src/i18n/fr.ts` et `en.ts` — objets `as const`, TypeScript garantit la cohérence des clés entre les deux langues via `satisfies Record<Locale, Translations>`.
- `LocaleProvider` injecté dans `layout.tsx` — persiste le choix dans le state React (pas en cookie, pas d'URL locale).
- `useTranslation()` — hook consommé dans tous les Client Components.

Décision : pas de sous-chemin URL (`/fr/...`, `/en/...`). Le switch de langue est instantané sans rechargement. Les métadonnées SEO (`<html lang>`) sont mises à jour dynamiquement.

---

## Scoring

```
score = 5000 × e^(−3 × |guess − actual| / actual)
```

| Erreur | Score |
|---|---|
| 0 % | 5 000 pts |
| 10 % | 3 704 pts |
| 25 % | 2 362 pts |
| 50 % | 1 116 pts |
| 100 % | 249 pts |

Score maximum par partie (5 films) : **25 000 pts**.

Le score est **calculé côté serveur** dans la Route Handler `POST /api/rounds` pour empêcher la falsification côté client.

---

## Variables d'environnement

| Variable | Côté | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Serveur | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Serveur | Clé publique anon (RLS protège les données) |
| `TMDB_API_READ_TOKEN` | Serveur uniquement | Token Bearer TMDB v3 (jamais exposé au client) |

---

## Prochaines étapes

- [ ] Script `scripts/import-movies.ts` — importe N films TMDB avec budget connu dans Supabase
- [ ] `src/components/game/MovieCard.tsx` — affiche affiche + infos film
- [ ] `src/components/game/BudgetSlider.tsx` — slider logarithmique (de $1M à $500M)
- [ ] `src/components/game/ScoreReveal.tsx` — animation de révélation du budget réel
- [ ] API Routes (`/api/games`, `/api/rounds`, `/api/leaderboard`)
- [ ] Logique de jeu solo (`/game/page.tsx`)
- [ ] Lobby multijoueur (`/lobby/[id]/page.tsx`) avec Realtime
- [ ] Écran de résultats (`/results/[id]/page.tsx`)
- [ ] Classement global (`/leaderboard/page.tsx`)
- [ ] Bouton de partage (Web Share API + fallback clipboard)
