// BPM detection module using onset detection and tempo estimation algorithms

import type { BPMResult } from '../types'
import { BPM_RANGE } from '../types'
import { convertToMono, preprocessAudioBuffer } from './audioProcessing'

export interface OnsetData {
  times: number[]
  strengths: number[]
}

export interface TempoCandidate {
  bpm: number
  confidence: number
  score: number
}

/**
 * BPM Detection class that implements onset detection and tempo estimation
 */
export class BPMDetector {
  private sampleRate: number = 44100
  private hopSize: number = 512
  private frameSize: number = 2048
  private minBPM: number = BPM_RANGE.min
  private maxBPM: number = BPM_RANGE.max

  /**
   * Main method to detect BPM from an AudioBuffer
   */
  async detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
    try {
      // Preprocess audio: convert to mono and normalize
      const monoBuffer = convertToMono(audioBuffer)
      const processedBuffer = preprocessAudioBuffer(monoBuffer)
      
      this.sampleRate = processedBuffer.sampleRate
      
      // Extract onset times using spectral flux
      const onsetData = this.extractOnsets(processedBuffer)
      
      if (onsetData.times.length < 4) {
        return {
          bpm: 120, // Default fallback BPM
          confidence: 0.1,
          detectedBeats: onsetData.times.length
        }
      }
      
      // Calculate tempo using autocorrelation
      const tempoCandidates = this.calculateTempoCandidates(onsetData)
      
      // Select best tempo candidate
      const bestTempo = this.selectBestTempo(tempoCandidates)
      
      // Validate and filter BPM result
      const validatedBPM = this.validateBPM(bestTempo)
      
      return {
        bpm: Math.round(validatedBPM.bpm),
        confidence: validatedBPM.confidence,
        detectedBeats: onsetData.times.length
      }
    } catch (error) {
      console.error('BPM detection failed:', error)
      return {
        bpm: 120,
        confidence: 0.0,
        detectedBeats: 0
      }
    }
  }

  /**
   * Extract onset times using spectral flux method
   */
  private extractOnsets(audioBuffer: AudioBuffer): OnsetData {
    const audioData = audioBuffer.getChannelData(0)
    const onsetTimes: number[] = []
    const onsetStrengths: number[] = []
    
    // Calculate spectral flux for onset detection
    const windowSize = this.frameSize
    const hopSize = this.hopSize
    const numFrames = Math.floor((audioData.length - windowSize) / hopSize)
    
    let previousSpectrum: number[] = []
    
    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize
      const frameData = audioData.slice(startSample, startSample + windowSize)
      
      // Apply Hanning window
      const windowedFrame = this.applyHanningWindow(frameData)
      
      // Calculate magnitude spectrum using FFT approximation
      const spectrum = this.calculateMagnitudeSpectrum(windowedFrame)
      
      if (previousSpectrum.length > 0) {
        // Calculate spectral flux (positive differences)
        let flux = 0
        for (let bin = 0; bin < Math.min(spectrum.length, previousSpectrum.length); bin++) {
          const diff = spectrum[bin] - previousSpectrum[bin]
          if (diff > 0) {
            flux += diff
          }
        }
        
        // Peak picking for onset detection
        if (flux > 0) {
          const timeInSeconds = startSample / this.sampleRate
          onsetTimes.push(timeInSeconds)
          onsetStrengths.push(flux)
        }
      }
      
      previousSpectrum = spectrum
    }
    
    // Apply peak picking to reduce false positives
    return this.peakPicking({ times: onsetTimes, strengths: onsetStrengths })
  }

  /**
   * Apply Hanning window to audio frame
   */
  private applyHanningWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length)
    for (let i = 0; i < frame.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)))
      windowed[i] = frame[i] * windowValue
    }
    return windowed
  }

  /**
   * Calculate magnitude spectrum (simplified FFT approximation)
   */
  private calculateMagnitudeSpectrum(frame: Float32Array): number[] {
    const spectrum: number[] = []
    const numBins = Math.floor(frame.length / 2)
    
    // Simplified magnitude calculation using overlapping windows
    for (let bin = 0; bin < numBins; bin++) {
      let magnitude = 0
      const binSize = Math.floor(frame.length / numBins)
      const start = bin * binSize
      const end = Math.min(start + binSize, frame.length)
      
      for (let i = start; i < end; i++) {
        magnitude += Math.abs(frame[i])
      }
      
      spectrum.push(magnitude / binSize)
    }
    
    return spectrum
  }

  /**
   * Apply peak picking to onset detection results
   */
  private peakPicking(onsetData: OnsetData): OnsetData {
    const filteredTimes: number[] = []
    const filteredStrengths: number[] = []
    const minInterval = 0.05 // Minimum 50ms between onsets
    
    for (let i = 0; i < onsetData.times.length; i++) {
      const currentTime = onsetData.times[i]
      const currentStrength = onsetData.strengths[i]
      
      // Check if this is a local maximum
      let isLocalMax = true
      const windowSize = 3
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(onsetData.times.length - 1, i + windowSize); j++) {
        if (j !== i && onsetData.strengths[j] > currentStrength) {
          isLocalMax = false
          break
        }
      }
      
      // Check minimum interval constraint
      if (isLocalMax && (filteredTimes.length === 0 || currentTime - filteredTimes[filteredTimes.length - 1] > minInterval)) {
        filteredTimes.push(currentTime)
        filteredStrengths.push(currentStrength)
      }
    }
    
    return { times: filteredTimes, strengths: filteredStrengths }
  }  /**
 
  * Calculate tempo candidates using autocorrelation
   */
  private calculateTempoCandidates(onsetData: OnsetData): TempoCandidate[] {
    const candidates: TempoCandidate[] = []
    
    if (onsetData.times.length < 4) {
      return candidates
    }
    
    // Calculate inter-onset intervals (IOIs)
    const intervals: number[] = []
    for (let i = 1; i < onsetData.times.length; i++) {
      intervals.push(onsetData.times[i] - onsetData.times[i - 1])
    }
    
    // Create autocorrelation function for tempo estimation
    const maxLag = Math.floor(intervals.length / 2)
    const autocorrelation: number[] = []
    
    for (let lag = 1; lag <= maxLag; lag++) {
      let correlation = 0
      let count = 0
      
      for (let i = 0; i < intervals.length - lag; i++) {
        correlation += intervals[i] * intervals[i + lag]
        count++
      }
      
      if (count > 0) {
        autocorrelation.push(correlation / count)
      } else {
        autocorrelation.push(0)
      }
    }
    
    // Find peaks in autocorrelation that correspond to valid BPM ranges
    for (let lag = 1; lag < autocorrelation.length; lag++) {
      const correlation = autocorrelation[lag]
      
      // Calculate BPM from lag
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      const periodInSeconds = avgInterval * (lag + 1)
      const bpm = 60 / periodInSeconds
      
      // Check if BPM is in valid range
      if (bpm >= this.minBPM && bpm <= this.maxBPM) {
        // Check if this is a local maximum
        const isLocalMax = (lag === 0 || correlation > autocorrelation[lag - 1]) &&
                          (lag === autocorrelation.length - 1 || correlation > autocorrelation[lag + 1])
        
        if (isLocalMax && correlation > 0) {
          candidates.push({
            bpm,
            confidence: Math.min(correlation / Math.max(...autocorrelation), 1.0),
            score: correlation
          })
        }
      }
    }
    
    // Also try direct interval-to-BPM conversion
    const directCandidates = this.calculateDirectTempoCandidates(intervals)
    candidates.push(...directCandidates)
    
    // Sort by confidence score
    return candidates.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate tempo candidates directly from inter-onset intervals
   */
  private calculateDirectTempoCandidates(intervals: number[]): TempoCandidate[] {
    const candidates: TempoCandidate[] = []
    const bpmCounts = new Map<number, number>()
    
    // Convert intervals to BPM and count occurrences
    for (const interval of intervals) {
      if (interval > 0) {
        const bpm = Math.round(60 / interval)
        
        // Check multiples and subdivisions
        const bpmVariants = [
          bpm,
          Math.round(bpm * 2),   // Double time
          Math.round(bpm / 2),   // Half time
          Math.round(bpm * 1.5), // Dotted rhythm
          Math.round(bpm / 1.5)  // Inverse dotted
        ]
        
        for (const variant of bpmVariants) {
          if (variant >= this.minBPM && variant <= this.maxBPM) {
            bpmCounts.set(variant, (bpmCounts.get(variant) || 0) + 1)
          }
        }
      }
    }
    
    // Convert counts to candidates
    const totalIntervals = intervals.length
    for (const [bpm, count] of bpmCounts.entries()) {
      const confidence = count / totalIntervals
      if (confidence > 0.1) { // Minimum threshold
        candidates.push({
          bpm,
          confidence,
          score: count
        })
      }
    }
    
    return candidates
  }

  /**
   * Select the best tempo candidate from the list
   */
  private selectBestTempo(candidates: TempoCandidate[]): TempoCandidate {
    if (candidates.length === 0) {
      return { bpm: 120, confidence: 0.1, score: 0 }
    }
    
    // Sort by confidence and score
    const sortedCandidates = candidates.sort((a, b) => {
      // Prefer higher confidence, but also consider score
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff
      }
      return b.score - a.score
    })
    
    // Apply preference for common hip-hop BPM ranges
    const hipHopRanges = [
      { min: 70, max: 90, weight: 1.2 },   // Slow hip-hop
      { min: 90, max: 110, weight: 1.5 },  // Classic hip-hop
      { min: 130, max: 150, weight: 1.3 }, // Uptempo hip-hop
      { min: 160, max: 180, weight: 1.1 }  // Fast hip-hop
    ]
    
    for (const candidate of sortedCandidates) {
      for (const range of hipHopRanges) {
        if (candidate.bpm >= range.min && candidate.bpm <= range.max) {
          candidate.confidence *= range.weight
          candidate.score *= range.weight
        }
      }
    }
    
    // Re-sort after applying weights
    sortedCandidates.sort((a, b) => b.confidence - a.confidence)
    
    return sortedCandidates[0]
  }

  /**
   * Validate and filter BPM results within reasonable ranges
   */
  private validateBPM(candidate: TempoCandidate): TempoCandidate {
    let { bpm, confidence } = candidate
    
    // Clamp BPM to valid range
    if (bpm < this.minBPM) {
      bpm = this.minBPM
      confidence *= 0.5 // Reduce confidence for clamped values
    } else if (bpm > this.maxBPM) {
      bpm = this.maxBPM
      confidence *= 0.5
    }
    
    // Check for common tempo relationships and adjust if needed
    const commonTempos = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
    const tolerance = 3
    
    for (const commonTempo of commonTempos) {
      if (Math.abs(bpm - commonTempo) <= tolerance) {
        // Snap to common tempo and boost confidence slightly
        bpm = commonTempo
        confidence = Math.min(confidence * 1.1, 1.0)
        break
      }
    }
    
    // Ensure confidence is within valid range
    confidence = Math.max(0, Math.min(1, confidence))
    
    return { bpm, confidence, score: candidate.score }
  }

  /**
   * Set custom BPM range for detection
   */
  public setBPMRange(minBPM: number, maxBPM: number): void {
    this.minBPM = Math.max(30, minBPM)
    this.maxBPM = Math.min(300, maxBPM)
  }

  /**
   * Set custom analysis parameters
   */
  public setAnalysisParameters(frameSize: number, hopSize: number): void {
    this.frameSize = Math.max(512, frameSize)
    this.hopSize = Math.max(128, hopSize)
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