'use client'

import { useState } from 'react'

// Formulaire de contact. Poste vers /api/contact qui enregistre le message dans
// Supabase. Champ honeypot ("website") invisible : rempli = bot, on ignore.

type Status = 'idle' | 'sending' | 'sent' | 'error'

const inputStyle: React.CSSProperties = {
  backgroundColor: '#16161e',
  border: '1px solid #2a2a38',
  borderRadius: '8px',
  color: '#ffffff',
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')

  const disabled = status === 'sending' || status === 'sent'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website }),
      })
      if (!res.ok) throw new Error('request failed')
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div
        className="flex flex-col items-start gap-2 p-6"
        style={{ backgroundColor: '#16161e', border: '1px solid #222230', borderRadius: '12px' }}
      >
        <p className="font-bold" style={{ color: '#FF4D2E' }}>✓ Message envoyé</p>
        <p className="text-sm" style={{ color: '#aaaab5' }}>
          Merci ! Ton message a bien été reçu. Une réponse arrivera dès que possible.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" style={{ maxWidth: '560px' }}>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-semibold" style={{ color: '#ccccd5' }}>
          Nom
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-3 text-sm outline-none focus:border-[#FF4D2E]"
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold" style={{ color: '#ccccd5' }}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          maxLength={160}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-3 text-sm outline-none focus:border-[#FF4D2E]"
          style={inputStyle}
          placeholder="pour pouvoir te répondre"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-semibold" style={{ color: '#ccccd5' }}>
          Message
        </label>
        <textarea
          id="message"
          required
          rows={6}
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="px-4 py-3 text-sm outline-none focus:border-[#FF4D2E] resize-y"
          style={inputStyle}
        />
      </div>

      {/* Honeypot anti-spam — caché aux humains, ignoré par eux, rempli par les bots. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
        <label htmlFor="website">Site web</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm" style={{ color: '#ff7a5e' }}>
          L&apos;envoi a échoué. Vérifie ta connexion et réessaie dans un instant.
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="self-start whitespace-nowrap px-7 py-3 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        style={{ backgroundColor: '#FF4D2E', borderRadius: '6px' }}
      >
        {status === 'sending' ? 'Envoi…' : 'Envoyer'}
      </button>
    </form>
  )
}
