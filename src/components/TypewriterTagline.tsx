'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

const TYPING_MS = 48
const ERASING_MS = 22
const PAUSE_MS = 2000

export default function TypewriterTagline() {
  const { t } = useTranslation()
  const questions = t.home.taglines

  const [text, setText] = useState('')
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing')

  // Si la langue change en cours de route, on repart proprement de la 1re phrase.
  useEffect(() => {
    setText('')
    setIdx(0)
    setPhase('typing')
  }, [questions])

  useEffect(() => {
    const full = questions[idx]

    if (phase === 'typing') {
      if (text.length < full.length) {
        const t = setTimeout(() => setText(full.slice(0, text.length + 1)), TYPING_MS)
        return () => clearTimeout(t)
      }
      // Full text shown — pause then erase
      const t = setTimeout(() => setPhase('erasing'), PAUSE_MS)
      return () => clearTimeout(t)
    }

    // Erasing phase
    if (text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), ERASING_MS)
      return () => clearTimeout(t)
    }
    // Done erasing — advance to next question
    setIdx((i) => (i + 1) % questions.length)
    setPhase('typing')
  }, [text, idx, phase, questions])

  return (
    <div className="inline-block text-center" style={{ minHeight: '3.2rem' }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <p
        style={{
          color: '#cccccc',
          fontWeight: 500,
          fontSize: '1rem',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '12px 24px',
          display: 'inline-block',
          minWidth: '18ch',
        }}
      >
        {text}
        <span style={{ color: '#FF4D2E', animation: 'blink 1s step-end infinite', marginLeft: '1px' }}>|</span>
      </p>
    </div>
  )
}
