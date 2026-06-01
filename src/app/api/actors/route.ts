import { NextResponse } from 'next/server'
import { searchPersonProfile } from '@/lib/tmdb/client'

export const dynamic = 'force-dynamic'

// POST { names: string[] } → { photos: { [name]: profile_path | null } }
// Keeps the TMDB token server-side; individual searches are cached (revalidate 3600).
export async function POST(request: Request) {
  try {
    const { names } = await request.json()
    if (!Array.isArray(names)) {
      return NextResponse.json({ error: 'names array required' }, { status: 400 })
    }

    const entries = await Promise.all(
      names.slice(0, 12).map(async (name: string) => {
        const profile = await searchPersonProfile(name)
        return [name, profile] as const
      }),
    )

    return NextResponse.json({ photos: Object.fromEntries(entries) })
  } catch (err) {
    console.error('Actors lookup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
