import { useCallback, useState } from 'react'
import { validateAudioFile, createAudioFile } from '../utils/validation'
import {
  checkWebAudioSupport,
  createAudioContext,
  closeAudioContext,
  validateAudioBuffer,
  isCorruptedAudioError
} from '../utils/audioProcessing'
import { SUPPORTED_FORMATS } from '../types'
import type { AudioFile, ValidationResult, DemoSample } from '../types'
import { loadLargeFile } from '../utils/progressiveLoader'
import { memoryManager } from '../utils/memoryManager'

interface UseFileUploadReturn {
  validateFile: (file: File) => ValidationResult
  loadAudioFile: (file: File, onProgress?: (progress: number) => void) => Promise<AudioBuffer>
  loadDemoSample: (sample: DemoSample) => Promise<AudioBuffer>
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

  const loadAudioFile = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<AudioBuffer> => {
    // Loading audio file

    setIsLoading(true)
    setError(null)

    let audioContext: AudioContext | null = null

    // Simple progress tracking without complex animations
    let currentProgress = 0
    const updateProgress = (targetProgress: number) => {
      currentProgress = targetProgress
      onProgress?.(Math.max(0, Math.min(100, currentProgress)))
    }

    try {
      // Validate file first
      const validation = validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file')
      }

      // Initial progress
      updateProgress(2)

      // Check memory before loading
      const estimatedMemory = file.size * 2 // Rough estimate: file size + decoded buffer
      if (!memoryManager.hasEnoughMemoryForProcessing(estimatedMemory)) {
        memoryManager.forceGarbageCollection()
        
        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 500))
        
        if (!memoryManager.hasEnoughMemoryForProcessing(estimatedMemory)) {
          throw new Error('Not enough memory to load this audio file. Try closing other browser tabs or using a smaller audio file.')
        }
      }

      updateProgress(5)

      // Create audio context with proper error handling
      try {
        audioContext = createAudioContext()
      } catch {
        throw new Error('Failed to create audio context. Your browser may not support Web Audio API.')
      }

      updateProgress(8)

      // Use progressive loading for large files
      // Starting to read file
      let arrayBuffer: ArrayBuffer
      try {
        // Check if file is still accessible
        if (!file || file.size === 0) {
          throw new Error('File is no longer accessible or is empty')
        }

        // Use progressive loading with smooth progress tracking
        arrayBuffer = await loadLargeFile(file, {
          onProgress: (fileProgress) => {
            // File loading is 8-25% of total progress (reduced to leave room for analysis)
            const targetProgress = 8 + (fileProgress * 0.17)
            updateProgress(targetProgress)
          }
        })
        
        // File read successfully
        updateProgress(25) // File loading complete
      } catch (fileError) {
        console.error('File reading error:', fileError)
        if (fileError instanceof Error) {
          if (fileError.message.includes('permission')) {
            throw new Error('File access denied. Please try selecting the file again.')
          }
          if (fileError.message.includes('timeout') || fileError.message.includes('cancelled')) {
            throw fileError // Re-throw timeout/cancellation error as-is
          }
          if (fileError.message.includes('memory')) {
            throw new Error('Not enough memory to load this audio file. Try closing other browser tabs or using a smaller audio file.')
          }
        }
        throw new Error('Failed to read file. The file may have been moved, deleted, or is corrupted.')
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('File appears to be empty or corrupted')
      }

      // Decode audio data with better error handling and progress tracking
      // Starting audio decoding
      updateProgress(27) // Decoding preparation
      
      let audioBuffer: AudioBuffer
      try {
        // Simple progress updates during decoding
        const decodeProgressInterval = setInterval(() => {
          if (currentProgress < 30) {
            currentProgress += 0.5
            onProgress?.(currentProgress)
          }
        }, 100)

        audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Clear decode progress interval
        clearInterval(decodeProgressInterval)
        
        // Audio decoded successfully
        updateProgress(30) // Decoding complete
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

      // File loading and decoding complete - ready for waveform generation
      updateProgress(30) // File loading complete, leaving room for waveform and analysis

      // Return the raw audio buffer - preprocessing will be done later in AudioProcessor
      // to match the essentia.js web demo exactly (mono + 16kHz)
      return audioBuffer
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

  const loadDemoSample = useCallback(async (sample: DemoSample): Promise<AudioBuffer> => {
    // Loading demo sample

    setIsLoading(true)
    setError(null)

    try {
      // Import demo audio loader dynamically to avoid circular dependencies
      const { demoAudioLoader } = await import('../utils/demoAudioLoader')
      
      // Load the demo sample
      const result = await demoAudioLoader.loadSample(sample, {
        useCache: true,
        timeout: 10000
      })

      // Demo sample loaded successfully

      return result.audioBuffer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load demo sample'
      console.error('Demo sample loading failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    loadDemoSample,
    getSupportedFormats,
    createAudioFileObject,
    checkBrowserCompatibility,
    isLoading,
    error
  }
}

export default useFileUpload