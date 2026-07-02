'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import ChatAnalyzer from '@/components/ChatAnalyzer'

type Mode = 'basic' | 'text' | 'image' | 'chat'

export default function Home() {
  const [mode, setMode] = useState<Mode>('basic')
  const [rizzLines, setRizzLines] = useState<string[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null)
  const [userPrompt, setUserPrompt] = useState('')

  const resetState = () => {
    setRizzLines([])
    setCurrentLineIndex(0)
    setError(null)
    setSelectedImageBase64(null)
    setUserPrompt('')
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    resetState()
  }

  const generateRizzLines = async () => {
    setError(null)
    setIsLoading(true)

    try {
      let response: Response
      let data: { rizzLines?: string[]; rizz?: string; error?: string }

      if (mode === 'basic') {
        response = await fetch('/api/generate-rizz')
        data = await response.json()
      } else if (mode === 'text') {
        if (!userPrompt.trim()) {
          setError('Please enter a scenario description')
          setIsLoading(false)
          return
        }
        response = await fetch('/api/generate-rizz-with-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userPrompt, style: 'witty and humorous' }),
        })
        data = await response.json()
      } else if (mode === 'image') {
        if (!selectedImageBase64) {
          setError('Please upload an image first')
          setIsLoading(false)
          return
        }
        response = await fetch('/api/generate-rizz-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: selectedImageBase64 }),
        })
        data = await response.json()
      } else {
        throw new Error('Invalid mode')
      }

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate rizz lines'
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      const lines = data.rizzLines || (data.rizz ? [data.rizz] : [])
      if (!lines || lines.length === 0) {
        setError('No lines generated. Please try again.')
        setIsLoading(false)
        return
      }

      setRizzLines(lines)
      setCurrentLineIndex(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (rizzLines.length > 0) {
      const timer = setTimeout(() => {
        setCurrentLineIndex((prevIndex) =>
          prevIndex < rizzLines.length - 1 ? prevIndex + 1 : prevIndex
        )
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentLineIndex, rizzLines])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="w-full max-w-2xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-4xl font-bold text-white md:text-6xl"
        >
          Rizz Lines Generator
        </motion.h1>

        {/* Mode Selector */}
        <div className="mb-8 flex gap-2 justify-center flex-wrap">
          {(['basic', 'text', 'image', 'chat'] as const).map((modeOption) => (
            <motion.button
              key={modeOption}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleModeChange(modeOption)}
              className={`rounded-full px-4 py-2 font-semibold transition-colors ${
                mode === modeOption
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {modeOption === 'basic' && 'Básico'}
              {modeOption === 'text' && 'Con IA (texto)'}
              {modeOption === 'image' && 'Con IA (foto)'}
              {modeOption === 'chat' && 'Analizar Chat'}
            </motion.button>
          ))}
        </div>

        {/* Mode-Specific Content */}
        {mode === 'text' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Describe a scenario (e.g., 'Meeting someone at a coffee shop')"
              disabled={isLoading}
              className="w-full rounded-lg bg-white/20 px-4 py-3 text-white placeholder-white/60 outline-none transition-colors focus:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </motion.div>
        )}

        {mode === 'image' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <ImageUploader onImageReady={setSelectedImageBase64} isLoading={isLoading} />
          </motion.div>
        )}

        {mode === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <ChatAnalyzer onError={(msg: string) => setError(msg)} />
          </motion.div>
        )}

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={generateRizzLines}
          disabled={isLoading}
          className="mb-8 inline-flex items-center rounded-full bg-white px-6 py-3 font-semibold text-purple-600 shadow-lg transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            'Generating...'
          ) : (
            <>
              Generate Rizz Lines <Sparkles className="ml-2 h-5 w-5" />
            </>
          )}
        </motion.button>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-lg bg-red-500/20 p-4 text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Rizz Lines Display */}
        <div className="h-48">
          <AnimatePresence mode="wait">
            {rizzLines[currentLineIndex] && (
              <motion.div
                key={currentLineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="rounded-lg bg-white p-6 shadow-xl"
              >
                <p className="text-xl font-medium text-purple-600 md:text-2xl">
                  {rizzLines[currentLineIndex]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicator Dots */}
        {rizzLines.length > 0 && (
          <div className="mt-4 flex justify-center space-x-2">
            {rizzLines.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentLineIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

