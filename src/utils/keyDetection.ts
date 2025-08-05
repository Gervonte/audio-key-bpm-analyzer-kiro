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
      // Note: audioBuffer is already preprocessed (mono + 16kHz) by AudioProcessor
      let monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)
      
      // No additional preprocessing needed since AudioProcessor already handles it
      // monoSignal is already at 16kHz and mono as per web demo
      
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
   * Analyze key using the exact same method as essentia.js web demo
   */
  private async analyzeKeyWithMultipleMethods(essentia: any, monoSignal: Float32Array, onProgress?: (progress: number) => void): Promise<any[]> {
    const results: any[] = []
    
    try {
      // Use exact same KeyExtractor parameters as the web demo
      // essentia.KeyExtractor(vectorSignal, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'bgate', 16000, 0.0001, 440, 'cosine', 'hann')
      const vectorSignal = essentia.arrayToVector(monoSignal)
      const keyResult = essentia.KeyExtractor(
        vectorSignal,
        true,    // pcpSize
        4096,    // frameSize
        4096,    // hopSize
        12,      // profileType
        3500,    // numHarmonics
        60,      // minFrequency
        25,      // maxFrequency
        0.2,     // spectralPeaksThreshold
        'bgate', // windowType
        16000,   // sampleRate
        0.0001,  // magnitudeThreshold
        440,     // tuningFrequency
        'cosine', // weightType
        'hann'   // windowType
      )
      
      results.push({
        method: 'KeyExtractor_WebDemo',
        result: keyResult,
        confidence: keyResult.strength || 0.5,
        weight: 1.0
      })
      onProgress?.(70)
    } catch (error) {
      console.log('Web demo KeyExtractor failed, trying default parameters:', error)
      
      // Fallback to default KeyExtractor if the specific parameters fail
      try {
        const vectorSignal = essentia.arrayToVector(monoSignal)
        const fallbackResult = essentia.KeyExtractor(vectorSignal)
        results.push({
          method: 'KeyExtractor_Default',
          result: fallbackResult,
          confidence: fallbackResult.strength || 0.5,
          weight: 0.8
        })
      } catch (fallbackError) {
        console.log('Default KeyExtractor also failed:', fallbackError)
      }
    }

    onProgress?.(90)
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