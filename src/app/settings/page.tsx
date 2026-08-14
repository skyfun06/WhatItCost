'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { HelpCircle, Info, Shield, Mail, LogOut, RefreshCw, type LucideIcon } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import Toggle from '@/components/Toggle'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/contexts/AuthContext'
import { syncAccount, type SyncResult } from '@/lib/accountSync'
import { type Locale } from '@/i18n'
import {
  getStoredPlayerName,
  storePlayerName,
  sanitizePlayerName,
  PLAYER_NAME_MAX,
} from '@/lib/playerName'
import { hapticsEnabled, setHapticsEnabled, tapHaptic } from '@/lib/haptics'

// ─────────────────────────────────────────────────────────────────────────────
// VRAIE page Paramètres — cible de l'onglet « Paramètres » du dock mobile.
// Préférences de l'application (profil, langue, haptique, données), à ne pas
// confondre avec /configure qui configure une PARTIE. Tout est stocké en
// localStorage : aucun compte requis (le compte optionnel est un teaser).
// ─────────────────────────────────────────────────────────────────────────────

// Clés localStorage effacées par « Effacer mes données locales ». On préserve
// volontairement `locale` (langue de l'UI) pour ne pas dérouter l'utilisateur.
const CLEARABLE_KEYS = [
  'wic_player_name',
  'wic_movies',
  'wic_hol_best',
  'wic_daily',
  'wic_haptics',
  'gameSettings',
  'wic_game_id',
  'wic_player_id',
  'wic_timer',
  'wic_game_mode',
  'wic_game_mode_type',
  'wic_is_host',
]

const LOCALES: Locale[] = ['fr', 'en']

// Logo Google officiel (4 couleurs) pour le bouton de connexion.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// Carte de section — même langage visuel que /configure.
function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      className="p-5 sm:p-6"
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #222222', borderRadius: 'var(--r-md)' }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '16px',
        }}
      >
        {label}
      </span>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation()
  const { user, loading: authLoading, supabase, signInWithGoogle, signOut } = useAuth()

  // Hydratation : localStorage n'est lu qu'après montage (évite un mismatch SSR).
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saved' | 'invalid'>('idle')
  const [haptics, setHaptics] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [cleared, setCleared] = useState(false)

  // Auth / synchro compte
  const [sync, setSync] = useState<SyncResult | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    setMounted(true)
    setName(getStoredPlayerName() ?? '')
    setHaptics(hapticsEnabled())
    // Retour d'un échec OAuth (flag posé par /auth/callback).
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth_error')) {
      setAuthError(true)
    }
  }, [])

  // À la connexion (ou au montage si déjà connecté) : réconcilie profil <-> local.
  useEffect(() => {
    if (!user) {
      setSync(null)
      return
    }
    let active = true
    setSyncing(true)
    syncAccount(supabase, user.id).then((res) => {
      if (!active) return
      setSync(res)
      setSyncing(false)
      // Le pseudo consolidé peut venir du profil → reflète-le dans le champ.
      if (res?.username) setName(res.username)
    })
    return () => {
      active = false
    }
  }, [user, supabase])

  async function runSync() {
    if (!user) return
    setSyncing(true)
    const res = await syncAccount(supabase, user.id)
    setSync(res)
    setSyncing(false)
    if (res?.username) setName(res.username)
  }

  function saveName() {
    if (sanitizePlayerName(name)) {
      storePlayerName(name)
      setNameStatus('saved')
      tapHaptic()
    } else {
      setNameStatus('invalid')
    }
  }

  function toggleHaptics(next: 'on' | 'off') {
    const on = next === 'on'
    setHaptics(on)
    setHapticsEnabled(on)
    if (on) tapHaptic() // aperçu immédiat quand on l'active
  }

  function clearData() {
    try {
      CLEARABLE_KEYS.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
    setName('')
    setNameStatus('idle')
    setHaptics(true)
    setConfirmClear(false)
    setCleared(true)
  }

  const aboutLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/comment-jouer', label: t.prefs.howToPlay, icon: HelpCircle },
    { href: '/a-propos', label: t.prefs.about, icon: Info },
    { href: '/confidentialite', label: t.prefs.privacy, icon: Shield },
    { href: '/contact', label: t.prefs.contact, icon: Mail },
  ]

  return (
    <AnimatedBackground
      // pt généreux : dégage le logo (fixé haut-gauche) et le sélecteur de langue
      // (fixé haut-droite) qui flottent au-dessus de chaque page.
      className="min-h-screen px-4 pt-20 pb-10 sm:px-6 sm:pt-24 sm:pb-16"
      style={{ backgroundColor: '#111111' }}
    >
      <div className="w-full mx-auto" style={{ maxWidth: '560px' }}>
        {/* En-tête */}
        <span
          className="text-xs font-bold uppercase"
          style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.22em' }}
        >
          {t.prefs.eyebrow}
        </span>
        <h1
          className="text-white font-bold mt-2"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', lineHeight: 1.1 }}
        >
          {t.prefs.title}
        </h1>
        <p className="mt-2" style={{ color: '#888888', fontSize: '0.9rem' }}>
          {t.prefs.subtitle}
        </p>

        <div className="flex flex-col" style={{ gap: '16px', marginTop: '28px' }}>
          {/* ── Profil : pseudo (classement + multi) ── */}
          <Card label={t.prefs.profileLabel}>
            <label
              htmlFor="pseudo"
              className="block"
              style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}
            >
              {t.prefs.nickname}
            </label>
            <div className="flex flex-col sm:flex-row" style={{ gap: '10px' }}>
              <input
                id="pseudo"
                type="text"
                value={name}
                maxLength={PLAYER_NAME_MAX}
                placeholder={t.prefs.nicknamePlaceholder}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameStatus('idle')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                }}
                className="flex-1 min-h-[44px] px-4 text-white outline-none focus:border-white/40"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #333333',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type="button"
                onClick={saveName}
                className="press min-h-[44px] font-bold uppercase tracking-wider text-white"
                style={{
                  padding: '0 20px',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--accent)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                {t.prefs.save}
              </button>
            </div>
            <p
              style={{
                marginTop: '8px',
                fontSize: '0.75rem',
                color:
                  nameStatus === 'invalid'
                    ? 'var(--accent)'
                    : nameStatus === 'saved'
                      ? '#4caf50'
                      : '#666666',
              }}
            >
              {nameStatus === 'invalid'
                ? t.prefs.invalidName
                : nameStatus === 'saved'
                  ? t.prefs.saved
                  : t.prefs.nicknameHint}
            </p>
          </Card>

          {/* ── Préférences : langue + haptique ── */}
          <Card label={t.prefs.prefsLabel}>
            <div className="flex flex-col" style={{ gap: '20px' }}>
              <div>
                <span
                  className="block"
                  style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}
                >
                  {t.prefs.language}
                </span>
                <Toggle<Locale>
                  value={locale}
                  onChange={(l) => setLocale(l)}
                  options={LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))}
                />
              </div>

              <div>
                <span
                  className="block"
                  style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}
                >
                  {t.prefs.haptics}
                </span>
                <p style={{ fontSize: '0.75rem', color: '#666666', marginBottom: '8px' }}>
                  {t.prefs.hapticsHint}
                </p>
                <Toggle<'on' | 'off'>
                  value={mounted && haptics ? 'on' : 'off'}
                  onChange={toggleHaptics}
                  options={[
                    { value: 'on', label: t.prefs.on },
                    { value: 'off', label: t.prefs.off },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* ── Compte (optionnel) : Google OAuth + synchro des records ── */}
          <Card label={t.prefs.accountLabel}>
            {authLoading ? (
              <p style={{ fontSize: '0.85rem', color: '#888888' }}>{t.prefs.loadingAccount}</p>
            ) : user ? (
              <div className="flex flex-col" style={{ gap: '16px' }}>
                {/* Identité connectée */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url as string}
                      alt=""
                      referrerPolicy="no-referrer"
                      style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
                    />
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <span
                      className="block"
                      style={{ fontSize: '0.72rem', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {t.prefs.signedInAs}
                    </span>
                    <span
                      className="block truncate"
                      style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      {user.email ?? user.user_metadata?.name ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Record synchronisé */}
                <div
                  className="flex items-center justify-between"
                  style={{ padding: '12px 14px', backgroundColor: '#111111', border: '1px solid #222222', borderRadius: 'var(--r-sm)' }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#888888' }}>{t.prefs.holBestLabel}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {sync?.holBest ?? '—'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row" style={{ gap: '10px' }}>
                  <button
                    type="button"
                    onClick={runSync}
                    disabled={syncing}
                    className="flex items-center justify-center gap-2 min-h-[44px] font-bold uppercase tracking-wider"
                    style={{
                      padding: '0 20px',
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: 'var(--r-sm)',
                      opacity: syncing ? 0.6 : 1,
                    }}
                  >
                    <RefreshCw size={15} strokeWidth={2.4} className={syncing ? 'animate-spin' : undefined} />
                    {syncing ? t.prefs.syncing : t.prefs.syncNow}
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center justify-center gap-2 min-h-[44px] font-bold uppercase tracking-wider"
                    style={{
                      padding: '0 20px',
                      fontSize: '0.75rem',
                      color: 'var(--accent)',
                      border: '1px solid rgba(255,77,46,0.5)',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    <LogOut size={15} strokeWidth={2.4} />
                    {t.prefs.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: '#888888', lineHeight: 1.5 }}>
                  {t.prefs.accountDesc}
                </p>
                {authError && (
                  <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--accent)' }}>
                    {t.prefs.authError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="press mt-4 w-full sm:w-auto flex items-center justify-center gap-3 min-h-[48px]"
                  style={{
                    padding: '0 24px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <GoogleGlyph />
                  {t.prefs.signInGoogle}
                </button>
              </>
            )}
          </Card>

          {/* ── Données locales ── */}
          <Card label={t.prefs.dataLabel}>
            <p style={{ fontSize: '0.85rem', color: '#888888', lineHeight: 1.5, marginBottom: '14px' }}>
              {t.prefs.dataDesc}
            </p>
            {cleared ? (
              <p style={{ fontSize: '0.85rem', color: '#4caf50', fontWeight: 600 }}>{t.prefs.cleared}</p>
            ) : confirmClear ? (
              <div className="flex flex-col sm:flex-row" style={{ gap: '10px' }}>
                <button
                  type="button"
                  onClick={clearData}
                  className="press min-h-[44px] font-bold uppercase tracking-wider text-white"
                  style={{
                    padding: '0 20px',
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--accent)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  {t.prefs.clearConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] font-bold uppercase tracking-wider"
                  style={{
                    padding: '0 20px',
                    fontSize: '0.75rem',
                    color: '#888888',
                    border: '1px solid #333333',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  {t.prefs.cancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[44px] font-bold uppercase tracking-wider"
                style={{
                  padding: '0 20px',
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  border: '1px solid rgba(255,77,46,0.5)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                {t.prefs.clearData}
              </button>
            )}
          </Card>

          {/* ── À propos / liens ── */}
          <Card label={t.prefs.aboutLabel}>
            <ul className="flex flex-col" style={{ gap: '2px' }}>
              {aboutLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 min-h-[44px] px-2 rounded-lg transition-colors hover:bg-white/[0.04]"
                    style={{ color: '#cccccc', fontSize: '0.9rem' }}
                  >
                    <Icon size={18} strokeWidth={2} color="#888888" />
                    <span>{label}</span>
                    <span className="ml-auto" style={{ color: '#555555' }}>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AnimatedBackground>
  )
}
