// AudioProcessor class to coordinate key and BPM detection

import type { AnalysisResult, KeyResult, BPMResult, ConfidenceScores } from '../types'
import { KeyDetector } from './keyDetection'
import { BPMDetector } from './bpmDetection'

export interface AudioProcessorOptions {
  timeoutMs?: number
  onProgress?: (progress: number) => void
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
    const { timeoutMs = 30000, onProgress } = options
    const startTime = performance.now()

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
      return {
        ...result,
        processingTime
      }
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
   * Perform the actual analysis with progress tracking
   */
  private async performAnalysis(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number) => void
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