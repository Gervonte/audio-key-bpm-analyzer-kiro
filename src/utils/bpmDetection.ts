// BPM detection module using essentia.js tempo estimation algorithms

import type { BPMResult } from '../types'
import { BPM_RANGE } from '../types'
import { EssentiaWASM, Essentia } from 'essentia.js'

export interface BPMDetectionOptions {
  onProgress?: (progress: number) => void
}

/**
 * BPM Detection class using essentia.js tempo estimation algorithms
 */
export class BPMDetector {
  private essentia: Essentia | null = null
  private minBPM: number = BPM_RANGE.min
  private maxBPM: number = BPM_RANGE.max
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initializeEssentia()
  }

  private async initializeEssentia(): Promise<void> {
    try {
      // Wait for WASM module to be ready
      let wasmModule: any
      
      if (typeof EssentiaWASM === 'function') {
        // EssentiaWASM is a factory function that returns a promise
        wasmModule = await EssentiaWASM()
      } else {
        // EssentiaWASM might be the module itself
        wasmModule = EssentiaWASM
      }
      
      // Wait for the module to be ready if it has a ready promise
      if (wasmModule && wasmModule.ready) {
        wasmModule = await wasmModule.ready
      }
      
      this.essentia = new Essentia(wasmModule)
    } catch (error) {
      console.error('Failed to initialize Essentia:', error)
      // In test environments or when WASM fails to load, keep essentia as null
      this.essentia = null
    }
  }

  /**
   * Main method to detect BPM from an AudioBuffer using essentia.js
   */
  async detectBPM(audioBuffer: AudioBuffer, options: BPMDetectionOptions = {}): Promise<BPMResult> {
    const { onProgress } = options
    
    // Validate input
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        bpm: 120,
        confidence: 0.0,
        detectedBeats: 0
      }
    }
    
    // Wait for essentia to initialize
    await this.initPromise
    
    // If essentia failed to initialize, return default result
    if (!this.essentia) {
      onProgress?.(100)
      return {
        bpm: 120,
        confidence: 0.1,
        detectedBeats: 0
      }
    }
    
    try {
      onProgress?.(10)
      
      // Convert AudioBuffer to mono signal using essentia.js
      const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
      
      // Validate mono signal
      if (!monoSignal || monoSignal.length === 0) {
        throw new Error('Failed to convert audio to mono signal')
      }
      
      onProgress?.(30)
      
      // Use BeatTrackerDegara for fast and accurate BPM detection
      const vectorSignal = this.essentia.arrayToVector(monoSignal)
      const beatResult = this.essentia.BeatTrackerDegara(vectorSignal)
      
      onProgress?.(70)
      
      // Extract beat positions and calculate BPM
      const beats = this.essentia.vectorToArray(beatResult.ticks)
      const bpm = this.calculateBPMFromBeats(beats)
      const confidence = this.calculateConfidence(beats, bpm)
      
      onProgress?.(100)
      
      return {
        bpm: Math.round(bpm),
        confidence: Math.max(0, Math.min(1, confidence)),
        detectedBeats: beats.length
      }
    } catch (error) {
      console.error('BPM detection failed:', error)
      // Fallback to alternative method
      return this.fallbackBPMDetection(audioBuffer, options)
    }
  }

  /**
   * Calculate BPM from beat positions
   */
  private calculateBPMFromBeats(beats: Float32Array): number {
    if (beats.length < 2) {
      return 120 // Default fallback
    }
    
    // Calculate inter-beat intervals
    const intervals: number[] = []
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1])
    }
    
    if (intervals.length === 0) {
      return 120
    }
    
    // Calculate median interval to avoid outliers
    intervals.sort((a, b) => a - b)
    const medianInterval = intervals[Math.floor(intervals.length / 2)]
    
    // Convert interval to BPM
    const bpm = 60 / medianInterval
    
    // Clamp to valid range
    return Math.max(this.minBPM, Math.min(this.maxBPM, bpm))
  }

  /**
   * Calculate confidence score based on beat consistency
   */
  private calculateConfidence(beats: Float32Array, bpm: number): number {
    if (beats.length < 4) {
      return 0.1
    }
    
    // Calculate expected interval from BPM
    const expectedInterval = 60 / bpm
    
    // Calculate actual intervals
    const intervals: number[] = []
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1])
    }
    
    // Calculate variance from expected interval
    let variance = 0
    for (const interval of intervals) {
      const diff = interval - expectedInterval
      variance += diff * diff
    }
    variance /= intervals.length
    
    // Convert variance to confidence (lower variance = higher confidence)
    const maxVariance = (expectedInterval * 0.2) ** 2 // 20% tolerance
    const confidence = Math.max(0, 1 - (variance / maxVariance))
    
    return Math.min(1, confidence)
  }

  /**
   * Fallback BPM detection using BeatTrackerMultiFeature algorithm
   */
  private async fallbackBPMDetection(audioBuffer: AudioBuffer, options: BPMDetectionOptions = {}): Promise<BPMResult> {
    const { onProgress } = options
    
    // Wait for essentia to initialize
    await this.initPromise
    
    // If essentia failed to initialize, return default result
    if (!this.essentia) {
      onProgress?.(100)
      return {
        bpm: 120,
        confidence: 0.0,
        detectedBeats: 0
      }
    }
    
    try {
      onProgress?.(50)
      
      const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
      
      if (!monoSignal || monoSignal.length === 0) {
        throw new Error('Failed to convert audio to mono signal in fallback')
      }
      
      // Use BeatTrackerMultiFeature as fallback
      const vectorSignal = this.essentia.arrayToVector(monoSignal)
      const beatResult = this.essentia.BeatTrackerMultiFeature(vectorSignal)
      
      // Extract beat positions and calculate BPM
      const beats = this.essentia.vectorToArray(beatResult.ticks)
      const bpm = this.calculateBPMFromBeats(beats)
      const confidence = Math.max(0, Math.min(1, beatResult.confidence || 0.5))
      
      onProgress?.(100)
      
      return {
        bpm: Math.round(bpm),
        confidence,
        detectedBeats: beats.length
      }
    } catch (error) {
      console.error('Fallback BPM detection failed:', error)
      // Return a reasonable default when all methods fail
      return this.getDefaultBPMResult()
    }
  }

  /**
   * Get default BPM result when all detection methods fail
   */
  private getDefaultBPMResult(): BPMResult {
    return {
      bpm: 120, // Common default BPM
      confidence: 0.0,
      detectedBeats: 0
    }
  }

  /**
   * Set custom BPM range for detection
   */
  public setBPMRange(minBPM: number, maxBPM: number): void {
    this.minBPM = Math.max(30, minBPM)
    this.maxBPM = Math.min(300, maxBPM)
  }

  /**
   * Cleanup essentia instance
   */
  public cleanup(): void {
    if (this.essentia && typeof this.essentia.shutdown === 'function') {
      try {
        this.essentia.shutdown()
      } catch (error) {
        console.warn('Error during essentia cleanup:', error)
      }
    }
  }
}

/**
 * Factory function to create a BPMDetector instance
 */
export function createBPMDetector(): BPMDetector {
  return new BPMDetector()
}

/**
 * Utility function for quick BPM detection
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const detector = createBPMDetector()
  return detector.detectBPM(audioBuffer)
}