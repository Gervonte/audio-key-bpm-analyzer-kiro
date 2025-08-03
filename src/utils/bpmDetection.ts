// BPM detection module using essentia.js tempo estimation algorithms

import type { BPMResult } from '../types'
import { BPM_RANGE } from '../types'
import { essentiaManager } from './essentiaManager'

export interface BPMDetectionOptions {
  onProgress?: (progress: number) => void
}

/**
 * BPM Detection class using essentia.js algorithms
 */
export class BPMDetector {
  private minBPM: number = BPM_RANGE.min
  private maxBPM: number = BPM_RANGE.max

  constructor() {
    // Essentia will be managed by the singleton manager
  }

  /**
   * Main method to detect BPM from an AudioBuffer using essentia.js
   */
  async detectBPM(audioBuffer: AudioBuffer, options: BPMDetectionOptions = {}): Promise<BPMResult> {
    const { onProgress } = options
    try {
      // Get essentia instance from manager
      const essentia = await essentiaManager.getEssentia()

      onProgress?.(10)

      // Convert AudioBuffer to mono signal for essentia.js
      const monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)

      // Check if audio is silent (all zeros or very low energy)
      const totalEnergy = monoSignal.reduce((sum, sample) => sum + Math.abs(sample), 0)
      const avgEnergy = totalEnergy / monoSignal.length

      if (avgEnergy < 0.001) {
        onProgress?.(100)
        return {
          bpm: 120,
          confidence: 0.0,
          detectedBeats: 0
        }
      }

      onProgress?.(30)

      // Use essentia.js BeatTrackerMultiFeature for accurate BPM detection
      const beatResult = essentia.BeatTrackerMultiFeature(
        essentia.arrayToVector(monoSignal),
        this.maxBPM,
        this.minBPM
      )
      onProgress?.(70)

      // Parse the beat tracking result
      const bpmResult = this.parseEssentiaBeatResult(beatResult, essentia)
      onProgress?.(100)

      return bpmResult
    } catch (error) {
      console.error('BPM detection failed:', error)
      // Fallback to simpler beat tracker
      try {
        const essentia = await essentiaManager.getEssentia()
        const monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)
        const beatResult = essentia.BeatTrackerDegara(
          essentia.arrayToVector(monoSignal),
          this.maxBPM,
          this.minBPM
        )
        return this.parseEssentiaBeatResult(beatResult, essentia, true)
      } catch (fallbackError) {
        console.error('Fallback BPM detection also failed:', fallbackError)
        // Final fallback - return a reasonable default based on audio length
        const durationInSeconds = audioBuffer.length / audioBuffer.sampleRate
        const estimatedBPM = durationInSeconds > 0 ? Math.min(Math.max(60 / (durationInSeconds / 10), this.minBPM), this.maxBPM) : 120
        
        return {
          bpm: Math.round(estimatedBPM),
          confidence: 0.1,
          detectedBeats: 0
        }
      }
    }
  }

  /**
   * Parse essentia.js beat tracking result into our BPMResult format
   */
  private parseEssentiaBeatResult(beatResult: any, essentia: any, _isSimple: boolean = false): BPMResult {
    // BeatTrackerMultiFeature returns: { ticks: Float32Array, confidence: number }
    // BeatTrackerDegara returns: { ticks: Float32Array }
    const ticks = essentia.vectorToArray(beatResult.ticks || beatResult)
    const confidence = beatResult.confidence || 0.5

    // If we have very few beats or very low confidence, return fallback
    if (ticks.length < 2) {
      return {
        bpm: 120,
        confidence: 0.1,
        detectedBeats: ticks.length
      }
    }

    // For silent or very low energy audio, confidence will be very low
    if (confidence < 0.2) {
      return {
        bpm: 120,
        confidence: 0.0,
        detectedBeats: ticks.length
      }
    }

    // Calculate BPM from beat intervals
    const intervals: number[] = []
    for (let i = 1; i < ticks.length; i++) {
      intervals.push(ticks[i] - ticks[i - 1])
    }

    // Calculate median interval for more robust BPM estimation
    intervals.sort((a, b) => a - b)
    const medianInterval = intervals[Math.floor(intervals.length / 2)]

    // Convert interval to BPM
    let bpm = medianInterval > 0 ? 60 / medianInterval : 120

    // Validate BPM range and apply hip-hop specific adjustments
    bpm = this.validateAndAdjustBPM(bpm)

    // Adjust confidence based on consistency of intervals
    const intervalVariance = this.calculateIntervalVariance(intervals)
    const adjustedConfidence = Math.max(0, Math.min(1, confidence * (1 - intervalVariance)))

    return {
      bpm: Math.round(bpm),
      confidence: adjustedConfidence,
      detectedBeats: ticks.length
    }
  }

  /**
   * Validate and adjust BPM for hip-hop music characteristics
   */
  private validateAndAdjustBPM(bpm: number): number {
    // Clamp to valid range
    if (bpm < this.minBPM) bpm = this.minBPM
    if (bpm > this.maxBPM) bpm = this.maxBPM

    // Hip-hop specific BPM adjustments
    // Many hip-hop tracks are detected at half or double tempo
    if (bpm < 60) {
      bpm *= 2 // Double if too slow
    } else if (bpm > 200) {
      bpm /= 2 // Halve if too fast
    }

    // Snap to common hip-hop tempos with tolerance
    const commonHipHopBPMs = [70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150]
    const tolerance = 3

    for (const commonBPM of commonHipHopBPMs) {
      if (Math.abs(bpm - commonBPM) <= tolerance) {
        return commonBPM
      }
    }

    return bpm
  }

  /**
   * Calculate variance in beat intervals to assess tempo consistency
   */
  private calculateIntervalVariance(intervals: number[]): number {
    if (intervals.length < 2) return 1

    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length

    // Normalize variance to 0-1 range (higher variance = less consistent)
    return Math.min(1, variance / (mean * mean))
  }

  /**
   * Set custom BPM range for detection
   */
  public setBPMRange(minBPM: number, maxBPM: number): void {
    this.minBPM = Math.max(30, minBPM)
    this.maxBPM = Math.min(300, maxBPM)
  }

  /**
   * Clean up essentia instance (managed by singleton)
   */
  destroy(): void {
    // Cleanup is handled by the essentia manager
    // Individual instances don't need to clean up
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