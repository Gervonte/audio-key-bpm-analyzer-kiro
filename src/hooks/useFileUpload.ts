import { useCallback, useState } from 'react'
import { validateAudioFile, createAudioFile } from '../utils/validation'
import { SUPPORTED_FORMATS } from '../types'
import type { AudioFile, ValidationResult } from '../types'

interface UseFileUploadReturn {
  validateFile: (file: File) => ValidationResult
  loadAudioFile: (file: File) => Promise<AudioBuffer>
  getSupportedFormats: () => readonly string[]
  createAudioFileObject: (file: File) => AudioFile | null
  isLoading: boolean
  error: string | null
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): ValidationResult => {
    return validateAudioFile(file)
  }, [])

  const loadAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate file first
      const validation = validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file')
      }

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Close audio context to free resources
      await audioContext.close()
      
      return audioBuffer
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [validateFile])

  const getSupportedFormats = useCallback((): readonly string[] => {
    return SUPPORTED_FORMATS
  }, [])

  const createAudioFileObject = useCallback((file: File): AudioFile | null => {
    return createAudioFile(file)
  }, [])

  return {
    validateFile,
    loadAudioFile,
    getSupportedFormats,
    createAudioFileObject,
    isLoading,
    error
  }
}

export default useFileUpload