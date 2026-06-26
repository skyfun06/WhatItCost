import type { Metadata } from 'next'
import EditorialPage from '@/components/editorial/EditorialPage'
import Prose from '@/components/editorial/Prose'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site WhatItCost : éditeur, hébergeur et propriété intellectuelle.',
  alternates: { canonical: `${SITE_URL}/mentions-legales` },
  robots: { index: true, follow: true },
}

// NOTE pour l'éditeur : remplace les champs entre crochets [ ] par tes vraies
// informations (identité de l'éditeur, e-mail de contact, hébergeur exact) avant
// la mise en production. Les mentions légales doivent identifier l'éditeur réel.
const body = `
## Éditeur du site

Le site **WhatItCost**, accessible à l'adresse [whatitcost.fr](${SITE_URL}), est un
projet personnel et indépendant édité par un particulier.

- **Éditeur** : [Nom / Prénom de l'éditeur à compléter]
- **Contact** : via le [formulaire de contact](/contact)
- **Statut** : projet non commercial à but ludique et éducatif

Le site ne constitue pas une activité commerciale. Les éventuels revenus publicitaires
servent uniquement à couvrir les frais de fonctionnement (hébergement, nom de domaine).

## Hébergement

Le site est hébergé par son fournisseur d'infrastructure web [hébergeur à préciser, par
ex. Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis]. Les données de
jeu (parties, scores, messages de contact) sont stockées via le service **Supabase**.

## Propriété intellectuelle

L'identité visuelle, le code, les textes du blog et la conception du jeu WhatItCost sont
la propriété de leur éditeur, sauf mention contraire.

Les **données relatives aux films** (titres, affiches, dates de sortie, budgets, recettes)
proviennent de l'API **TMDB (The Movie Database)**. WhatItCost utilise l'API de TMDB mais
n'est **ni approuvé ni certifié par TMDB**. Les affiches et visuels de films restent la
propriété de leurs ayants droit respectifs (studios, distributeurs). Ils sont affichés à
des fins d'illustration et d'information.

Si vous estimez qu'un contenu porte atteinte à vos droits, contactez l'éditeur via le
[formulaire de contact](/contact) afin que la situation soit examinée.

## Responsabilité

Les budgets affichés sont des **estimations** issues d'une base collaborative et peuvent
comporter des inexactitudes. WhatItCost est un jeu : les informations diffusées le sont à
titre indicatif et ne sauraient engager la responsabilité de l'éditeur.

## Données personnelles

Le traitement des données personnelles est décrit dans notre
[politique de confidentialité](/confidentialite).
`

export default function MentionsLegalesPage() {
  return (
    <EditorialPage eyebrow="Informations légales" title="Mentions légales" maxWidth={720}>
      <Prose>{body}</Prose>
    </EditorialPage>
  )
}
