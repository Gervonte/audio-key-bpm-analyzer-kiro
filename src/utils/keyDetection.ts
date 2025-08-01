import type { KeyResult } from '../types'
import { EssentiaWASM, Essentia } from 'essentia.js'

export interface KeyDetectionOptions {
  onProgress?: (progress: number) => void
}

export class KeyDetector {
  private essentia: Essentia | null = null
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
   * Main method to detect the musical key of an audio buffer using essentia.js
   */
  async detectKey(audioBuffer: AudioBuffer, options: KeyDetectionOptions = {}): Promise<KeyResult> {
    const { onProgress } = options

    // Validate input
    if (!audioBuffer || audioBuffer.length === 0) {
      return this.getDefaultKeyResult()
    }

    // Wait for essentia to initialize
    await this.initPromise

    // If essentia failed to initialize, return default result
    if (!this.essentia) {
      onProgress?.(100)
      return this.getDefaultKeyResult()
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

      // Use essentia.js Key algorithm for accurate key detection
      const vectorSignal = this.essentia.arrayToVector(monoSignal)
      const keyResult = this.essentia.Key(vectorSignal)

      onProgress?.(80)

      // Extract key information
      const keyName = keyResult.key || 'C'
      const scale = keyResult.scale || 'major'
      const strength = keyResult.strength || 0.5

      // Format the result according to our interface
      const mode: 'major' | 'minor' = scale === 'minor' ? 'minor' : 'major'
      const keySignature = this.formatKeySignature(keyName, mode)
      const fullKeyName = `${keyName} ${mode === 'major' ? 'Major' : 'Minor'}`

      onProgress?.(100)

      return {
        keyName: fullKeyName,
        keySignature,
        confidence: Math.max(0, Math.min(1, strength)),
        mode
      }
    } catch (error) {
      console.error('Key detection failed:', error)
      // Fallback to KeyExtractor
      return this.fallbackKeyDetection(audioBuffer, options)
    }
  }

  /**
   * Format key signature from key name and mode
   */
  private formatKeySignature(keyName: string, mode: 'major' | 'minor'): string {
    return mode === 'minor' ? `${keyName}m` : keyName
  }

  /**
   * Fallback key detection using KeyExtractor
   */
  private async fallbackKeyDetection(audioBuffer: AudioBuffer, options: KeyDetectionOptions = {}): Promise<KeyResult> {
    const { onProgress } = options

    // Wait for essentia to initialize
    await this.initPromise

    // If essentia failed to initialize, return default result
    if (!this.essentia) {
      onProgress?.(100)
      return this.getDefaultKeyResult()
    }

    try {
      onProgress?.(50)

      const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)

      if (!monoSignal || monoSignal.length === 0) {
        throw new Error('Failed to convert audio to mono signal in fallback')
      }

      // Use KeyExtractor as fallback
      const vectorSignal = this.essentia.arrayToVector(monoSignal)
      const keyResult = this.essentia.KeyExtractor(vectorSignal)

      const keyName = keyResult.key || 'C'
      const scale = keyResult.scale || 'major'
      const strength = keyResult.strength || 0.5

      const mode: 'major' | 'minor' = scale === 'minor' ? 'minor' : 'major'
      const keySignature = this.formatKeySignature(keyName, mode)
      const fullKeyName = `${keyName} ${mode === 'major' ? 'Major' : 'Minor'}`

      onProgress?.(100)

      return {
        keyName: fullKeyName,
        keySignature,
        confidence: Math.max(0, Math.min(1, strength)),
        mode
      }
    } catch (error) {
      console.error('Fallback key detection failed:', error)
      // Return default result
      return this.getDefaultKeyResult()
    }
  }

  /**
   * Get default key result when all detection methods fail
   */
  private getDefaultKeyResult(): KeyResult {
    return {
      keyName: 'C Major',
      keySignature: 'C',
      confidence: 0.1,
      mode: 'major'
    }
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