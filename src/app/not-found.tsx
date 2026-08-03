import NotFoundContent from '@/components/states/NotFoundContent'

// 404 de marque. Composant SERVEUR : il délègue le rendu à un enfant client qui
// seul peut lire la locale (FR/EN) via le contexte. Rien de dynamique ici.
export default function NotFound() {
  return <NotFoundContent />
}
