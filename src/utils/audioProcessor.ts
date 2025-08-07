// AudioProcessor class to coordinate key and BPM detection

import type { AnalysisResult, KeyResult, BPMResult, ConfidenceScores } from '../types'
import { KeyDetector } from './keyDetection'
import { BPMDetector } from './bpmDetection'
import { audioCache } from './audioCache'
import { memoryManager } from './memoryManager'

export interface AudioProcessorOptions {
  timeoutMs?: number
  onProgress?: (progress: number) => void
  file?: File // For caching purposes
  enableCaching?: boolean
}

export class AudioProcessor {
  private keyDetector: KeyDetector
  private bpmDetector: BPMDetector
  private abortController: AbortController | null = null

  constructor() {
    this.keyDetector = new KeyDetector()
    this.bpmDetector = new BPMDetector()
  }

  /**
   * Process audio buffer to detect both key and BPM
   */
  async processAudio(
    audioBuffer: AudioBuffer,
    options: AudioProcessorOptions = {}
  ): Promise<AnalysisResult> {
    const { timeoutMs = 30000, onProgress, file, enableCaching = true } = options
    const startTime = performance.now()

    // Check cache first if file is provided and caching is enabled
    if (enableCaching && file) {
      try {
        const cachedResult = await audioCache.get(file)
        if (cachedResult) {
          onProgress?.(100)
          return cachedResult
        }
      } catch (error) {
        console.warn('Cache lookup failed:', error)
      }
    }

    // Check memory before processing
    const estimatedMemory = memoryManager.estimateAudioBufferMemory(audioBuffer)
    if (!memoryManager.hasEnoughMemoryForProcessing(estimatedMemory)) {
      // Try to free up memory
      memoryManager.forceGarbageCollection()

      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 500))

      if (!memoryManager.hasEnoughMemoryForProcessing(estimatedMemory)) {
        throw new Error('Not enough memory to process this audio file. Try closing other browser tabs or using a smaller audio file.')
      }
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

      // Process audio with progress tracking
      const analysisPromise = this.performAnalysis(audioBuffer, onProgress)

      // Race between analysis and timeout
      const result = await Promise.race([analysisPromise, timeoutPromise])

      const processingTime = performance.now() - startTime
      const finalResult = {
        ...result,
        processingTime
      }

      // Cache the result if file is provided and caching is enabled
      if (enableCaching && file) {
        try {
          await audioCache.set(file, finalResult)
        } catch (error) {
          console.warn('Failed to cache result:', error)
        }
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
   * Preprocess audio exactly like the essentia.js web demo
   * This includes monomixing and downsampling to 16kHz
   */
  normalizeAudio(audioBuffer: AudioBuffer): AudioBuffer {
    // First, convert to mono using the same algorithm as the web demo
    const monoSignal = this.monomix(audioBuffer)

    // Then downsample to 16kHz using the same algorithm as the web demo
    const downsampledSignal = this.downsampleArray(monoSignal, audioBuffer.sampleRate, 16000)

    // Create a new AudioBuffer with the processed audio
    const processedBuffer = new AudioBuffer({
      numberOfChannels: 1, // Mono
      length: downsampledSignal.length,
      sampleRate: 16000 // 16kHz as per web demo
    })

    // Copy the processed signal to the buffer
    const channelData = processedBuffer.getChannelData(0)
    for (let i = 0; i < downsampledSignal.length; i++) {
      channelData[i] = downsampledSignal[i]
    }

    return processedBuffer
  }

  /**
   * Monomix using the exact same algorithm as the essentia.js web demo
   */
  private monomix(buffer: AudioBuffer): Float32Array {
    let monoAudio: Float32Array

    if (buffer.numberOfChannels > 1) {
      const leftCh = buffer.getChannelData(0)
      const rightCh = buffer.getChannelData(1)
      monoAudio = new Float32Array(leftCh.length)

      // Mix down to mono: 0.5 * (left + right)
      for (let i = 0; i < leftCh.length; i++) {
        monoAudio[i] = 0.5 * (leftCh[i] + rightCh[i])
      }
    } else {
      monoAudio = buffer.getChannelData(0)
    }

    return monoAudio
  }

  /**
   * Downsample array using the exact same algorithm as the essentia.js web demo
   */
  private downsampleArray(audioIn: Float32Array, sampleRateIn: number, sampleRateOut: number): Float32Array {
    if (sampleRateOut === sampleRateIn) {
      return audioIn
    }

    const sampleRateRatio = sampleRateIn / sampleRateOut
    const newLength = Math.round(audioIn.length / sampleRateRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetAudioIn = 0

    while (offsetResult < result.length) {
      const nextOffsetAudioIn = Math.round((offsetResult + 1) * sampleRateRatio)
      let accum = 0
      let count = 0

      for (let i = offsetAudioIn; i < nextOffsetAudioIn && i < audioIn.length; i++) {
        accum += audioIn[i]
        count++
      }

      result[offsetResult] = accum / count
      offsetResult++
      offsetAudioIn = nextOffsetAudioIn
    }

    return result
  }

  /**
   * Perform the actual analysis with progress tracking
   */
  private async performAnalysis(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void
  ): Promise<Omit<AnalysisResult, 'processingTime'>> {
    // Normalize audio first
    console.log('AudioProcessor: Starting analysis, calling onProgress(10)')
    onProgress?.(10)
    const normalizedBuffer = this.normalizeAudio(audioBuffer)

    // Check for cancellation
    if (this.abortController?.signal.aborted) {
      throw new Error('Audio processing was cancelled')
    }

    console.log('AudioProcessor: Normalization complete, calling onProgress(20)')
    onProgress?.(20)

    // Run key and BPM detection in parallel for better performance
    const [keyResult, bpmResult] = await Promise.all([
      this.detectKeyWithProgress(normalizedBuffer, onProgress, 20, 60),
      this.detectBPMWithProgress(normalizedBuffer, onProgress, 60, 90)
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
   * Detect key with progress reporting
   */
  private async detectKeyWithProgress(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void,
    startProgress: number = 0,
    endProgress: number = 50
  ): Promise<KeyResult> {
    const progressCallback = (progress: number) => {
      const scaledProgress = startProgress + (progress / 100) * (endProgress - startProgress)
      onProgress?.(scaledProgress)
    }

    try {
      return await this.keyDetector.detectKey(audioBuffer, { onProgress: progressCallback })
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw error
      }
      throw new Error(`Key detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect BPM with progress reporting
   */
  private async detectBPMWithProgress(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void,
    startProgress: number = 50,
    endProgress: number = 90
  ): Promise<BPMResult> {
    const progressCallback = (progress: number) => {
      const scaledProgress = startProgress + (progress / 100) * (endProgress - startProgress)
      onProgress?.(scaledProgress)
    }

    try {
      return await this.bpmDetector.detectBPM(audioBuffer, { onProgress: progressCallback })
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw error
      }
      throw new Error(`BPM detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.abortController = null
  }
}