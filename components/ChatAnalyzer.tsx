'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ImageUploader from '@/components/ImageUploader'

interface ChatAnalyzerProps {
  onError: (msg: string) => void
}

type Tone = 'casual' | 'flirty' | 'funny'

export default function ChatAnalyzer({ onError }: ChatAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [tone, setTone] = useState<Tone>('casual')
  const [contextSummary, setContextSummary] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [needsReview, setNeedsReview] = useState(false)
  const [reviewReason, setReviewReason] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!imageBase64) {
      onError('Please upload a screenshot first')
      return
    }

    setIsLoading(true)
    setContextSummary(null)
    setSuggestions([])
    setNeedsReview(false)
    setReviewReason(null)

    try {
      const resp = await fetch('/api/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, tone }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        const msg = data.error || 'Failed to analyze conversation'
        onError(msg)
        setIsLoading(false)
        return
      }

      if (data.needs_review) {
        setNeedsReview(true)
        setReviewReason(data.review_reason || null)
        setContextSummary(data.context_summary || null)
        setIsLoading(false)
        return
      }

      setContextSummary(data.context_summary || null)
      setSuggestions(data.suggestions || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      onError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      onError('Failed to copy to clipboard')
    }
  }

  return (
    <div className="w-full space-y-4 text-left">
      <ImageUploader onImageReady={setImageBase64} isLoading={isLoading} />

      <div className="flex items-center gap-2">
        {(['casual', 'flirty', 'funny'] as Tone[]).map((t) => (
          <motion.button
            key={t}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTone(t)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              tone === t ? 'bg-[#ffd3bf] text-[#2a1114]' : 'bg-white/70 text-[#6b3c43] hover:bg-white'
            }`}
          >
            {t === 'casual' && 'Casual'}
            {t === 'flirty' && 'Coqueto'}
            {t === 'funny' && 'Divertido'}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAnalyze}
        disabled={!imageBase64 || isLoading}
        className="inline-flex items-center rounded-full bg-[#2f171c] px-6 py-3 font-semibold text-[#ffe7db] shadow-lg transition-colors hover:bg-[#4a2128] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Analizando...' : 'Analizar conversación'}
      </motion.button>

      {needsReview && (
        <div className="rounded-[1rem] border border-[#d6b2a0] bg-[#fff1e1] p-4 text-[#7a4a52]">
          <p>Lo siento — no puedo sugerir respuestas para esta conversación por seguridad.</p>
          {reviewReason && <p className="mt-2 text-sm">Razón: {reviewReason}</p>}
        </div>
      )}

      {contextSummary && (
        <div className="rounded-[1rem] border border-[#d6b2a0] bg-[#fffaf6] p-4 text-[#2d1a1d]">
          <p className="font-semibold">Esto es lo que detecté:</p>
          <p className="mt-2">{contextSummary}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-[1rem] border border-[#d6b2a0] bg-white p-4 text-[#2d1a1d]">
              <p className="mb-3">{s}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => handleCopy(s)}
                  className="rounded-full bg-[#2f171c] px-3 py-1 text-sm font-medium text-[#ffe7db]"
                >
                  Copiar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
