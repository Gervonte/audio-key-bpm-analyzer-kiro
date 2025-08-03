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
      const monoSignal = essentia.audioBufferToMonoSignal(audioBuffer)
      onProgress?.(30)

      // Use essentia.js KeyExtractor for comprehensive key detection
      const keyResult = essentia.KeyExtractor(
        essentia.arrayToVector(monoSignal)
      )
      onProgress?.(80)

      // Parse the key result
      const parsedResult = this.parseEssentiaKeyResult(keyResult)
      onProgress?.(100)

      return parsedResult
    } catch (error) {
      console.error('Key detection failed:', error)
      // Use fallback custom algorithm
      console.log('Using fallback key detection algorithm')
      return detectKeyFallback(audioBuffer, onProgress)
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
   * Clean up essentia instance (managed by singleton)
   */
  destroy(): void {
    // Cleanup is handled by the essentia manager
    // Individual instances don't need to clean up
  }
}