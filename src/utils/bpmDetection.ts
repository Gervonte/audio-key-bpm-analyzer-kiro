// BPM detection module using essentia.js tempo estimation algorithms

import type { BPMResult } from '../types'
import { BPM_RANGE } from '../types'
import { essentiaManager } from './essentiaManager'
import { detectBPMFallback } from './fallbackBpmDetection'

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
      // Note: audioBuffer is already preprocessed (mono + 16kHz) by AudioProcessor
      let monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)

      // No additional preprocessing needed since AudioProcessor already handles it
      // monoSignal is already at 16kHz and mono as per web demo

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

      // Analyze BPM using multiple methods for better accuracy
      const bpmResults = await this.analyzeBPMWithMultipleMethods(essentia, monoSignal, audioBuffer.duration, onProgress)
      
      // Select the best result based on confidence and consistency
      const bestResult = this.selectBestBPMResult(bpmResults)
      onProgress?.(100)

      return bestResult
    } catch (error) {
      console.error('BPM detection failed:', error)
      // Use custom fallback algorithm that doesn't require essentia.js
      console.log('Using fallback BPM detection algorithm')
      return detectBPMFallback(audioBuffer, onProgress)
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

    // Calculate BPM from beat intervals with multiple methods
    const intervals: number[] = []
    for (let i = 1; i < ticks.length; i++) {
      intervals.push(ticks[i] - ticks[i - 1])
    }

    // Try different statistical measures to find the most likely BPM
    intervals.sort((a, b) => a - b)

    // Method 1: Median interval (most robust)
    const medianInterval = intervals[Math.floor(intervals.length / 2)]
    let bpm1 = medianInterval > 0 ? 60 / medianInterval : 120

    // Method 2: Mode of intervals (most common interval)
    const intervalCounts = new Map<number, number>()
    intervals.forEach(interval => {
      const rounded = Math.round(interval * 100) / 100 // Round to avoid floating point issues
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1)
    })

    let mostCommonInterval = medianInterval
    let maxCount = 0
    for (const [interval, count] of intervalCounts) {
      if (count > maxCount) {
        maxCount = count
        mostCommonInterval = interval
      }
    }

    let bpm2 = mostCommonInterval > 0 ? 60 / mostCommonInterval : 120

    // Choose the BPM that's more likely to be correct for hip-hop
    let finalBPM = bpm1

    // If the mode-based BPM is significantly different and in a better hip-hop range, use it
    const bpm1Adjusted = this.validateAndAdjustBPM(bpm1)
    const bpm2Adjusted = this.validateAndAdjustBPM(bpm2)

    // Prefer the BPM that's closer to common hip-hop ranges after adjustment
    const hipHopRange = [80, 180]
    const bpm1Distance = Math.min(Math.abs(bpm1Adjusted - hipHopRange[0]), Math.abs(bpm1Adjusted - hipHopRange[1]))
    const bpm2Distance = Math.min(Math.abs(bpm2Adjusted - hipHopRange[0]), Math.abs(bpm2Adjusted - hipHopRange[1]))

    if (bpm2Distance < bpm1Distance && Math.abs(bpm1Adjusted - bpm2Adjusted) > 10) {
      finalBPM = bpm2
    }

    // Validate BPM range and apply hip-hop specific adjustments
    finalBPM = this.validateAndAdjustBPM(finalBPM)

    // Adjust confidence based on consistency of intervals
    const intervalVariance = this.calculateIntervalVariance(intervals)
    let adjustedConfidence = Math.max(0, Math.min(1, confidence * (1 - intervalVariance)))

    // Boost confidence if we're in a common hip-hop BPM range
    if (finalBPM >= 80 && finalBPM <= 180) {
      adjustedConfidence = Math.min(1, adjustedConfidence * 1.2)
    }

    return {
      bpm: Math.round(finalBPM),
      confidence: adjustedConfidence,
      detectedBeats: ticks.length
    }
  }

  /**
   * Validate and adjust BPM for hip-hop music characteristics
   */
  private validateAndAdjustBPM(bpm: number): number {
    let adjustedBPM = bpm

    // Hip-hop specific BPM adjustments - handle common detection errors
    // Many hip-hop tracks are detected at half, double, or 1.5x tempo
    if (adjustedBPM < 50) {
      adjustedBPM *= 2 // Double if too slow
    } else if (adjustedBPM > 220) {
      adjustedBPM /= 2 // Halve if too fast
    } else if (adjustedBPM < 70) {
      // Check if doubling gets us to a more reasonable hip-hop range
      const doubled = adjustedBPM * 2
      if (doubled >= 120 && doubled <= 180) {
        adjustedBPM = doubled
      }
    } else if (adjustedBPM > 180) {
      // Check if halving gets us to a more reasonable hip-hop range
      const halved = adjustedBPM / 2
      if (halved >= 70 && halved <= 140) {
        adjustedBPM = halved
      }
    }

    // Handle 1.5x tempo detection (common with triplet-heavy hip-hop)
    if (adjustedBPM > 200 && adjustedBPM < 280) {
      const adjusted = adjustedBPM / 1.5
      if (adjusted >= 80 && adjusted <= 180) {
        adjustedBPM = adjusted
      }
    }

    // Clamp to valid range after adjustments
    if (adjustedBPM < this.minBPM) adjustedBPM = this.minBPM
    if (adjustedBPM > this.maxBPM) adjustedBPM = this.maxBPM

    // Snap to common hip-hop tempos with tolerance (expanded list)
    const commonHipHopBPMs = [
      65, 70, 75, 80, 85, 87, 90, 93, 95, 100, 105, 110, 115, 120,
      125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180
    ]
    const tolerance = 2

    for (const commonBPM of commonHipHopBPMs) {
      if (Math.abs(adjustedBPM - commonBPM) <= tolerance) {
        return commonBPM
      }
    }

    return Math.round(adjustedBPM)
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
   * Preprocess audio signal exactly like the essentia.js web demo
   */
  private preprocessAudioForBeatDetection(signal: Float32Array, sampleRate: number): Float32Array {
    // The web demo downsamples to 16kHz for BPM detection
    // If already at 16kHz, return as-is
    if (sampleRate === 16000) {
      return signal
    }
    
    // Downsample to 16kHz using the same algorithm as the web demo
    return this.downsampleArray(signal, sampleRate, 16000)
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
   * Analyze BPM using the exact same method as essentia.js web demo
   */
  private async analyzeBPMWithMultipleMethods(essentia: any, monoSignal: Float32Array, _duration: number, onProgress?: (progress: number) => void): Promise<any[]> {
    const results: any[] = []
    
    try {
      // Use exact same PercivalBpmEstimator as the web demo
      // essentia.PercivalBpmEstimator(vectorSignal, 1024, 2048, 128, 128, 210, 50, 16000).bpm
      const vectorSignal = essentia.arrayToVector(monoSignal)
      const bpmResult = essentia.PercivalBpmEstimator(
        vectorSignal,
        1024,  // frameSize
        2048,  // hopSize
        128,   // bufferSize
        128,   // minBpm
        210,   // maxBpm
        50,    // stepBpm
        16000  // sampleRate
      )
      
      // PercivalBpmEstimator returns an object with a bpm property
      const bpmValue = bpmResult.bpm || 120
      
      results.push({
        method: 'PercivalBpmEstimator_WebDemo',
        result: {
          bpm: Math.round(bpmValue),
          confidence: 0.8, // PercivalBpmEstimator doesn't provide confidence, use default
          detectedBeats: 0  // Not available from this algorithm
        },
        weight: 1.0
      })
      onProgress?.(70)
    } catch (error) {
      console.log('Web demo PercivalBpmEstimator failed, trying BeatTrackerMultiFeature:', error)
      
      // Fallback to BeatTrackerMultiFeature if PercivalBpmEstimator fails
      try {
        const fallbackResult = essentia.BeatTrackerMultiFeature(
          essentia.arrayToVector(monoSignal),
          this.maxBPM,
          this.minBPM
        )
        
        const fallbackBPM = this.parseEssentiaBeatResult(fallbackResult, essentia)
        results.push({
          method: 'BeatTrackerMultiFeature_Fallback',
          result: fallbackBPM,
          weight: 0.8
        })
      } catch (fallbackError) {
        console.log('BeatTrackerMultiFeature fallback also failed:', fallbackError)
      }
    }

    onProgress?.(90)
    return results
  }

  /**
   * Select the best BPM result from multiple analyses
   */
  private selectBestBPMResult(results: any[]): BPMResult {
    if (results.length === 0) {
      return {
        bpm: 120,
        confidence: 0.1,
        detectedBeats: 0
      }
    }

    // If we have multiple results, check for consistency
    if (results.length > 1) {
      const bpms = results.map(r => r.result.bpm)
      const tolerance = 5 // BPM tolerance for considering results consistent
      
      // Check if results are consistent (within tolerance)
      const isConsistent = bpms.every(bpm => Math.abs(bpm - bpms[0]) <= tolerance)
      
      if (isConsistent) {
        // Results agree - use weighted average and boost confidence
        const weightedBPM = results.reduce((sum, r) => sum + (r.result.bpm * r.weight), 0) / 
                           results.reduce((sum, r) => sum + r.weight, 0)
        
        const weightedConfidence = results.reduce((sum, r) => sum + (r.result.confidence * r.weight), 0) / 
                                  results.reduce((sum, r) => sum + r.weight, 0)
        
        const totalBeats = results.reduce((sum, r) => sum + r.result.detectedBeats, 0)
        
        return {
          bpm: Math.round(this.validateAndAdjustBPM(weightedBPM)),
          confidence: Math.min(1, weightedConfidence * 1.2), // Boost confidence for consistency
          detectedBeats: totalBeats
        }
      } else {
        // Results disagree - use the one with highest confidence but reduce confidence
        const bestResult = results.reduce((best, current) => 
          current.result.confidence > best.result.confidence ? current : best
        )
        
        return {
          bpm: bestResult.result.bpm,
          confidence: bestResult.result.confidence * 0.8, // Reduce confidence due to inconsistency
          detectedBeats: bestResult.result.detectedBeats
        }
      }
    }

    // Single result
    return results[0].result
  }

  // TODO: Re-implement filter methods without stack overflow
  // - applyHighPassFilter
  // - applyDynamicRangeCompression

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