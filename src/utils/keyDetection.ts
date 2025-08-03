import type { KeyResult } from '../types'
import { essentiaManager } from './essentiaManager'
import { detectKeyFallback } from './fallbackKeyDetection'

export interface KeyDetectionOptions {
  onProgress?: (progress: number) => void
}

export class KeyDetector {
  constructor(_sampleRate: number = 44100) {
    // Essentia will be managed by the singleton manager
  }

  /**
   * Main method to detect the musical key of an audio buffer using essentia.js
   */
  async detectKey(audioBuffer: AudioBuffer, options: KeyDetectionOptions = {}): Promise<KeyResult> {
    const { onProgress } = options
    try {
      // Get essentia instance from manager
      const essentia = await essentiaManager.getEssentia()

      onProgress?.(10)

      // Convert AudioBuffer to mono signal for essentia.js
      let monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)
      
      // Apply custom preprocessing for better key detection
      monoSignal = this.preprocessAudioForKeyDetection(monoSignal, audioBuffer.sampleRate)
      
      onProgress?.(30)

      // Analyze key using multiple methods for better accuracy
      const keyResults = await this.analyzeKeyWithMultipleMethods(essentia, monoSignal, onProgress)
      
      // Select the best result based on confidence and consistency
      const bestResult = this.selectBestKeyResult(keyResults)
      onProgress?.(100)

      return bestResult
    } catch (error) {
      console.error('Key detection failed:', error)
      // Use fallback custom algorithm
      console.log('Using fallback key detection algorithm')
      return detectKeyFallback(audioBuffer, onProgress)
    }
  }

  /**
   * Parse essentia.js Key/KeyExtractor result into our KeyResult format
   */
  private parseEssentiaKeyResult(keyResult: any, confidence?: number): KeyResult {
    // Key algorithm returns: { key: string, scale: string, strength: number }
    // KeyExtractor returns: { key: string, scale: string, strength: number }
    const key = keyResult.key || 'C'
    const scale = keyResult.scale || 'major'
    const strength = confidence !== undefined ? confidence : (keyResult.strength || 0)

    // Convert essentia key format to our format
    const mode: 'major' | 'minor' = scale.toLowerCase() === 'minor' ? 'minor' : 'major'
    const keyName = `${key} ${mode === 'major' ? 'Major' : 'Minor'}`
    const keySignature = mode === 'minor' ? `${key}m` : key

    // Convert strength to confidence (0-1 range) and boost it slightly for better UX
    let finalConfidence = Math.max(0, Math.min(1, strength))
    
    // Apply confidence boost for common keys in hip-hop
    const commonHipHopKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
    if (commonHipHopKeys.includes(key)) {
      finalConfidence = Math.min(1, finalConfidence * 1.2)
    }

    return {
      keyName,
      keySignature,
      confidence: finalConfidence,
      mode
    }
  }

  /**
   * Preprocess audio signal for better key detection
   */
  private preprocessAudioForKeyDetection(signal: Float32Array, _sampleRate: number): Float32Array {
    // Temporarily disable custom preprocessing to avoid stack overflow
    // TODO: Fix filter implementations
    
    // Just normalize the signal for now
    const processedSignal = new Float32Array(signal)
    
    // Find max value without using spread operator to avoid stack overflow
    let maxValue = 0
    for (let i = 0; i < processedSignal.length; i++) {
      const absValue = Math.abs(processedSignal[i])
      if (absValue > maxValue) {
        maxValue = absValue
      }
    }
    
    // Normalize if max value is greater than 0
    if (maxValue > 0) {
      for (let i = 0; i < processedSignal.length; i++) {
        processedSignal[i] = processedSignal[i] / maxValue
      }
    }
    
    return processedSignal
  }

  /**
   * Analyze key using multiple methods and segments for better accuracy
   */
  private async analyzeKeyWithMultipleMethods(essentia: any, monoSignal: Float32Array, onProgress?: (progress: number) => void): Promise<any[]> {
    const results: any[] = []
    
    try {
      // Method 1: Full signal analysis with KeyExtractor
      const fullResult = essentia.KeyExtractor(essentia.arrayToVector(monoSignal))
      results.push({
        method: 'KeyExtractor_Full',
        result: fullResult,
        confidence: fullResult.strength || 0.5,
        weight: 1.0
      })
      onProgress?.(50)
    } catch (error) {
      console.log('KeyExtractor failed:', error)
    }

    try {
      // Method 2: Analyze middle segment (often most stable)
      const segmentStart = Math.floor(monoSignal.length * 0.25)
      const segmentEnd = Math.floor(monoSignal.length * 0.75)
      const middleSegment = monoSignal.slice(segmentStart, segmentEnd)
      
      const segmentResult = essentia.KeyExtractor(essentia.arrayToVector(middleSegment))
      results.push({
        method: 'KeyExtractor_Middle',
        result: segmentResult,
        confidence: segmentResult.strength || 0.5,
        weight: 0.8
      })
      onProgress?.(70)
    } catch (error) {
      console.log('Middle segment analysis failed:', error)
    }

    return results
  }

  /**
   * Select the best key result from multiple analyses
   */
  private selectBestKeyResult(results: any[]): KeyResult {
    if (results.length === 0) {
      return {
        keyName: 'C Major',
        keySignature: 'C',
        confidence: 0.1,
        mode: 'major' as const
      }
    }

    // If we have multiple results, check for consistency
    if (results.length > 1) {
      const keys = results.map(r => r.result.key)
      const scales = results.map(r => r.result.scale)
      
      // Check if results agree on key and scale
      const keyConsistency = keys.every(k => k === keys[0])
      const scaleConsistency = scales.every(s => s === scales[0])
      
      if (keyConsistency && scaleConsistency) {
        // Results agree - boost confidence and use weighted average
        const weightedConfidence = results.reduce((sum, r) => sum + (r.confidence * r.weight), 0) / 
                                  results.reduce((sum, r) => sum + r.weight, 0)
        
        return this.parseEssentiaKeyResult(results[0].result, Math.min(1, weightedConfidence * 1.2))
      } else {
        // Results disagree - use the one with highest confidence
        const bestResult = results.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        )
        return this.parseEssentiaKeyResult(bestResult.result, bestResult.confidence * 0.8) // Reduce confidence due to inconsistency
      }
    }

    // Single result
    return this.parseEssentiaKeyResult(results[0].result, results[0].confidence)
  }

  // TODO: Re-implement filter methods without stack overflow
  // - applyBandPassFilter
  // - applyHighPassFilter  
  // - applyLowPassFilter
  // - applyGentleCompression

  /**
   * Clean up essentia instance (managed by singleton)
   */
  destroy(): void {
    // Cleanup is handled by the essentia manager
    // Individual instances don't need to clean up
  }
}