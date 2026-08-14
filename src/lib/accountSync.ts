import { getStoredPlayerName, storePlayerName } from '@/lib/playerName'
import type { BrowserClient } from '@/lib/supabase/client'

// Record local synchronisable : meilleure chaîne Higher or Lower.
const HOL_BEST_KEY = 'wic_hol_best'

type DB = BrowserClient

function getLocalHolBest(): number {
  if (typeof window === 'undefined') return 0
  try {
    const n = parseInt(localStorage.getItem(HOL_BEST_KEY) ?? '0', 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function setLocalHolBest(n: number): void {
  try {
    localStorage.setItem(HOL_BEST_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export interface SyncResult {
  username: string | null
  holBest: number
}

/**
 * Réconcilie le profil du compte et les données locales, dans les deux sens :
 *   - records : on garde le MAX (local vs distant) et on réaligne les deux ;
 *   - pseudo  : celui du profil prime ; sinon on remonte le pseudo local.
 * Idempotent — sûr à appeler à chaque connexion / ouverture des Paramètres.
 */
export async function syncAccount(supabase: DB, userId: string): Promise<SyncResult | null> {
  try {
    // Cast `any` sur le query builder (comme les routes API) : l'index signature
    // `[key: string]: unknown` des types générés casse l'inférence postgrest.
    const db = supabase as any
    const { data: profile, error } = await db
      .from('profiles')
      .select('username, hol_best')
      .eq('id', userId)
      .maybeSingle()
    if (error) console.error('[WIC] syncAccount read', error.message)

    const localBest = getLocalHolBest()
    const remoteBest = (profile?.hol_best as number | undefined) ?? 0
    const bestMerged = Math.max(localBest, remoteBest)

    const localName = getStoredPlayerName()
    const username = (profile?.username as string | null | undefined) ?? localName ?? null

    const { error: upErr } = await db.from('profiles').upsert(
      { id: userId, username, hol_best: bestMerged, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    if (upErr) console.error('[WIC] syncAccount write', upErr.message)

    // Réaligne le local sur la valeur consolidée.
    if (bestMerged > localBest) setLocalHolBest(bestMerged)
    if (username && username !== localName) storePlayerName(username)

    return { username, holBest: bestMerged }
  } catch (e) {
    console.error('[WIC] syncAccount', e)
    return null
  }
}

/**
 * Pousse un nouveau record HoL vers le compte si l'utilisateur est connecté
 * (no-op sinon). Garde le max côté serveur pour ne jamais régresser un record
 * établi sur un autre appareil. Appelé par le jeu quand un record local tombe.
 */
export async function pushHolBestIfSignedIn(supabase: DB, score: number): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) return

    const db = supabase as any
    const { data: profile } = await db
      .from('profiles')
      .select('hol_best')
      .eq('id', uid)
      .maybeSingle()
    const remoteBest = (profile?.hol_best as number | undefined) ?? 0
    if (score <= remoteBest) return

    await db.from('profiles').upsert(
      { id: uid, hol_best: score, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
  } catch (e) {
    console.error('[WIC] pushHolBestIfSignedIn', e)
  }
}
