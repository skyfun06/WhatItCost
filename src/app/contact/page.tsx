import type { Metadata } from 'next'
import EditorialPage from '@/components/editorial/EditorialPage'
import ContactForm from '@/components/editorial/ContactForm'
import { SITE_URL } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Une question, un bug, une donnée erronée ou une suggestion pour WhatItCost ? Écris-nous via le formulaire de contact.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact — WhatItCost',
    description: 'Contacte l’équipe de WhatItCost : questions, bugs, suggestions.',
    url: `${SITE_URL}/contact`,
    type: 'website',
  },
}

export default function ContactPage() {
  return (
    <EditorialPage
      eyebrow="Une question ?"
      title="Contact"
      intro="Un bug, une donnée qui te semble fausse, une idée d'amélioration ou simplement envie de dire bonjour ? Ce formulaire arrive directement dans la boîte du projet."
    >
      <ContactForm />
    </EditorialPage>
  )
}
