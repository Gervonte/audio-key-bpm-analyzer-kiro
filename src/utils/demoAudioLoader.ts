/**
 * Demo Audio Loader
 * 
 * This module handles loading and caching of demo sample audio files.
 * It provides efficient loading, caching, and preloading capabilities
 * for hip-hop instrumental demo samples.
 */

import type { DemoSample } from './demoSamples'

export interface AudioLoadingOptions {
  useCache?: boolean
  preload?: boolean
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface LoadingProgress {
  loaded: number
  total: number
  percentage: number
  currentFile?: string
}

export interface AudioLoadingResult {
  audioBuffer: AudioBuffer
  sample: DemoSample
  loadTime: number
  fromCache: boolean
}

/**
 * Demo Audio Loader Class
 * 
 * Handles loading, caching, and preloading of demo sample audio files.
 * Uses Web Audio API for audio processing and provides efficient caching.
 */
export class DemoAudioLoader {
  private cache: Map<string, AudioBuffer> = new Map()
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map()
  private audioContext: AudioContext | null = null
  private preloadedSamples: Set<string> = new Set()

  constructor() {
    this.initializeAudioContext()
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      // Create audio context with proper error handling
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Handle suspended context (user interaction required)
      if (this.audioContext.state === 'suspended') {
        console.log('Audio context suspended, will resume on user interaction')
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      throw new Error('Web Audio API not supported in this browser')
    }
  }

  /**
   * Ensure audio context is running
   */
  private async ensureAudioContextRunning(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext()
    }

    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume()
    }
  }

  /**
   * Load a demo sample audio file with comprehensive error handling
   */
  async loadSample(
    sample: DemoSample, 
    options: AudioLoadingOptions = {}
  ): Promise<AudioLoadingResult> {
    const startTime = performance.now()
    const { 
      useCache = true, 
      timeout = 10000, 
      retryAttempts = 1, 
      retryDelay = 1000 
    } = options

    // Check cache first
    if (useCache && this.cache.has(sample.id)) {
      const audioBuffer = this.cache.get(sample.id)!
      return {
        audioBuffer,
        sample,
        loadTime: performance.now() - startTime,
        fromCache: true
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(sample.id)) {
      const audioBuffer = await this.loadingPromises.get(sample.id)!
      return {
        audioBuffer,
        sample,
        loadTime: performance.now() - startTime,
        fromCache: false
      }
    }

    // Start loading with retry logic
    const loadingPromise = this.loadAudioFileWithRetry(sample, timeout, retryAttempts, retryDelay)
    this.loadingPromises.set(sample.id, loadingPromise)

    try {
      const audioBuffer = await loadingPromise
      
      // Cache the result
      if (useCache) {
        this.cache.set(sample.id, audioBuffer)
      }

      // Clean up loading promise
      this.loadingPromises.delete(sample.id)

      return {
        audioBuffer,
        sample,
        loadTime: performance.now() - startTime,
        fromCache: false
      }
    } catch (error) {
      // Clean up loading promise on error
      this.loadingPromises.delete(sample.id)
      throw error
    }
  }

  /**
   * Load audio file with retry logic
   */
  private async loadAudioFileWithRetry(
    sample: DemoSample, 
    timeout: number, 
    retryAttempts: number, 
    retryDelay: number
  ): Promise<AudioBuffer> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await this.loadAudioFile(sample, timeout)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retryAttempts) {
          console.warn(`Attempt ${attempt} failed for sample ${sample.id}, retrying in ${retryDelay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          // Exponential backoff
          retryDelay *= 1.5
        }
      }
    }
    
    // All attempts failed
    throw new Error(`Failed to load sample ${sample.id} after ${retryAttempts} attempts. Last error: ${lastError?.message}`)
  }

  /**
   * Load audio file from URL
   */
  private async loadAudioFile(sample: DemoSample, timeout: number): Promise<AudioBuffer> {
    await this.ensureAudioContextRunning()

    if (!this.audioContext) {
      throw new Error('Audio context not available')
    }

    try {
      // Validate file path
      if (!sample.filePath || !sample.filePath.startsWith('/')) {
        throw new Error(`Invalid file path: ${sample.filePath}`)
      }

      // Fetch audio file with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(sample.filePath, {
        signal: controller.signal,
        headers: {
          'Accept': 'audio/mpeg,audio/wav,audio/flac,audio/mp4',
          'Cache-Control': 'max-age=3600' // Cache for 1 hour
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Demo sample file not found: ${sample.filePath}`)
        } else if (response.status === 403) {
          throw new Error(`Access denied to demo sample: ${sample.filePath}`)
        } else if (response.status >= 500) {
          throw new Error(`Server error loading demo sample: ${response.status}`)
        } else {
          throw new Error(`Failed to load audio file: ${response.status} ${response.statusText}`)
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      
      // Validate array buffer
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Received empty audio file')
      }

      // Decode audio data with error handling
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.duration === 0) {
        throw new Error('Invalid audio data: zero duration')
      }

      if (audioBuffer.numberOfChannels === 0) {
        throw new Error('Invalid audio data: no channels')
      }

      return audioBuffer
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Audio loading timeout after ${timeout}ms`)
        } else if (error.name === 'EncodingError') {
          throw new Error(`Audio format not supported or corrupted: ${sample.filePath}`)
        } else if (error.name === 'NotSupportedError') {
          throw new Error(`Audio format not supported by browser: ${sample.filePath}`)
        } else if (error.message.includes('NetworkError')) {
          throw new Error(`Network error loading demo sample: ${sample.filePath}`)
        }
        throw new Error(`Failed to load audio: ${error.message}`)
      }
      throw new Error('Unknown error occurred while loading audio')
    }
  }

  /**
   * Preload multiple samples with lazy loading optimization
   */
  async preloadSamples(
    samples: DemoSample[], 
    onProgress?: (progress: LoadingProgress) => void,
    options: { maxConcurrent?: number; priority?: string[] } = {}
  ): Promise<void> {
    const { maxConcurrent = 3, priority = [] } = options
    const total = samples.length
    let loaded = 0

    // Sort samples by priority (priority samples first)
    const sortedSamples = [...samples].sort((a, b) => {
      const aIndex = priority.indexOf(a.id)
      const bIndex = priority.indexOf(b.id)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    // Process samples in batches to limit concurrent requests
    for (let i = 0; i < sortedSamples.length; i += maxConcurrent) {
      const batch = sortedSamples.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async (sample) => {
        try {
          await this.loadSample(sample, { useCache: true })
          this.preloadedSamples.add(sample.id)
          loaded++
          
          if (onProgress) {
            onProgress({
              loaded,
              total,
              percentage: Math.round((loaded / total) * 100),
              currentFile: sample.name
            })
          }
        } catch (error) {
          console.warn(`Failed to preload sample ${sample.id}:`, error)
          loaded++
          
          if (onProgress) {
            onProgress({
              loaded,
              total,
              percentage: Math.round((loaded / total) * 100),
              currentFile: sample.name
            })
          }
        }
      })

      await Promise.allSettled(batchPromises)
      
      // Small delay between batches to prevent overwhelming the browser
      if (i + maxConcurrent < sortedSamples.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Lazy load a sample (load only when needed)
   */
  async lazyLoadSample(sample: DemoSample): Promise<AudioBuffer> {
    // Check if already cached
    if (this.cache.has(sample.id)) {
      return this.cache.get(sample.id)!
    }

    // Check if already loading
    if (this.loadingPromises.has(sample.id)) {
      return this.loadingPromises.get(sample.id)!
    }

    // Start loading with lower priority
    const loadingPromise = this.loadAudioFile(sample, 5000) // Shorter timeout for lazy loading
    this.loadingPromises.set(sample.id, loadingPromise)

    try {
      const audioBuffer = await loadingPromise
      
      // Cache the result
      this.cache.set(sample.id, audioBuffer)
      this.preloadedSamples.add(sample.id)

      // Clean up loading promise
      this.loadingPromises.delete(sample.id)

      return audioBuffer
    } catch (error) {
      // Clean up loading promise on error
      this.loadingPromises.delete(sample.id)
      throw error
    }
  }

  /**
   * Check if sample is preloaded
   */
  isPreloaded(sampleId: string): boolean {
    return this.preloadedSamples.has(sampleId)
  }

  /**
   * Check if sample is cached
   */
  isCached(sampleId: string): boolean {
    return this.cache.has(sampleId)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedSamples: this.cache.size,
      preloadedSamples: this.preloadedSamples.size,
      currentlyLoading: this.loadingPromises.size,
      cacheKeys: Array.from(this.cache.keys()),
      preloadedKeys: Array.from(this.preloadedSamples)
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.preloadedSamples.clear()
  }

  /**
   * Remove specific sample from cache
   */
  removeFromCache(sampleId: string): void {
    this.cache.delete(sampleId)
    this.preloadedSamples.delete(sampleId)
  }

  /**
   * Get estimated cache size in bytes
   */
  getEstimatedCacheSize(): number {
    let totalSize = 0
    
    this.cache.forEach((audioBuffer) => {
      // Rough estimation: sampleRate * channels * duration * 4 bytes per sample
      const size = audioBuffer.sampleRate * audioBuffer.numberOfChannels * audioBuffer.duration * 4
      totalSize += size
    })
    
    return totalSize
  }

  /**
   * Optimize cache by removing least recently used samples
   */
  optimizeCache(maxSizeBytes: number = 50 * 1024 * 1024): void { // 50MB default
    const currentSize = this.getEstimatedCacheSize()
    
    if (currentSize <= maxSizeBytes) {
      return // Cache is within limits
    }

    // Simple LRU: remove oldest samples (first in cache)
    const samplesToRemove: string[] = []
    let sizeToRemove = currentSize - maxSizeBytes
    
    for (const [sampleId, audioBuffer] of this.cache) {
      const sampleSize = audioBuffer.sampleRate * audioBuffer.numberOfChannels * audioBuffer.duration * 4
      samplesToRemove.push(sampleId)
      sizeToRemove -= sampleSize
      
      if (sizeToRemove <= 0) {
        break
      }
    }

    // Remove samples from cache
    samplesToRemove.forEach(sampleId => {
      this.cache.delete(sampleId)
      this.preloadedSamples.delete(sampleId)
    })

    console.log(`Cache optimized: removed ${samplesToRemove.length} samples, freed ${currentSize - this.getEstimatedCacheSize()} bytes`)
  }

  /**
   * Preload critical samples (most commonly used)
   */
  async preloadCriticalSamples(samples: DemoSample[]): Promise<void> {
    // Identify critical samples (smaller files, commonly used subgenres)
    const criticalSamples = samples
      .filter(sample => sample.fileSize < 2 * 1024 * 1024) // Under 2MB
      .sort((a, b) => a.fileSize - b.fileSize) // Smallest first
    
    if (criticalSamples.length > 0) {
      console.log(`Preloading ${criticalSamples.length} critical samples...`)
      await this.preloadSamples(criticalSamples, undefined, { maxConcurrent: 2 })
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCache()
    this.loadingPromises.clear()
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    
    this.audioContext = null
  }
}

/**
 * Utility function to create a fake File object from a DemoSample
 * This allows demo samples to work with the existing file upload pipeline
 */
export function createFakeFileFromSample(sample: DemoSample): File {
  // Create a minimal File object that can be used with the existing pipeline
  const blob = new Blob([''], { type: 'audio/mpeg' })
  
  return new File([blob], sample.name, {
    type: 'audio/mpeg',
    lastModified: Date.now()
  })
}

/**
 * Utility function to validate if a file path exists
 */
export async function validateSampleFile(sample: DemoSample): Promise<boolean> {
  try {
    const response = await fetch(sample.filePath, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Default instance for easy access
 */
export const demoAudioLoader = new DemoAudioLoader()
