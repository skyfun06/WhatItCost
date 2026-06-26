import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialPage from '@/components/editorial/EditorialPage'
import Prose from '@/components/editorial/Prose'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Comment jouer',
  description:
    'Les règles de WhatItCost : mode Budget (devine le budget exact), mode Plus ou Moins, défi du jour, thématiques, multijoueur entre amis et système de score expliqué.',
  alternates: { canonical: `${SITE_URL}/comment-jouer` },
  openGraph: {
    title: 'Comment jouer — WhatItCost',
    description: 'Toutes les règles de WhatItCost expliquées : modes de jeu, défi du jour, multijoueur et scoring.',
    url: `${SITE_URL}/comment-jouer`,
    type: 'article',
  },
}

const body = `
WhatItCost se joue en quelques secondes par film, mais cache plusieurs façons de jouer.
Voici tout ce qu'il faut savoir pour bien démarrer.

## Le principe de base

À chaque manche, le jeu affiche un film : son affiche, son titre et son année. À toi
d'estimer son **budget de production** — l'argent dépensé pour fabriquer le film, hors
marketing. Tu saisis un montant, tu valides, et le jeu te révèle le vrai chiffre ainsi
que ta précision.

## Mode Budget — devine le montant exact

C'est le mode principal. Tu choisis le nombre de manches (**3, 5 ou 10 films**) et une
durée par manche (**15, 30, 60 secondes ou illimité**, 30 s par défaut). Pour chaque
film, tu proposes un budget.

Le score récompense la **proximité**, mesurée comme un ratio entre ton estimation et le
vrai budget :

- une réponse **parfaite** rapporte **5 000 points** ;
- te tromper d'environ **±10 %** rapporte encore près de **4 500 points** ;
- te tromper d'un **facteur 2** (la moitié ou le double du vrai budget) rapporte **2 500
  points** ;
- même une grosse erreur garde des points : un facteur 10 rapporte encore 500 points.

Ce qui compte, c'est l'**ordre de grandeur** : deviner « la moitié » ou « le double »
vaut exactement le même score, parce qu'estimer un budget se pense en facteurs, pas en
dollars près. Sur 5 manches, le maximum théorique est donc de **25 000 points** ; sur 10
manches, **50 000 points**.

## Mode Plus ou Moins — la chaîne sans fin

Ici, pas de saisie de montant. Le jeu te montre deux films et te demande lequel a coûté
le plus cher (ou le moins cher). Bonne réponse : on enchaîne, un nouveau film apparaît,
et ainsi de suite. **La chaîne est infinie** : on joue jusqu'à la première erreur. Ton
score, c'est le **nombre de bonnes réponses d'affilée**. Simple, nerveux, parfait pour
battre son propre record.

## Le défi du jour

Chaque jour, WhatItCost propose un **défi unique, identique pour tous les joueurs** du
monde, généré à minuit (UTC). Mêmes films, mêmes réglages, **un seul essai par jour**.
C'est le format idéal pour se comparer à armes égales et partager son score. Le mode du
jour (Budget ou Plus ou Moins) peut changer d'un jour à l'autre.

## Les thématiques

Envie de tester un univers précis ? Les **thématiques** filtrent le vivier de films
autour d'un thème (par exemple un studio, une saga ou un genre marquant). Une fois un
thème choisi, il remplace les filtres de genre et de difficulté : tu n'affrontes plus
que des films correspondant à ce thème.

## Jouer entre amis

WhatItCost se joue aussi en **multijoueur en temps réel**. Tu crées un salon, tu partages
le **code de la partie**, et tes amis te rejoignent. Tout le monde affronte les **mêmes
films dans le même ordre**, avec les mêmes réglages : à la fin, le classement départage
les meilleurs estimateurs. Les films, les réglages et le minuteur sont gérés côté serveur
pour que la partie soit parfaitement synchronisée.

## Le classement mondial

À la fin d'une partie solo, tu peux soumettre ton score au **classement mondial**, avec
ton pseudo. Le classement garde ton **meilleur score** par mode (Budget et Plus ou
Moins). De quoi viser le sommet et y rester.
`

export default function CommentJouerPage() {
  return (
    <EditorialPage eyebrow="Le guide" title="Comment jouer">
      <Prose>{body}</Prose>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/settings?mode=solo"
          className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
        >
          Lancer une partie
        </Link>
        <Link
          href="/daily"
          className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
          style={{ color: '#FF4D2E', border: '1px solid rgba(255,77,46,0.6)', borderRadius: '6px' }}
        >
          🎬 Défi du jour
        </Link>
      </div>
    </EditorialPage>
  )
}
