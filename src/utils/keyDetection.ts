import type { KeyResult } from '../types'
import { EssentiaWASM, Essentia } from 'essentia.js'

export interface KeyDetectionOptions {
  onProgress?: (progress: number) => void
}

export class KeyDetector {
  private essentia: Essentia

  constructor(_sampleRate: number = 44100) {
    this.essentia = new Essentia(EssentiaWASM)
  }

  /**
   * Main method to detect the musical key of an audio buffer using essentia.js
   */
  async detectKey(audioBuffer: AudioBuffer, options: KeyDetectionOptions = {}): Promise<KeyResult> {
    const { onProgress } = options
    try {
      onProgress?.(10)
      
      // Convert AudioBuffer to mono signal for essentia.js
      const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
      onProgress?.(30)
      
      // Use essentia.js KeyExtractor for comprehensive key detection
      const keyResult = this.essentia.KeyExtractor(
        this.essentia.arrayToVector(monoSignal)
      )
      onProgress?.(80)
      
      // Parse the key result
      const parsedResult = this.parseEssentiaKeyResult(keyResult)
      onProgress?.(100)
      
      return parsedResult
    } catch (error) {
      console.error('Key detection failed:', error)
      // Return a fallback result instead of throwing
      return {
        keyName: 'C Major',
        keySignature: 'C',
        confidence: 0.0,
        mode: 'major' as const
      }
    }
  }

  /**
   * Parse essentia.js KeyExtractor result into our KeyResult format
   */
  private parseEssentiaKeyResult(keyResult: any): KeyResult {
    // KeyExtractor returns: { key: string, scale: string, strength: number }
    const key = keyResult.key || 'C'
    const scale = keyResult.scale || 'major'
    const strength = keyResult.strength || 0
    
    // Convert essentia key format to our format
    const mode: 'major' | 'minor' = scale.toLowerCase() === 'minor' ? 'minor' : 'major'
    const keyName = `${key} ${mode === 'major' ? 'Major' : 'Minor'}`
    const keySignature = mode === 'minor' ? `${key}m` : key
    
    // Convert strength to confidence (0-1 range)
    const confidence = Math.max(0, Math.min(1, strength))
    
    return {
      keyName,
      keySignature,
      confidence,
      mode
    }
  }

  /**
   * Clean up essentia instance
   */
  destroy(): void {
    if (this.essentia) {
      this.essentia.shutdown()
      // Type assertion needed because essentia.js TypeScript definitions are incomplete
      ;(this.essentia as any).delete()
    }
  }
}