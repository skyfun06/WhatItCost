# Configuration du compte (Google OAuth + synchro)

Le code de l'authentification est **entièrement en place**. Il reste **3 étapes manuelles**
(dashboards externes — impossibles à faire depuis le code) pour que la connexion marche.

---

## 1. Base de données — exécuter la migration

Dashboard Supabase → **SQL Editor** → coller et exécuter le contenu de :

```
supabase/migrations/006_auth_profiles.sql
```

Crée la table `profiles` (pseudo + record `hol_best`), ses règles RLS, et le trigger
qui crée automatiquement un profil à chaque inscription.

---

## 2. Google Cloud — créer un client OAuth

1. [console.cloud.google.com](https://console.cloud.google.com/) → crée/choisis un projet.
2. **APIs & Services → OAuth consent screen** : type « External », renseigne le nom de
   l'app et ton email. (En mode test, ajoute ton compte Google dans « Test users ».)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** :
   - Type : **Web application**
   - **Authorized redirect URIs** → ajoute **exactement** :
     ```
     https://mkqwqdeqffulgbdmvlol.supabase.co/auth/v1/callback
     ```
   - Récupère le **Client ID** et le **Client secret**.

---

## 3. Supabase — activer le provider Google

Dashboard Supabase → **Authentication → Providers → Google** :
- Active le provider, colle le **Client ID** et le **Client secret** de l'étape 2.

Puis **Authentication → URL Configuration** :
- **Site URL** : `http://localhost:3000` (en dev) — mettre `https://whatitcost.fr` en prod.
- **Redirect URLs** (allow-list) : ajoute les deux
  ```
  http://localhost:3000/**
  https://whatitcost.fr/**
  ```

---

## Tester

1. `npm run dev`, ouvre `http://localhost:3000/settings`.
2. Section **Compte** → « Continuer avec Google » → choisis ton compte.
3. Retour automatique sur `/settings`, connecté : email + record synchronisé + « Se déconnecter ».

## Ce que fait la synchro

- À la connexion : le pseudo et le record **Higher or Lower** local sont réconciliés avec
  le compte (on garde le **meilleur** des deux), dans les deux sens.
- Un nouveau record HoL établi en étant connecté est **poussé** automatiquement vers le compte.
- Résultat : tes records suivent ton compte d'un appareil à l'autre.

> Note : le classement **Budget Guess** reste géré par la table `leaderboard` (pseudo),
> indépendamment du compte.
