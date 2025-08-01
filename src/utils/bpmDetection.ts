// BPM detection module using essentia.js tempo estimation algorithms

import type { BPMResult } from '../types'
import { BPM_RANGE } from '../types'
import { EssentiaWASM, Essentia } from 'essentia.js'
import { calibrateBPMConfidence } from './accuracyCalibration'

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
      const rawConfidence = this.calculateConfidence(beats, bpm)
      
      // Apply calibration for improved accuracy
      const calibratedConfidence = calibrateBPMConfidence(rawConfidence, bpm, audioBuffer)
      
      onProgress?.(100)
      
      return {
        bpm: Math.round(bpm),
        confidence: calibratedConfidence,
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
   * Calculate confidence score based on beat consistency with improved calibration
   */
  private calculateConfidence(beats: Float32Array, bpm: number): number {
    if (beats.length < 2) {
      return 0.0
    }
    
    if (beats.length < 4) {
      return 0.2 // Low confidence for very few beats
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
    
    // Improved confidence calculation with multiple factors
    
    // Factor 1: Consistency (variance-based)
    const maxVariance = (expectedInterval * 0.15) ** 2 // Tighter tolerance for hip hop
    const consistencyScore = Math.max(0, 1 - (variance / maxVariance))
    
    // Factor 2: Number of beats (more beats = higher confidence)
    const beatCountScore = Math.min(1, beats.length / 20) // Optimal around 20+ beats
    
    // Factor 3: BPM range appropriateness for hip hop (80-180 BPM is typical)
    let bpmRangeScore = 1.0
    if (bpm < 70 || bpm > 190) {
      bpmRangeScore = 0.7 // Penalize extreme BPMs
    } else if (bpm >= 80 && bpm <= 160) {
      bpmRangeScore = 1.0 // Optimal range for hip hop
    } else {
      bpmRangeScore = 0.9 // Acceptable but not optimal
    }
    
    // Factor 4: Interval distribution (penalize outliers)
    intervals.sort((a, b) => a - b)
    const median = intervals[Math.floor(intervals.length / 2)]
    const outlierCount = intervals.filter(interval => 
      Math.abs(interval - median) > expectedInterval * 0.3
    ).length
    const outlierScore = Math.max(0.3, 1 - (outlierCount / intervals.length))
    
    // Combine factors with weights optimized for hip hop analysis
    const confidence = (
      consistencyScore * 0.4 +      // Most important: beat consistency
      beatCountScore * 0.2 +        // Number of detected beats
      bpmRangeScore * 0.2 +         // BPM range appropriateness
      outlierScore * 0.2            // Outlier penalty
    )
    
    return Math.max(0.1, Math.min(1, confidence))
  }

  /**
   * Fallback BPM detection using multiple algorithms and techniques
   */
  private async fallbackBPMDetection(audioBuffer: AudioBuffer, options: BPMDetectionOptions = {}): Promise<BPMResult> {
    const { onProgress } = options
    
    // Wait for essentia to initialize
    await this.initPromise
    
    // If essentia failed to initialize, try alternative methods
    if (!this.essentia) {
      onProgress?.(100)
      return this.basicBPMDetection(audioBuffer)
    }
    
    const fallbackMethods = [
      () => this.tryBeatTrackerMultiFeature(audioBuffer),
      () => this.tryTempoTapDegara(audioBuffer),
      () => this.basicBPMDetection(audioBuffer)
    ]
    
    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        onProgress?.(30 + (i * 20))
        const result = await fallbackMethods[i]()
        
        // Validate result quality
        if (this.isValidBPMResult(result)) {
          onProgress?.(100)
          return result
        }
      } catch (error) {
        console.warn(`Fallback method ${i + 1} failed:`, error)
        continue
      }
    }
    
    // All methods failed, return calibrated default
    onProgress?.(100)
    return this.getHipHopDefaultBPMResult(audioBuffer)
  }

  /**
   * Try BeatTrackerMultiFeature algorithm
   */
  private async tryBeatTrackerMultiFeature(audioBuffer: AudioBuffer): Promise<BPMResult> {
    if (!this.essentia) throw new Error('Essentia not initialized')
    
    const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
    if (!monoSignal || monoSignal.length === 0) {
      throw new Error('Failed to convert audio to mono signal')
    }
    
    const vectorSignal = this.essentia.arrayToVector(monoSignal)
    const beatResult = this.essentia.BeatTrackerMultiFeature(vectorSignal)
    
    const beats = this.essentia.vectorToArray(beatResult.ticks)
    const bpm = this.calculateBPMFromBeats(beats)
    const confidence = this.calculateConfidence(beats, bpm)
    
    return {
      bpm: Math.round(bpm),
      confidence,
      detectedBeats: beats.length
    }
  }

  /**
   * Try alternative tempo detection for hip hop analysis
   */
  private async tryTempoTapDegara(audioBuffer: AudioBuffer): Promise<BPMResult> {
    if (!this.essentia) throw new Error('Essentia not initialized')
    
    const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
    if (!monoSignal || monoSignal.length === 0) {
      throw new Error('Failed to convert audio to mono signal')
    }
    
    const vectorSignal = this.essentia.arrayToVector(monoSignal)
    
    // Use TempoTap as alternative for percussive content
    try {
      const tempoResult = this.essentia.TempoTap(vectorSignal)
      
      // TempoTap returns periods, convert to BPM
      const periods = this.essentia.vectorToArray(tempoResult.periods)
      let bpm = 120 // default
      
      if (periods.length > 0) {
        // Use the most common period
        const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length
        bpm = Math.round(60 / avgPeriod)
      }
      
      // Estimate beats based on tempo
      const estimatedBeats = Math.floor((audioBuffer.duration * bpm) / 60)
      const confidence = this.calculateTempoConfidence(bpm, audioBuffer.duration)
      
      return {
        bpm: Math.max(this.minBPM, Math.min(this.maxBPM, bpm)),
        confidence,
        detectedBeats: estimatedBeats
      }
    } catch (error) {
      // If TempoTap fails, use basic estimation
      const estimatedBPM = this.estimateBPMFromAudio(audioBuffer)
      const estimatedBeats = Math.floor((audioBuffer.duration * estimatedBPM) / 60)
      
      return {
        bpm: estimatedBPM,
        confidence: 0.3,
        detectedBeats: estimatedBeats
      }
    }
  }

  /**
   * Estimate BPM from audio characteristics
   */
  private estimateBPMFromAudio(audioBuffer: AudioBuffer): number {
    const duration = audioBuffer.duration
    
    // Hip hop BPM estimation based on duration and characteristics
    if (duration < 3) {
      return 140 // Shorter tracks often faster (trap style)
    } else if (duration > 8) {
      return 95  // Longer tracks often slower (boom bap style)
    } else {
      return 120 // Standard default
    }
  }

  /**
   * Basic BPM detection using onset detection when essentia.js fails
   */
  private basicBPMDetection(audioBuffer: AudioBuffer): BPMResult {
    try {
      // Simple onset detection based on energy changes
      const channelData = audioBuffer.getChannelData(0)
      const windowSize = 1024
      const hopSize = 512
      const onsets: number[] = []
      
      let prevEnergy = 0
      for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        let energy = 0
        for (let j = 0; j < windowSize; j++) {
          energy += channelData[i + j] ** 2
        }
        energy /= windowSize
        
        // Detect onset if energy increase is significant
        if (energy > prevEnergy * 1.5 && energy > 0.01) {
          onsets.push(i / audioBuffer.sampleRate)
        }
        prevEnergy = energy
      }
      
      if (onsets.length < 2) {
        return this.getHipHopDefaultBPMResult(audioBuffer)
      }
      
      // Calculate intervals and estimate BPM
      const intervals = []
      for (let i = 1; i < onsets.length; i++) {
        intervals.push(onsets[i] - onsets[i - 1])
      }
      
      intervals.sort((a, b) => a - b)
      const medianInterval = intervals[Math.floor(intervals.length / 2)]
      const bpm = Math.round(60 / medianInterval)
      
      return {
        bpm: Math.max(this.minBPM, Math.min(this.maxBPM, bpm)),
        confidence: 0.3, // Low confidence for basic method
        detectedBeats: onsets.length
      }
    } catch (error) {
      console.error('Basic BPM detection failed:', error)
      return this.getHipHopDefaultBPMResult(audioBuffer)
    }
  }

  /**
   * Calculate confidence for tempo-based detection
   */
  private calculateTempoConfidence(bpm: number, duration: number): number {
    // Base confidence on BPM range appropriateness and audio duration
    let confidence = 0.5
    
    // Hip hop BPM range bonus
    if (bpm >= 80 && bpm <= 160) {
      confidence += 0.3
    } else if (bpm >= 70 && bpm <= 180) {
      confidence += 0.1
    }
    
    // Duration bonus (longer audio = more reliable)
    if (duration >= 8) {
      confidence += 0.2
    } else if (duration >= 4) {
      confidence += 0.1
    }
    
    return Math.max(0.1, Math.min(1, confidence))
  }

  /**
   * Validate if BPM result is reasonable
   */
  private isValidBPMResult(result: BPMResult): boolean {
    return (
      result.bpm > 0 &&
      result.bpm >= this.minBPM &&
      result.bpm <= this.maxBPM &&
      result.confidence > 0.1 &&
      result.detectedBeats >= 0
    )
  }

  /**
   * Get hip hop optimized default BPM result
   */
  private getHipHopDefaultBPMResult(audioBuffer: AudioBuffer): BPMResult {
    // Analyze audio characteristics to provide better default
    const duration = audioBuffer.duration
    let defaultBPM = 120
    
    // Estimate BPM based on audio characteristics
    if (duration < 3) {
      defaultBPM = 140 // Shorter tracks often faster (trap style)
    } else if (duration > 8) {
      defaultBPM = 95  // Longer tracks often slower (boom bap style)
    }
    
    return {
      bpm: defaultBPM,
      confidence: 0.1, // Low confidence for default
      detectedBeats: Math.floor((duration * defaultBPM) / 60)
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