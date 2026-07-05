'use client'

import { motion } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { compressImage, validateImageFile } from '@/lib/imageValidation'

interface ImageUploaderProps {
  onImageReady: (base64: string) => void
  isLoading: boolean
}

export default function ImageUploader({ onImageReady, isLoading }: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setSelectedImage(file)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Compress and prepare base64
    try {
      setIsCompressing(true)
      const base64 = await compressImage(file, 1024)
      onImageReady(base64)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compress image'
      setError(message)
      setSelectedImage(null)
      setPreview(null)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading || isCompressing) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleClick = () => {
    if (!isLoading && !isCompressing) {
      inputRef.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleRemove = () => {
    setSelectedImage(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="w-full space-y-4 text-left">
      {/* Upload Area */}
      {!preview && (
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
          whileHover={!isLoading && !isCompressing ? { scale: 1.02 } : {}}
          className={`cursor-pointer rounded-[1.4rem] border border-dashed border-[#d9b9aa] bg-white/70 p-8 text-center transition-colors ${
            isLoading || isCompressing
              ? 'cursor-not-allowed opacity-50'
              : 'hover:border-[#d49a8c] hover:bg-white/85'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={isLoading || isCompressing}
          />

          <Upload className="mx-auto mb-3 h-8 w-8 text-[#8e5c63]" />
          <p className="text-lg font-semibold text-[#2d1a1d]">
            {isCompressing ? 'Comprimiendo imagen...' : 'Sube una foto'
            }
          </p>
          <p className="mt-2 text-sm text-[#7b5a5f]">
            Arrastra o haz clic para elegir (JPEG, PNG, WebP hasta 10 MB)
          </p>
        </motion.div>
      )}

      {/* Preview */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative inline-block w-full"
        >
          <img src={preview} alt="Preview" className="w-full max-h-64 rounded-[1.4rem] object-cover" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRemove}
            disabled={isLoading}
            className="absolute -right-3 -top-3 rounded-full bg-[#2f171c] p-2 text-[#ffe7db] shadow-lg transition-colors hover:bg-[#4a2128] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1rem] border border-[#d58c88] bg-[#ffe7e4] p-3 text-sm text-[#8b3731]"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}
