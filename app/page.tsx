'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Stars, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import ChatAnalyzer from '@/components/ChatAnalyzer'
import ImageUploader from '@/components/ImageUploader'

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
    <main className="relative min-h-screen overflow-hidden bg-[#140d14] px-4 py-6 text-[#f7eadf]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10rem] h-96 w-96 rounded-full bg-[#ff8f7a]/25 blur-3xl" />
        <div className="absolute right-[-6rem] top-16 h-[28rem] w-[28rem] rounded-full bg-[#f2c14e]/10 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#6b2d3a]/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,229,196,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col justify-center gap-10 xl:flex-row xl:items-center xl:gap-14">
        <section className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8 xl:w-[42%]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_30%,transparent_70%,rgba(255,255,255,0.04))]" />
          <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#f3d8c2]/75">
            <span>Liggo</span>
            <span>Amor moderno</span>
          </div>

          <div className="relative mt-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#ffcfb7]/30 bg-[#ffcfb7]/10 px-4 py-2 text-sm text-[#ffd9c8]"
            >
              <Heart className="h-4 w-4 fill-current" />
              Tu cómplice para coquetear mejor
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 max-w-lg font-[family:var(--font-display)] text-6xl leading-[0.9] text-[#fff7ef] md:text-7xl lg:text-[6rem]"
            >
              Rizz con
              <span className="block text-[#ffb38f]">alma y descaro</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-5 max-w-xl text-base leading-7 text-[#f3d8c2]/82 md:text-lg"
            >
              Una escena romántica, artesanal y con carácter para escribir líneas,
              analizar chats o improvisar respuestas con una estética que se siente
              más como una carta sellada que como una app cualquiera.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22 }}
              className="mt-8 grid gap-3 sm:grid-cols-3"
            >
              {[
                { label: 'Líneas rápidas', value: 'Picante y elegante' },
                { label: 'Foto / chat', value: 'Un solo flujo' },
                { label: 'Estilo', value: 'Romántico teatral' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-white/10 bg-black/15 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f3d8c2]/60">{item.label}</p>
                  <p className="mt-2 font-[family:var(--font-display)] text-xl text-[#fff1e6]">
                    {item.value}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-3">
            {(['basic', 'text', 'image', 'chat'] as const).map((modeOption) => (
              <motion.button
                key={modeOption}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeChange(modeOption)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  mode === modeOption
                    ? 'border-[#ffd3bf] bg-[#ffd3bf] text-[#2a1114] shadow-[0_10px_30px_rgba(255,175,147,0.22)]'
                    : 'border-white/12 bg-white/5 text-[#f8e6da] hover:border-white/25 hover:bg-white/10'
                }`}
              >
                {modeOption === 'basic' && 'Básico'}
                {modeOption === 'text' && 'Con IA (texto)'}
                {modeOption === 'image' && 'Con IA (foto)'}
                {modeOption === 'chat' && 'Analizar chat'}
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateRizzLines}
            disabled={isLoading}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#ffd3bf] px-6 py-3 text-base font-bold text-[#2a1114] shadow-[0_18px_50px_rgba(255,176,147,0.28)] transition-transform disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              'Generando...'
            ) : (
              <>
                Crear magia
                <WandSparkles className="h-5 w-5" />
              </>
            )}
          </motion.button>

          <p className="mt-4 flex items-center gap-2 text-sm text-[#f3d8c2]/68">
            <Stars className="h-4 w-4" />
            Una sola entrada fuerte, pocos adornos, más intención.
          </p>
        </section>

        <section className="w-full xl:w-[58%]">
          <div className="rounded-[2.25rem] border border-white/10 bg-[#fff8f2]/95 p-5 text-[#2d1a1d] shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-[#d6b2a0]/35 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#8d5b60]">Escena principal</p>
                <h2 className="mt-2 font-[family:var(--font-display)] text-4xl text-[#241214] md:text-5xl">
                  Un rincón para conquistar
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-[#d6b2a0]/45 bg-[#f4dfd4] px-4 py-2 text-sm font-semibold text-[#6b3c43] md:flex">
                <Heart className="h-4 w-4 fill-current" />
                Liggo en modo romance
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#f7e6d9,#fffaf6)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {mode === 'text' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5"
                  >
                    <label className="mb-2 block text-sm font-semibold text-[#7a4a52]">Describe la escena</label>
                    <input
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Ej. encuentro en una librería, cita en terraza, chat de madrugada..."
                      disabled={isLoading}
                      className="w-full rounded-[1.2rem] border border-[#d7b8ab] bg-white/85 px-4 py-3 text-[#2d1a1d] placeholder:text-[#9c756e] outline-none transition-colors focus:border-[#d6957a] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </motion.div>
                )}

                {mode === 'image' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5"
                  >
                    <ImageUploader onImageReady={setSelectedImageBase64} isLoading={isLoading} />
                  </motion.div>
                )}

                {mode === 'chat' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5"
                  >
                    <ChatAnalyzer onError={(msg: string) => setError(msg)} />
                  </motion.div>
                )}

                {mode === 'basic' && (
                  <div className="rounded-[1.3rem] border border-dashed border-[#d9b9aa] bg-white/60 p-5 text-[#6c4048]">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#9d756d]">Modo básico</p>
                    <p className="mt-3 text-lg leading-7">
                      Un clic, una línea con encanto y una escena lista para usar.
                    </p>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-[1.2rem] border border-[#d58c88] bg-[#ffe7e4] p-4 text-[#8b3731]"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="mt-5 h-48">
                  <AnimatePresence mode="wait">
                    {rizzLines[currentLineIndex] && (
                      <motion.div
                        key={currentLineIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.45 }}
                        className="flex h-full items-center justify-center rounded-[1.4rem] border border-[#d8b8ab] bg-[#fff7f1] px-6 text-center shadow-[0_16px_40px_rgba(137,92,82,0.12)]"
                      >
                        <p className="max-w-2xl font-[family:var(--font-display)] text-3xl leading-tight text-[#3a1d21] md:text-4xl">
                          {rizzLines[currentLineIndex]}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {rizzLines.length > 0 && (
                  <div className="mt-4 flex justify-center gap-2">
                    {rizzLines.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2.5 rounded-full transition-all ${
                          index === currentLineIndex ? 'w-8 bg-[#d67f72]' : 'w-2.5 bg-[#d9b9ab]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-[#e4c8ba] bg-[#f9eee7] p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#9d756d]">Dirección visual</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-[#5f3940]">
                    <p>Fondo nocturno cálido, como una cita a media luz.</p>
                    <p>Tipografía con personalidad para dar sensación artesanal y romántica.</p>
                    <p>Tarjetas claras, bordes suaves y un solo acento cálido para el gesto principal.</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    'Una página con presencia, no un panel neutro.',
                    'Jerarquía alta: título, acción, resultado.',
                    'Pocas microinteracciones, más atmósfera.',
                  ].map((line) => (
                    <div
                      key={line}
                      className="rounded-[1.1rem] border border-white/70 bg-white/75 px-4 py-3 text-[#55333b] shadow-sm"
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.4rem] bg-[#2f171c] p-5 text-[#ffe7db] shadow-[0_20px_50px_rgba(47,23,28,0.25)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#ffccba]">Nota</p>
                  <p className="mt-3 font-[family:var(--font-display)] text-2xl leading-tight">
                    “Que se sienta como un flechazo, no como un formulario.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}