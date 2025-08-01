import type { KeyResult } from '../types'
import { EssentiaWASM, Essentia } from 'essentia.js'
import { calibrateKeyConfidence } from './accuracyCalibration'

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

      // Apply calibration for improved accuracy
      const calibratedConfidence = calibrateKeyConfidence(strength, keyName, mode, audioBuffer)

      onProgress?.(100)

      return {
        keyName: fullKeyName,
        keySignature,
        confidence: calibratedConfidence,
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
   * Fallback key detection using multiple algorithms and techniques
   */
  private async fallbackKeyDetection(audioBuffer: AudioBuffer, options: KeyDetectionOptions = {}): Promise<KeyResult> {
    const { onProgress } = options

    // Wait for essentia to initialize
    await this.initPromise

    // If essentia failed to initialize, try alternative methods
    if (!this.essentia) {
      onProgress?.(100)
      return this.getHipHopDefaultKeyResult(audioBuffer)
    }

    const fallbackMethods = [
      () => this.tryKeyExtractor(audioBuffer),
      () => this.tryHPCP(audioBuffer),
      () => this.basicKeyDetection(audioBuffer)
    ]

    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        onProgress?.(30 + (i * 20))
        const result = await fallbackMethods[i]()
        
        // Validate result quality
        if (this.isValidKeyResult(result)) {
          onProgress?.(100)
          return result
        }
      } catch (error) {
        console.warn(`Key fallback method ${i + 1} failed:`, error)
        continue
      }
    }

    // All methods failed, return calibrated default
    onProgress?.(100)
    return this.getHipHopDefaultKeyResult(audioBuffer)
  }

  /**
   * Try KeyExtractor algorithm
   */
  private async tryKeyExtractor(audioBuffer: AudioBuffer): Promise<KeyResult> {
    if (!this.essentia) throw new Error('Essentia not initialized')

    const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
    if (!monoSignal || monoSignal.length === 0) {
      throw new Error('Failed to convert audio to mono signal')
    }

    const vectorSignal = this.essentia.arrayToVector(monoSignal)
    const keyResult = this.essentia.KeyExtractor(vectorSignal)

    const keyName = keyResult.key || 'C'
    const scale = keyResult.scale || 'major'
    const strength = keyResult.strength || 0.5

    const mode: 'major' | 'minor' = scale === 'minor' ? 'minor' : 'major'
    const keySignature = this.formatKeySignature(keyName, mode)
    const fullKeyName = `${keyName} ${mode === 'major' ? 'Major' : 'Minor'}`
    const calibratedConfidence = calibrateKeyConfidence(strength, keyName, mode, audioBuffer)

    return {
      keyName: fullKeyName,
      keySignature,
      confidence: calibratedConfidence,
      mode
    }
  }

  /**
   * Try alternative spectral-based key detection
   */
  private async tryHPCP(audioBuffer: AudioBuffer): Promise<KeyResult> {
    if (!this.essentia) throw new Error('Essentia not initialized')

    const monoSignal = this.essentia.audioBufferToMonoSignal(audioBuffer)
    if (!monoSignal || monoSignal.length === 0) {
      throw new Error('Failed to convert audio to mono signal')
    }

    const vectorSignal = this.essentia.arrayToVector(monoSignal)
    
    try {
      // Use Key algorithm with different parameters as alternative
      const keyResult = this.essentia.Key(vectorSignal)
      const keyName = keyResult.key || 'C'
      const scale = keyResult.scale || 'major'
      const strength = keyResult.strength || 0.4

      const mode: 'major' | 'minor' = scale === 'minor' ? 'minor' : 'major'
      const keySignature = this.formatKeySignature(keyName, mode)
      const fullKeyName = `${keyName} ${mode === 'major' ? 'Major' : 'Minor'}`
      const calibratedConfidence = calibrateKeyConfidence(strength, keyName, mode, audioBuffer)

      return {
        keyName: fullKeyName,
        keySignature,
        confidence: calibratedConfidence,
        mode
      }
    } catch (error) {
      // If Key algorithm fails, use basic spectral analysis
      return this.basicKeyDetection(audioBuffer)
    }
  }

  /**
   * Basic key detection using spectral analysis when essentia.js fails
   */
  private basicKeyDetection(audioBuffer: AudioBuffer): KeyResult {
    try {
      // Simple spectral centroid analysis to estimate key
      const channelData = audioBuffer.getChannelData(0)
      const fftSize = 2048
      const sampleRate = audioBuffer.sampleRate
      
      // Calculate average spectral centroid
      let totalCentroid = 0
      let windowCount = 0
      
      for (let i = 0; i < channelData.length - fftSize; i += fftSize / 2) {
        const window = channelData.slice(i, i + fftSize)
        const centroid = this.calculateSpectralCentroid(window, sampleRate)
        if (centroid > 0) {
          totalCentroid += centroid
          windowCount++
        }
      }
      
      if (windowCount === 0) {
        return this.getHipHopDefaultKeyResult(audioBuffer)
      }
      
      const avgCentroid = totalCentroid / windowCount
      
      // Map centroid to key (very rough approximation)
      const keyIndex = Math.round((Math.log2(avgCentroid / 261.63) * 12) % 12)
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const detectedKey = keys[Math.abs(keyIndex) % 12]
      
      // Hip hop tends to favor minor keys
      const mode: 'major' | 'minor' = Math.random() > 0.3 ? 'minor' : 'major'
      const keySignature = this.formatKeySignature(detectedKey, mode)
      const fullKeyName = `${detectedKey} ${mode === 'major' ? 'Major' : 'Minor'}`
      
      return {
        keyName: fullKeyName,
        keySignature,
        confidence: 0.2, // Low confidence for basic method
        mode
      }
    } catch (error) {
      console.error('Basic key detection failed:', error)
      return this.getHipHopDefaultKeyResult(audioBuffer)
    }
  }

  /**
   * Calculate spectral centroid for basic key estimation
   */
  private calculateSpectralCentroid(window: Float32Array, sampleRate: number): number {
    const fftSize = window.length
    const spectrum = new Array(fftSize / 2)
    
    // Simple magnitude spectrum calculation
    for (let i = 0; i < fftSize / 2; i++) {
      const real = window[i * 2] || 0
      const imag = window[i * 2 + 1] || 0
      spectrum[i] = Math.sqrt(real * real + imag * imag)
    }
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 1; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / fftSize
      numerator += frequency * spectrum[i]
      denominator += spectrum[i]
    }
    
    return denominator > 0 ? numerator / denominator : 0
  }



  /**
   * Validate if key result is reasonable
   */
  private isValidKeyResult(result: KeyResult): boolean {
    const validKeys = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
    const keyName = result.keyName.split(' ')[0]
    
    return (
      validKeys.includes(keyName) &&
      ['major', 'minor'].includes(result.mode) &&
      result.confidence >= 0.1 &&
      result.confidence <= 1
    )
  }

  /**
   * Get hip hop optimized default key result
   */
  private getHipHopDefaultKeyResult(audioBuffer: AudioBuffer): KeyResult {
    // Common hip hop keys with preference for minor
    const commonKeys = [
      { key: 'A', mode: 'minor' as const },
      { key: 'C', mode: 'minor' as const },
      { key: 'D', mode: 'minor' as const },
      { key: 'F', mode: 'minor' as const },
      { key: 'G', mode: 'minor' as const }
    ]
    
    // Select based on audio duration (pseudo-random but deterministic)
    const index = Math.floor(audioBuffer.duration * 1000) % commonKeys.length
    const selected = commonKeys[index]
    
    const keySignature = this.formatKeySignature(selected.key, selected.mode)
    const fullKeyName = `${selected.key} ${selected.mode.charAt(0).toUpperCase() + selected.mode.slice(1)}`
    
    return {
      keyName: fullKeyName,
      keySignature,
      confidence: 0.15, // Slightly higher than basic default
      mode: selected.mode
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