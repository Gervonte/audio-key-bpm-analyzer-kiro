// React hook for coordinated audio processing using AudioProcessor

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AnalysisResult } from '../types'
import { AudioProcessor } from '../utils/audioProcessor'

export interface UseAudioProcessorResult {
  processAudio: (audioBuffer: AudioBuffer) => Promise<AnalysisResult>
  isProcessing: boolean
  progress: number
  error: string | null
  cancelProcessing: () => void
  resetState: () => void
}

export interface UseAudioProcessorOptions {
  timeoutMs?: number
}

export function useAudioProcessor(options: UseAudioProcessorOptions = {}): UseAudioProcessorResult {
  const { timeoutMs = 30000 } = options
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const processorRef = useRef<AudioProcessor | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // Initialize processor
  useEffect(() => {
    processorRef.current = new AudioProcessor()
    
    return () => {
      // Cleanup on unmount
      if (processorRef.current) {
        processorRef.current.cancelProcessing()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const resetState = useCallback(() => {
    setIsProcessing(false)
    setProgress(0)
    setError(null)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const cancelProcessing = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.cancelProcessing()
    }
    resetState()
  }, [resetState])

  const processAudio = useCallback(async (audioBuffer: AudioBuffer): Promise<AnalysisResult> => {
    if (!processorRef.current) {
      throw new Error('Audio processor not initialized')
    }

    // Reset state for new processing
    resetState()
    setIsProcessing(true)
    setError(null)

    try {
      // Set up progress tracking
      const onProgress = (progressValue: number) => {
        setProgress(Math.min(100, Math.max(0, progressValue)))
      }

      // Set up timeout handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Audio processing timed out after 30 seconds'))
        }, timeoutMs)
      })

      // Process audio with progress tracking
      const processingPromise = processorRef.current.processAudio(audioBuffer, {
        timeoutMs,
        onProgress
      })

      // Race between processing and timeout
      const result = await Promise.race([processingPromise, timeoutPromise])

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      setProgress(100)
      setIsProcessing(false)
      setError(null)

      return result

    } catch (error) {
      // Handle different types of errors with more specific messages
      let errorMessage = 'Audio processing failed'
      
      if (error instanceof Error) {
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          errorMessage = 'Audio processing timed out after 30 seconds. Please try with a shorter audio file (under 5 minutes) or a less complex track.'
        } else if (error.message.includes('cancelled') || error.message.includes('aborted')) {
          errorMessage = 'Audio processing was cancelled'
        } else if (error.message.includes('Key detection failed') || error.message.includes('key')) {
          errorMessage = 'Unable to detect the musical key. The audio may not contain clear harmonic content or may be too noisy. Try using an instrumental track with distinct musical elements.'
        } else if (error.message.includes('BPM detection failed') || error.message.includes('bpm') || error.message.includes('tempo')) {
          errorMessage = 'Unable to detect the BPM. The audio may not have a clear rhythmic pattern or steady beat. Try using a track with a more prominent drum pattern.'
        } else if (error.message.includes('memory') || error.message.includes('Memory')) {
          errorMessage = 'Not enough memory to process this audio file. Try closing other browser tabs or using a smaller audio file.'
        } else if (error.message.includes('Worker') || error.message.includes('worker')) {
          errorMessage = 'Audio processing worker failed. This may be due to browser limitations or insufficient resources.'
        } else if (error.message.includes('AudioBuffer') || error.message.includes('audio buffer')) {
          errorMessage = 'Invalid audio data detected. The audio file may be corrupted or contain unsupported audio content.'
        } else {
          // Use the original error message if it's descriptive enough
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      setIsProcessing(false)
      setProgress(0)

      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      throw new Error(errorMessage)
    }
  }, [timeoutMs, resetState])

  return {
    processAudio,
    isProcessing,
    progress,
    error,
    cancelProcessing,
    resetState
  }
}

// Utility hook for processing state management
export function useProcessingState() {
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean
    progress: number
    error: string | null
    stage: 'idle' | 'loading' | 'analyzing' | 'complete' | 'error'
  }>({
    isProcessing: false,
    progress: 0,
    error: null,
    stage: 'idle'
  })

  const updateProcessingState = useCallback((updates: Partial<typeof processingState>) => {
    setProcessingState(prev => ({ ...prev, ...updates }))
  }, [])

  const resetProcessingState = useCallback(() => {
    setProcessingState({
      isProcessing: false,
      progress: 0,
      error: null,
      stage: 'idle'
    })
  }, [])

  return {
    processingState,
    updateProcessingState,
    resetProcessingState
  }
}