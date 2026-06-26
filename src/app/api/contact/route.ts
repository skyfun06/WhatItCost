import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Réception des messages du formulaire de contact → insert dans la table Supabase
// `contact_messages`. Pas de service mail externe : on stocke, l'éditeur consulte.
//
// Table à créer une fois dans Supabase (SQL hors migrations, cf. mode opératoire
// du projet) :
//   create table public.contact_messages (
//     id uuid primary key default gen_random_uuid(),
//     name text not null,
//     email text not null,
//     message text not null,
//     created_at timestamptz not null default now()
//   );
//   alter table public.contact_messages enable row level security;
//   create policy "insert_contact" on public.contact_messages
//     for insert to anon with check (true);

export const dynamic = 'force-dynamic'

interface ContactBody {
  name?: string
  email?: string
  message?: string
  website?: string // honeypot
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body: ContactBody = await request.json()

    // Honeypot rempli → bot. On renvoie 200 silencieux pour ne rien laisser deviner.
    if (body.website && body.website.trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim()
    const message = (body.message ?? '').trim()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }
    if (name.length > 80 || email.length > 160 || message.length > 3000) {
      return NextResponse.json({ error: 'too_long' }, { status: 422 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
    }

    const db = createClient() as any
    const { error } = await db
      .from('contact_messages')
      .insert({ name, email, message })

    if (error) {
      console.error('[WIC] contact insert failed', error)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WIC] contact internal error', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
