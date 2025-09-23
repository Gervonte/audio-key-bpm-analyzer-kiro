/**
 * Demo Mode Hook
 * 
 * This hook manages demo mode state, sample selection, and integration
 * with the demo audio loader for the hip-hop instrumental demo feature.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { DemoSample } from '../types'
import { getAllSamples, getSampleById, getSamplesBySubgenre } from '../utils/demoSamples'
import { DemoAudioLoader, createFakeFileFromSample } from '../utils/demoAudioLoader'

export interface UseDemoModeOptions {
  autoPreload?: boolean
  preloadOnMount?: boolean
  cacheEnabled?: boolean
}

export interface UseDemoModeReturn {
  // State
  isDemoMode: boolean
  selectedSample: DemoSample | null
  availableSamples: DemoSample[]
  isLoading: boolean
  error: string | null
  
  // Actions
  toggleDemoMode: () => void
  selectSample: (sampleId: string) => Promise<void>
  clearSelection: () => void
  retryLoading: () => Promise<void>
  
  // Sample management
  getSampleById: (id: string) => DemoSample | null
  getSamplesBySubgenre: (subgenre: string) => DemoSample[]
  preloadSample: (sampleId: string) => Promise<void>
  preloadAllSamples: () => Promise<void>
  
  // Cache management
  clearCache: () => void
  getCacheStats: () => { cachedSamples: number; preloadedSamples: number; currentlyLoading: number; cacheKeys: string[]; preloadedKeys: string[] } | null
  
  // Integration helpers
  createFileFromSample: (sample: DemoSample) => File
  loadSampleAudio: (sample: DemoSample) => Promise<AudioBuffer>
}

/**
 * Hook for managing demo mode functionality
 */
export function useDemoMode(options: UseDemoModeOptions = {}): UseDemoModeReturn {
  const {
    autoPreload = false,
    preloadOnMount = false,
    cacheEnabled = true
  } = options

  // State
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [selectedSample, setSelectedSample] = useState<DemoSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSamples] = useState<DemoSample[]>(getAllSamples())

  // Refs
  const audioLoaderRef = useRef<DemoAudioLoader | null>(null)
  const loadingAbortControllerRef = useRef<AbortController | null>(null)

  // Initialize audio loader
  useEffect(() => {
    audioLoaderRef.current = new DemoAudioLoader()
    
    return () => {
      if (audioLoaderRef.current) {
        audioLoaderRef.current.cleanup()
      }
    }
  }, [])

  /**
   * Preload all samples
   */
  const preloadAllSamples = useCallback(async () => {
    if (!audioLoaderRef.current) {
      return
    }

    try {
      await audioLoaderRef.current.preloadSamples(availableSamples)
    } catch {
      // Failed to preload some samples
    }
  }, [availableSamples])

  // Preload samples on mount if enabled
  useEffect(() => {
    if (preloadOnMount && audioLoaderRef.current) {
      preloadAllSamples()
    }
  }, [preloadOnMount, preloadAllSamples])

  /**
   * Toggle demo mode on/off
   */
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newMode = !prev
      
      // Clear selection when switching modes
      if (!newMode) {
        setSelectedSample(null)
        setError(null)
      }
      
      return newMode
    })
  }, [])

  /**
   * Select a demo sample by ID
   */
  const selectSample = useCallback(async (sampleId: string) => {
    if (!audioLoaderRef.current) {
      const error = new Error('Audio loader not available')
      setError(error.message)
      throw error
    }

    const sample = getSampleById(sampleId)
    if (!sample) {
      const error = new Error(`Sample not found: ${sampleId}`)
      setError(error.message)
      throw error
    }

    setIsLoading(true)
    setError(null)
    setSelectedSample(sample)

    // Cancel any existing loading operation
    if (loadingAbortControllerRef.current) {
      loadingAbortControllerRef.current.abort()
    }

    // Create new abort controller for this operation
    const abortController = new AbortController()
    loadingAbortControllerRef.current = abortController

    try {
      // Load the sample audio
      await audioLoaderRef.current.loadSample(sample, {
        useCache: cacheEnabled,
        timeout: 10000
      })

      // Check if operation was aborted
      if (abortController.signal.aborted) {
        return
      }

      setSelectedSample(sample)
      setError(null)
    } catch (err) {
      if (abortController.signal.aborted) {
        // Even if aborted, we should still throw the error so handleDemoSampleSelect can catch it
        const errorMessage = err instanceof Error ? err.message : 'Operation was cancelled'
        setError(errorMessage)
        setSelectedSample(null)
        throw err
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load sample'
      setError(errorMessage)
      setSelectedSample(null)
      throw err // Re-throw the error so handleDemoSampleSelect can catch it
    } finally {
      setIsLoading(false)
      loadingAbortControllerRef.current = null
    }
  }, [cacheEnabled])

  /**
   * Clear current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedSample(null)
    setError(null)
    
    // Cancel any ongoing loading
    if (loadingAbortControllerRef.current) {
      loadingAbortControllerRef.current.abort()
      loadingAbortControllerRef.current = null
    }
  }, [])

  /**
   * Retry loading the current sample
   */
  const retryLoading = useCallback(async () => {
    if (selectedSample) {
      await selectSample(selectedSample.id)
    }
  }, [selectedSample, selectSample])

  /**
   * Get sample by ID
   */
  const getSampleByIdCallback = useCallback((id: string) => {
    return getSampleById(id)
  }, [])

  /**
   * Get samples by subgenre
   */
  const getSamplesBySubgenreCallback = useCallback((subgenre: string) => {
    return getSamplesBySubgenre(subgenre)
  }, [])

  /**
   * Preload a specific sample
   */
  const preloadSample = useCallback(async (sampleId: string) => {
    if (!audioLoaderRef.current) {
      return
    }

    const sample = getSampleById(sampleId)
    if (!sample) {
      return
    }

    try {
      await audioLoaderRef.current.loadSample(sample, { useCache: true })
    } catch {
      // Failed to preload sample
    }
  }, [])

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    if (audioLoaderRef.current) {
      audioLoaderRef.current.clearCache()
    }
  }, [])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    if (!audioLoaderRef.current) {
      return null
    }
    return audioLoaderRef.current.getCacheStats()
  }, [])

  /**
   * Create a fake File object from a sample (for integration with existing pipeline)
   */
  const createFileFromSample = useCallback((sample: DemoSample) => {
    return createFakeFileFromSample(sample)
  }, [])

  /**
   * Load sample audio and return AudioBuffer
   */
  const loadSampleAudio = useCallback(async (sample: DemoSample): Promise<AudioBuffer> => {
    if (!audioLoaderRef.current) {
      throw new Error('Audio loader not available')
    }

    const result = await audioLoaderRef.current.loadSample(sample, {
      useCache: cacheEnabled,
      timeout: 10000
    })

    return result.audioBuffer
  }, [cacheEnabled])

  // Auto-preload selected sample if enabled
  useEffect(() => {
    if (autoPreload && selectedSample && audioLoaderRef.current) {
      preloadSample(selectedSample.id)
    }
  }, [autoPreload, selectedSample, preloadSample])

  return {
    // State
    isDemoMode,
    selectedSample,
    availableSamples,
    isLoading,
    error,
    
    // Actions
    toggleDemoMode,
    selectSample,
    clearSelection,
    retryLoading,
    
    // Sample management
    getSampleById: getSampleByIdCallback,
    getSamplesBySubgenre: getSamplesBySubgenreCallback,
    preloadSample,
    preloadAllSamples,
    
    // Cache management
    clearCache,
    getCacheStats,
    
    // Integration helpers
    createFileFromSample,
    loadSampleAudio
  }
}

export default useDemoMode
