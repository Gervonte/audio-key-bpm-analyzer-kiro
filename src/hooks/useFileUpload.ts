import { useCallback, useState } from 'react'
import { validateAudioFile, createAudioFile } from '../utils/validation'
import { 
  checkWebAudioSupport, 
  createAudioContext, 
  closeAudioContext,
  validateAudioBuffer,
  preprocessAudioBuffer,
  isCorruptedAudioError
} from '../utils/audioProcessing'
import { SUPPORTED_FORMATS } from '../types'
import type { AudioFile, ValidationResult } from '../types'

interface UseFileUploadReturn {
  validateFile: (file: File) => ValidationResult
  loadAudioFile: (file: File) => Promise<AudioBuffer>
  getSupportedFormats: () => readonly string[]
  createAudioFileObject: (file: File, audioBuffer?: AudioBuffer) => AudioFile | null
  checkBrowserCompatibility: () => { isSupported: boolean; error?: string }
  isLoading: boolean
  error: string | null
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkBrowserCompatibility = useCallback(() => {
    return checkWebAudioSupport()
  }, [])

  const validateFile = useCallback((file: File): ValidationResult => {
    // First check browser compatibility
    const browserCheck = checkWebAudioSupport()
    if (!browserCheck.isSupported) {
      return {
        isValid: false,
        error: browserCheck.error
      }
    }

    // Then validate the file
    return validateAudioFile(file)
  }, [])

  const loadAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    setIsLoading(true)
    setError(null)

    let audioContext: AudioContext | null = null

    try {
      // Validate file first
      const validation = validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file')
      }

      // Create audio context with proper error handling
      try {
        audioContext = createAudioContext()
      } catch (err) {
        throw new Error('Failed to create audio context. Your browser may not support Web Audio API.')
      }

      // Read file as array buffer with timeout
      const arrayBuffer = await Promise.race([
        file.arrayBuffer(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('File reading timeout')), 30000)
        )
      ])

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('File appears to be empty or corrupted')
      }

      // Decode audio data with better error handling
      let audioBuffer: AudioBuffer
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      } catch (decodeError) {
        const error = decodeError as Error
        
        if (isCorruptedAudioError(error)) {
          throw new Error(`Audio file appears to be corrupted or uses an unsupported codec. Please try re-exporting your audio file in MP3, WAV, FLAC, or M4A format.`)
        }
        
        // Try to provide more specific error messages based on common issues
        if (error.message.includes('Unable to decode') || error.message.includes('InvalidStateError')) {
          throw new Error('Unable to decode audio file. The file may be corrupted, use an unsupported codec, or be in a format that your browser cannot process.')
        }
        
        if (error.message.includes('NotSupportedError')) {
          throw new Error('Audio format not supported by your browser. Please convert to MP3, WAV, FLAC, or M4A.')
        }
        
        if (error.message.includes('DataError')) {
          throw new Error('Audio file contains invalid data. Please check that the file is not corrupted.')
        }
        
        throw new Error(`Failed to decode audio file. This may be due to an unsupported codec or corrupted file data.`)
      }

      // Validate the decoded audio buffer
      const bufferValidation = validateAudioBuffer(audioBuffer)
      if (!bufferValidation.isValid) {
        throw new Error(bufferValidation.error || 'Invalid audio data')
      }

      // Preprocess the audio buffer (normalization, filtering)
      const processedBuffer = preprocessAudioBuffer(audioBuffer)
      
      return processedBuffer
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      // Always clean up audio context
      if (audioContext) {
        await closeAudioContext(audioContext)
      }
      setIsLoading(false)
    }
  }, [validateFile])

  const getSupportedFormats = useCallback((): readonly string[] => {
    return SUPPORTED_FORMATS
  }, [])

  const createAudioFileObject = useCallback((file: File, audioBuffer?: AudioBuffer): AudioFile | null => {
    const baseAudioFile = createAudioFile(file)
    if (!baseAudioFile) {
      return null
    }

    // If we have an AudioBuffer, extract the actual duration
    if (audioBuffer) {
      return {
        ...baseAudioFile,
        duration: audioBuffer.duration
      }
    }

    return baseAudioFile
  }, [])

  return {
    validateFile,
    loadAudioFile,
    getSupportedFormats,
    createAudioFileObject,
    checkBrowserCompatibility,
    isLoading,
    error
  }
}

export default useFileUpload