import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialPage from '@/components/editorial/EditorialPage'
import Prose from '@/components/editorial/Prose'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "L'histoire de WhatItCost : un jeu de devinette des budgets de cinéma, imaginé et codé par un lycéen de 18 ans passionné de films et de développement.",
  alternates: { canonical: `${SITE_URL}/a-propos` },
  openGraph: {
    title: 'À propos — WhatItCost',
    description: "L'histoire derrière WhatItCost, le jeu qui te fait deviner le budget des films.",
    url: `${SITE_URL}/a-propos`,
    type: 'article',
  },
}

const body = `
WhatItCost est né d'une question toute simple, posée un soir devant un blockbuster :
**« Mais au fait, combien ça a coûté à fabriquer ? »** On connaît tous le box-office,
les recettes, les records du week-end d'ouverture. Beaucoup plus rarement le budget de
production — ce chiffre qui dit combien d'argent il a fallu réunir *avant* la moindre
entrée vendue. C'est pourtant lui qui raconte le pari réel derrière un film.

## Le concept

Le principe tient en une phrase : on te montre un film, tu devines son budget de
production. Plus ta réponse est proche du vrai chiffre, plus tu marques de points. Au
fil des manches, tu réalises à quel point l'intuition se trompe : tel film d'auteur a
coûté une fortune, tel énorme succès a été tourné avec un budget dérisoire. Le jeu
existe en plusieurs formats — partie solo, défi entre amis en temps réel, défi du jour
commun à tous les joueurs, et un mode « Plus ou moins » où l'on compare deux films à la
chaîne.

## Qui est derrière le projet

WhatItCost est un projet **indépendant**, conçu et développé par une seule personne : un
lycéen de 18 ans, passionné à la fois de cinéma et de code. Le jeu est parti d'une envie
d'apprendre — manipuler une vraie API de données de films, construire une application web
moderne, gérer du multijoueur en temps réel — autant que d'une fascination sincère pour
l'économie du cinéma. Chaque fonctionnalité a été l'occasion de progresser : le
classement mondial, le partage de scores, les thématiques, le défi quotidien.

C'est aussi pour ça que le projet reste artisanal et évolue par petites touches. Si tu
remarques un bug, une donnée qui te paraît fausse ou si tu as une idée, n'hésite pas :
la [page de contact](/contact) existe précisément pour ça.

## D'où viennent les chiffres

Les films, affiches, dates et budgets affichés dans le jeu proviennent de **TMDB (The
Movie Database)**, une base de données collaborative et ouverte sur le cinéma. Les
budgets y sont renseignés par la communauté et restent, par nature, des estimations :
un studio communique rarement le coût exact d'un film, marketing compris. WhatItCost
n'est ni affilié ni approuvé par TMDB ; le projet utilise simplement son API publique.

Sur le **blog**, on creuse ce que le jeu effleure : pourquoi un film de super-héros coûte
des centaines de millions, comment se décompose réellement un budget, quels films ont
rapporté des fortunes en partant de presque rien. De vrais chiffres, du vrai contexte.

## Prêt à tester ton flair ?

La meilleure façon de comprendre WhatItCost, c'est encore d'y jouer.
`

export default function AProposPage() {
  return (
    <EditorialPage eyebrow="Le projet" title="À propos de WhatItCost" >
      <Prose>{body}</Prose>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/settings?mode=solo"
          className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
        >
          Jouer maintenant
        </Link>
        <Link
          href="/blog"
          className="whitespace-nowrap px-6 py-3 text-sm font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
          style={{ color: '#FF4D2E', border: '1px solid rgba(255,77,46,0.6)', borderRadius: '6px' }}
        >
          Lire le blog
        </Link>
      </div>
    </EditorialPage>
  )
}
