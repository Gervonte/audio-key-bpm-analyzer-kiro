import { describe, it, expect, beforeEach } from 'vitest'
import { KeyDetector } from '../keyDetection'

// Set longer timeout for audio processing tests
const AUDIO_TEST_TIMEOUT = 10000

// Mock AudioBuffer for testing
class MockAudioBuffer implements AudioBuffer {
  sampleRate: number
  length: number
  duration: number
  numberOfChannels: number
  private channelData: Float32Array[]

  constructor(
    sampleRate: number = 44100,
    length: number = 44100,
    numberOfChannels: number = 1,
    data?: Float32Array[]
  ) {
    this.sampleRate = sampleRate
    this.length = length
    this.duration = length / sampleRate
    this.numberOfChannels = numberOfChannels
    this.channelData = data || [new Float32Array(length)]
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || new Float32Array(this.length)
  }

  copyFromChannel(): void {
    throw new Error('Method not implemented.')
  }

  copyToChannel(): void {
    throw new Error('Method not implemented.')
  }
}

describe('KeyDetector', () => {
  let keyDetector: KeyDetector

  beforeEach(() => {
    keyDetector = new KeyDetector(44100)
  })

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      const detector = new KeyDetector()
      expect(detector).toBeInstanceOf(KeyDetector)
    })

    it('should initialize with custom parameters', () => {
      const detector = new KeyDetector(48000)
      expect(detector).toBeInstanceOf(KeyDetector)
    })
  })

  // Note: extractChromaFeatures and calculateKeyProfile are now internal to essentia.js
  // We test the overall detectKey functionality instead

  describe('detectKey', () => {
    it('should detect key from audio buffer', async () => {
      // Create a simple test with shorter audio
      const sampleRate = 44100
      const duration = 0.5 // Shorter duration for faster testing
      const length = sampleRate * duration
      const audioData = new Float32Array(length)

      // Simple sine wave
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        audioData[i] = 0.5 * Math.sin(2 * Math.PI * 261.63 * t) // C4
      }

      const audioBuffer = new MockAudioBuffer(sampleRate, length, 1, [audioData])
      const result = await keyDetector.detectKey(audioBuffer)

      expect(result.keyName).toBeDefined()
      expect(result.keySignature).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(['major', 'minor']).toContain(result.mode)
    }, AUDIO_TEST_TIMEOUT)

    it('should handle detection errors gracefully', async () => {
      // Test with invalid audio buffer (essentia.js should handle gracefully)
      const audioBuffer = new MockAudioBuffer(44100, 0, 1, [new Float32Array(0)])

      const result = await keyDetector.detectKey(audioBuffer)
      
      // Should return a result even for problematic input
      expect(result).toBeDefined()
      expect(result.keyName).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    })

    it('should return consistent results for the same input', async () => {
      const sampleRate = 44100
      const length = 4410 // Shorter for faster testing
      const audioData = new Float32Array(length)

      // Simple sine wave
      for (let i = 0; i < length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      const audioBuffer = new MockAudioBuffer(sampleRate, length, 1, [audioData])

      const result1 = await keyDetector.detectKey(audioBuffer)
      const result2 = await keyDetector.detectKey(audioBuffer)

      expect(result1.keyName).toBe(result2.keyName)
      expect(result1.mode).toBe(result2.mode)
      expect(result1.confidence).toBe(result2.confidence)
    }, AUDIO_TEST_TIMEOUT)
  })

  describe('key signature formatting', () => {
    it('should format major key signatures correctly', async () => {
      // Test with a simple audio buffer
      const audioBuffer = new MockAudioBuffer(44100, 4410, 1, [new Float32Array(4410).fill(0.1)])
      const result = await keyDetector.detectKey(audioBuffer)

      if (result.mode === 'major') {
        expect(result.keySignature).not.toContain('m')
        expect(result.keySignature).toMatch(/^[A-G][#b]?$/)
      }
    }, AUDIO_TEST_TIMEOUT)

    it('should format minor key signatures correctly', async () => {
      // Test with simple audio buffer - just check format if minor is detected
      const audioBuffer = new MockAudioBuffer(44100, 4410, 1, [new Float32Array(4410).fill(0.1)])
      const result = await keyDetector.detectKey(audioBuffer)

      // Just check that the signature format is correct regardless of detected key
      if (result.mode === 'minor') {
        expect(result.keySignature).toContain('m')
        expect(result.keySignature).toMatch(/^[A-G][#b]?m$/)
      } else {
        expect(result.keySignature).not.toContain('m')
        expect(result.keySignature).toMatch(/^[A-G][#b]?$/)
      }
    }, AUDIO_TEST_TIMEOUT)
  })

  describe('edge cases', () => {
    it('should handle very short audio buffers', async () => {
      const audioBuffer = new MockAudioBuffer(44100, 1024, 1, [new Float32Array(1024)])
      const result = await keyDetector.detectKey(audioBuffer)

      expect(result).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    }, AUDIO_TEST_TIMEOUT)

    it('should handle silent audio', async () => {
      const audioBuffer = new MockAudioBuffer(44100, 4410, 1, [new Float32Array(4410)])
      const result = await keyDetector.detectKey(audioBuffer)

      expect(result).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    }, AUDIO_TEST_TIMEOUT)

    it('should handle very loud audio', async () => {
      const audioData = new Float32Array(4410).fill(0.99) // Near clipping
      const audioBuffer = new MockAudioBuffer(44100, 4410, 1, [audioData])
      const result = await keyDetector.detectKey(audioBuffer)

      expect(result).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    }, AUDIO_TEST_TIMEOUT)
  })
})