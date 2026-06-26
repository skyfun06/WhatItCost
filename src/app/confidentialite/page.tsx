import type { Metadata } from 'next'
import EditorialPage from '@/components/editorial/EditorialPage'
import Prose from '@/components/editorial/Prose'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité de WhatItCost : données collectées, stockage local, cookies publicitaires (Google AdSense) et vos droits.',
  alternates: { canonical: `${SITE_URL}/confidentialite` },
  robots: { index: true, follow: true },
}

const body = `
WhatItCost respecte ta vie privée. Le jeu fonctionne **sans compte ni inscription** et
collecte le strict minimum. Cette page explique quelles données sont traitées, pourquoi,
et comment.

_Dernière mise à jour : juin 2026._

## Aucun compte, aucune connexion

Tu peux jouer sans créer de compte. WhatItCost ne te demande **ni mot de passe, ni adresse
e-mail** pour jouer. Le seul identifiant que tu fournis volontairement est un **pseudo**,
si tu choisis de soumettre un score au classement.

## Données stockées sur ton appareil

L'essentiel des informations est conservé **localement dans ton navigateur**
(localStorage), et ne quitte pas ton appareil. Cela inclut notamment :

- ton **pseudo** ;
- l'état de ta **partie en cours** (films, manche, mode, minuteur) ;
- l'état de ton **défi du jour** (déjà joué ou non, score du jour) ;
- ta **langue** préférée et la fermeture de la bannière de soutien.

Tu peux effacer ces données à tout moment en vidant le stockage local de ton navigateur.

## Données enregistrées sur nos serveurs

Certaines actions nécessitent un enregistrement côté serveur, via notre prestataire
d'hébergement de base de données **Supabase** :

- **Parties** : pour faire fonctionner le multijoueur et le jeu, les parties et les
  scores associés sont stockés temporairement (films de la partie, scores des joueurs).
- **Classement mondial** : si tu soumets un score, ton **pseudo** et ton **score** sont
  enregistrés pour apparaître au classement. N'utilise pas de pseudo révélant ton
  identité si tu ne le souhaites pas.
- **Messages de contact** : si tu utilises le formulaire de contact, ton **nom**, ton
  **e-mail** et ton **message** sont enregistrés afin de pouvoir te répondre.

## Cookies et publicité

WhatItCost peut afficher des **publicités via Google AdSense** afin de couvrir ses frais.
À cette fin, Google et ses partenaires peuvent déposer des **cookies** ou utiliser des
identifiants sur ton appareil pour mesurer l'audience et, le cas échéant, personnaliser
les annonces.

- Tu peux gérer tes préférences publicitaires Google depuis la page
  [Paramètres des annonces Google](https://adssettings.google.com).
- Plus d'informations sur l'usage des données par les partenaires de Google :
  [Règles de confidentialité de Google](https://policies.google.com/privacy).

En dehors de la publicité, WhatItCost n'utilise **pas de cookies de suivi** à des fins
commerciales et ne revend aucune donnée.

## Prestataires (sous-traitants)

- **Supabase** — hébergement de la base de données (parties, scores, messages).
- **Google AdSense** — diffusion de publicités.
- **TMDB (The Movie Database)** — fourniture des données de films (les appels sont faits
  par le site ; tu n'envoies pas directement de données à TMDB).
- Notre **hébergeur web**, qui peut traiter des données techniques (journaux serveur,
  adresse IP) nécessaires au fonctionnement du site.

## Durée de conservation

Les données de parties sont conservées le temps nécessaire au fonctionnement du jeu. Les
entrées du classement sont conservées tant qu'elles restent pertinentes. Les messages de
contact sont conservés le temps de traiter ta demande.

## Tes droits

Conformément au RGPD, tu disposes d'un droit d'accès, de rectification et de suppression
des données te concernant (par exemple, retirer une entrée du classement ou supprimer un
message de contact). Pour exercer ces droits, écris-nous via le
[formulaire de contact](/contact) en précisant ta demande.

## Contact

Pour toute question relative à cette politique, utilise le
[formulaire de contact](/contact).
`

export default function ConfidentialitePage() {
  return (
    <EditorialPage eyebrow="Vie privée" title="Politique de confidentialité" maxWidth={720}>
      <Prose>{body}</Prose>
    </EditorialPage>
  )
}
