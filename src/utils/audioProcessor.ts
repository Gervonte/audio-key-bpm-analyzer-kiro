// AudioProcessor class to coordinate key and BPM detection with optimizations

import type { AnalysisResult, KeyResult, BPMResult, ConfidenceScores } from '../types'
import { KeyDetector } from './keyDetection'
import { BPMDetector } from './bpmDetection'
import { workerManager } from './workerManager'
import { memoryManager } from './memoryManager'

export interface AudioProcessorOptions {
  timeoutMs?: number
  onProgress?: (progress: number) => void
  useCache?: boolean
  useWorkers?: boolean
}

export class AudioProcessor {
  private keyDetector: KeyDetector
  private bpmDetector: BPMDetector
  private abortController: AbortController | null = null
  private static workerPoolsInitialized = false

  constructor() {
    this.keyDetector = new KeyDetector()
    this.bpmDetector = new BPMDetector()
    this.initializeWorkerPools()
  }

  /**
   * Initialize worker pools for audio processing
   */
  private initializeWorkerPools(): void {
    if (AudioProcessor.workerPoolsInitialized) return

    try {
      // Create worker pools for key and BPM detection
      workerManager.createPool(
        'keyDetection',
        new URL('../workers/keyWorker.ts', import.meta.url).href,
        2 // Max 2 key detection workers
      )

      workerManager.createPool(
        'bpmDetection', 
        new URL('../workers/bpmWorker.ts', import.meta.url).href,
        2 // Max 2 BPM detection workers
      )

      AudioProcessor.workerPoolsInitialized = true
      console.log('Audio processing worker pools initialized')
    } catch (error) {
      console.warn('Failed to initialize worker pools, falling back to main thread:', error)
    }
  }

  /**
   * Process audio buffer to detect both key and BPM with caching and optimization
   */
  async processAudio(
    audioBuffer: AudioBuffer,
    options: AudioProcessorOptions = {}
  ): Promise<AnalysisResult> {
    const { timeoutMs = 30000, onProgress, useCache = true, useWorkers = true } = options
    const startTime = performance.now()

    // Generate cache key based on audio characteristics
    const cacheKey = this.generateCacheKey(audioBuffer)
    
    // Check cache first if enabled
    if (useCache) {
      const cachedResult = memoryManager.getCachedResult<AnalysisResult>(cacheKey)
      if (cachedResult) {
        console.log('Using cached analysis result')
        onProgress?.(100)
        return cachedResult
      }
    }

    // Check memory before processing
    if (memoryManager.isMemoryHigh()) {
      console.warn('High memory usage detected, triggering cleanup')
      memoryManager.forceGarbageCollection()
    }

    // Create abort controller for cancellation
    this.abortController = new AbortController()

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Audio processing timed out after 30 seconds'))
        }, timeoutMs)

        // Clear timeout if aborted
        this.abortController?.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          reject(new Error('Audio processing was cancelled'))
        })
      })

      // Process audio with progress tracking and worker optimization
      const analysisPromise = this.performAnalysis(audioBuffer, onProgress, useWorkers)

      // Race between analysis and timeout
      const result = await Promise.race([analysisPromise, timeoutPromise])

      const processingTime = performance.now() - startTime
      const finalResult = {
        ...result,
        processingTime
      }

      // Cache the result if enabled
      if (useCache) {
        const resultSize = memoryManager.estimateResultSize(finalResult)
        memoryManager.cacheResult(cacheKey, finalResult, resultSize)
      }

      return finalResult
    } catch (error) {
      // Clean up on error
      this.cleanup()
      
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Audio processing failed with unknown error')
    } finally {
      this.cleanup()
    }
  }

  /**
   * Cancel ongoing audio processing
   */
  cancelProcessing(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.cleanup()
  }

  /**
   * Get audio features for preprocessing
   */
  getAudioFeatures(audioBuffer: AudioBuffer): {
    duration: number
    sampleRate: number
    channels: number
    length: number
  } {
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    }
  }

  /**
   * Normalize audio buffer for consistent processing
   */
  normalizeAudio(audioBuffer: AudioBuffer): AudioBuffer {
    // Create a new AudioBuffer with the same properties
    const normalizedBuffer = new AudioBuffer({
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length,
      sampleRate: audioBuffer.sampleRate
    })

    // Process each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = normalizedBuffer.getChannelData(channel)

      // Find peak amplitude
      let peak = 0
      for (let i = 0; i < inputData.length; i++) {
        const abs = Math.abs(inputData[i])
        if (abs > peak) {
          peak = abs
        }
      }

      // Normalize to prevent clipping while maintaining dynamic range
      const normalizeRatio = peak > 0 ? Math.min(0.95 / peak, 1.0) : 1.0

      // Apply normalization
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * normalizeRatio
      }
    }

    return normalizedBuffer
  }

  /**
   * Perform the actual analysis with progress tracking and worker optimization
   */
  private async performAnalysis(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void,
    useWorkers: boolean = true
  ): Promise<Omit<AnalysisResult, 'processingTime'>> {
    // Normalize audio first
    onProgress?.(10)
    const normalizedBuffer = this.normalizeAudio(audioBuffer)

    // Check for cancellation
    if (this.abortController?.signal.aborted) {
      throw new Error('Audio processing was cancelled')
    }

    onProgress?.(20)

    // Run key and BPM detection in parallel for better performance
    const [keyResult, bpmResult] = await Promise.all([
      this.detectKeyWithProgress(normalizedBuffer, onProgress, 20, 60, useWorkers),
      this.detectBPMWithProgress(normalizedBuffer, onProgress, 60, 90, useWorkers)
    ])

    // Check for cancellation after detection
    if (this.abortController?.signal.aborted) {
      throw new Error('Audio processing was cancelled')
    }

    onProgress?.(95)

    // Calculate overall confidence
    const confidence: ConfidenceScores = {
      key: keyResult.confidence,
      bpm: bpmResult.confidence,
      overall: (keyResult.confidence + bpmResult.confidence) / 2
    }

    onProgress?.(100)

    return {
      key: keyResult,
      bpm: bpmResult,
      confidence
    }
  }

  /**
   * Detect key with progress reporting and optional worker usage
   */
  private async detectKeyWithProgress(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void,
    startProgress: number = 0,
    endProgress: number = 50,
    useWorkers: boolean = true
  ): Promise<KeyResult> {
    const progressCallback = (progress: number) => {
      const scaledProgress = startProgress + (progress / 100) * (endProgress - startProgress)
      onProgress?.(scaledProgress)
    }

    try {
      if (useWorkers && AudioProcessor.workerPoolsInitialized) {
        // Use worker pool for key detection
        return await this.detectKeyWithWorker(audioBuffer, progressCallback)
      } else {
        // Fall back to main thread
        return await this.keyDetector.detectKey(audioBuffer, { onProgress: progressCallback })
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw error
      }
      throw new Error(`Key detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect BPM with progress reporting and optional worker usage
   */
  private async detectBPMWithProgress(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void,
    startProgress: number = 50,
    endProgress: number = 90,
    useWorkers: boolean = true
  ): Promise<BPMResult> {
    const progressCallback = (progress: number) => {
      const scaledProgress = startProgress + (progress / 100) * (endProgress - startProgress)
      onProgress?.(scaledProgress)
    }

    try {
      if (useWorkers && AudioProcessor.workerPoolsInitialized) {
        // Use worker pool for BPM detection
        return await this.detectBPMWithWorker(audioBuffer, progressCallback)
      } else {
        // Fall back to main thread
        return await this.bpmDetector.detectBPM(audioBuffer, { onProgress: progressCallback })
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw error
      }
      throw new Error(`BPM detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect key using worker pool
   */
  private async detectKeyWithWorker(
    audioBuffer: AudioBuffer,
    _onProgress?: (progress: number) => void
  ): Promise<KeyResult> {
    // Prepare audio data for worker
    const channelData: Float32Array[] = []
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      channelData.push(new Float32Array(audioBuffer.getChannelData(channel)))
    }

    const audioData = {
      channelData,
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels
    }

    return await workerManager.executeTask<{ audioData: typeof audioData }, KeyResult>(
      'keyDetection',
      'DETECT_KEY',
      { audioData },
      30000
    )
  }

  /**
   * Detect BPM using worker pool
   */
  private async detectBPMWithWorker(
    audioBuffer: AudioBuffer,
    _onProgress?: (progress: number) => void
  ): Promise<BPMResult> {
    // Prepare audio data for worker
    const channelData: Float32Array[] = []
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      channelData.push(new Float32Array(audioBuffer.getChannelData(channel)))
    }

    const audioBufferData = {
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels,
      channelData
    }

    return await workerManager.executeTask<{ audioBufferData: typeof audioBufferData }, BPMResult>(
      'bpmDetection',
      'DETECT_BPM',
      { audioBufferData },
      30000
    )
  }

  /**
   * Generate cache key for audio buffer
   */
  private generateCacheKey(audioBuffer: AudioBuffer): string {
    // Create a hash based on audio characteristics
    const characteristics = {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    }
    
    // Simple hash of characteristics
    const hash = JSON.stringify(characteristics)
    return `audio_analysis_${btoa(hash).slice(0, 16)}`
  }

  /**
   * Clean up resources and memory
   */
  private cleanup(): void {
    this.abortController = null
    
    // Trigger garbage collection if memory is high
    if (memoryManager.isMemoryHigh()) {
      memoryManager.forceGarbageCollection()
    }
  }

  /**
   * Clean up all worker pools (call on app shutdown)
   */
  static cleanup(): void {
    try {
      workerManager.terminateAll()
      AudioProcessor.workerPoolsInitialized = false
    } catch (error) {
      console.warn('Error during AudioProcessor cleanup:', error)
    }
  }
}