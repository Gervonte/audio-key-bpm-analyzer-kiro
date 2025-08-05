// Unit tests for AudioProcessor class

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioProcessor } from '../audioProcessor'

// Create mock instances
const mockKeyDetector = {
  detectKey: vi.fn().mockResolvedValue({
    keyName: 'C Major',
    keySignature: 'C',
    confidence: 0.85,
    mode: 'major'
  })
}

const mockBPMDetector = {
  detectBPM: vi.fn().mockResolvedValue({
    bpm: 120,
    confidence: 0.90,
    detectedBeats: 48
  })
}

// Mock the detector classes
vi.mock('../keyDetection', () => ({
  KeyDetector: vi.fn().mockImplementation(() => mockKeyDetector)
}))

vi.mock('../bpmDetection', () => ({
  BPMDetector: vi.fn().mockImplementation(() => mockBPMDetector)
}))

// Mock AudioBuffer
const createMockAudioBuffer = (duration: number = 10): AudioBuffer => {
  const mockBuffer = {
    duration,
    sampleRate: 44100,
    numberOfChannels: 2,
    length: duration * 44100,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(duration * 44100))
  } as unknown as AudioBuffer

  // Mock AudioBuffer constructor for normalization
  globalThis.AudioBuffer = vi.fn().mockImplementation((options) => ({
    ...options,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(options.length))
  })) as any

  return mockBuffer
}

describe('AudioProcessor', () => {
  let processor: AudioProcessor
  let mockAudioBuffer: AudioBuffer
  let progressCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    processor = new AudioProcessor()
    mockAudioBuffer = createMockAudioBuffer()
    progressCallback = vi.fn()
    vi.clearAllMocks()

    // Reset mocks to default successful state
    mockKeyDetector.detectKey.mockResolvedValue({
      keyName: 'C Major',
      keySignature: 'C',
      confidence: 0.85,
      mode: 'major'
    })

    mockBPMDetector.detectBPM.mockResolvedValue({
      bpm: 120,
      confidence: 0.90,
      detectedBeats: 48
    })
  })

  afterEach(() => {
    processor.cancelProcessing()
  })

  describe('processAudio', () => {
    it('should successfully process audio and return analysis result', async () => {
      const result = await processor.processAudio(mockAudioBuffer, {
        onProgress: progressCallback
      })

      expect(result).toMatchObject({
        key: {
          keyName: 'C Major',
          keySignature: 'C',
          confidence: 0.85,
          mode: 'major'
        },
        bpm: {
          bpm: 120,
          confidence: 0.90,
          detectedBeats: 48
        },
        confidence: {
          key: 0.85,
          bpm: 0.90,
          overall: 0.875
        }
      })

      expect(result.processingTime).toBeGreaterThan(0)
      expect(progressCallback).toHaveBeenCalledWith(100)
    })

    it('should call progress callback with increasing values', async () => {
      await processor.processAudio(mockAudioBuffer, {
        onProgress: progressCallback
      })

      expect(progressCallback).toHaveBeenCalledWith(10) // Normalization
      expect(progressCallback).toHaveBeenCalledWith(20) // Start parallel processing
      expect(progressCallback).toHaveBeenCalledWith(95) // Before final result
      expect(progressCallback).toHaveBeenCalledWith(100) // Complete
    })

    it('should handle processing timeout', async () => {
      const shortTimeoutMs = 100

      // Mock detectors to take longer than timeout
      mockKeyDetector.detectKey.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      )

      await expect(
        processor.processAudio(mockAudioBuffer, {
          timeoutMs: shortTimeoutMs,
          onProgress: progressCallback
        })
      ).rejects.toThrow('Audio processing timed out after 30 seconds')
    })

    it('should handle cancellation', async () => {
      const processingPromise = processor.processAudio(mockAudioBuffer)

      // Cancel immediately
      processor.cancelProcessing()

      await expect(processingPromise).rejects.toThrow('Audio processing was cancelled')
    })

    it('should handle key detection errors', async () => {
      // Mock key detection to throw error
      mockKeyDetector.detectKey.mockRejectedValue(new Error('Key detection failed'))

      await expect(
        processor.processAudio(mockAudioBuffer)
      ).rejects.toThrow('Key detection failed')
    })

    it('should handle BPM detection errors', async () => {
      // Mock BPM detection to throw error, but keep key detection working
      mockBPMDetector.detectBPM.mockRejectedValue(new Error('BPM detection failed'))

      await expect(
        processor.processAudio(mockAudioBuffer)
      ).rejects.toThrow('BPM detection failed')
    })
  })

  describe('getAudioFeatures', () => {
    it('should return correct audio features', () => {
      const features = processor.getAudioFeatures(mockAudioBuffer)

      expect(features).toEqual({
        duration: 10,
        sampleRate: 44100,
        channels: 2,
        length: 441000
      })
    })
  })

  describe('normalizeAudio', () => {
    it('should preprocess audio buffer to match web demo (mono + 16kHz)', () => {
      const normalizedBuffer = processor.normalizeAudio(mockAudioBuffer)

      // Should convert to mono (1 channel) and downsample to 16kHz as per web demo
      expect(normalizedBuffer.numberOfChannels).toBe(1)
      expect(normalizedBuffer.sampleRate).toBe(16000)
      
      // Length should be adjusted for the new sample rate
      const expectedLength = Math.round(mockAudioBuffer.length * (16000 / mockAudioBuffer.sampleRate))
      expect(normalizedBuffer.length).toBe(expectedLength)
    })

    it('should handle zero amplitude audio', () => {
      const zeroBuffer = createMockAudioBuffer()
      vi.mocked(zeroBuffer.getChannelData).mockReturnValue(new Float32Array(441000).fill(0))

      const normalizedBuffer = processor.normalizeAudio(zeroBuffer)
      expect(normalizedBuffer).toBeDefined()
      expect(normalizedBuffer.numberOfChannels).toBe(1)
      expect(normalizedBuffer.sampleRate).toBe(16000)
    })

    it('should handle mono input correctly', () => {
      const monoBuffer = {
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 1, // Mono
        length: 441000,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(441000))
      } as unknown as AudioBuffer

      const normalizedBuffer = processor.normalizeAudio(monoBuffer)
      expect(normalizedBuffer.numberOfChannels).toBe(1)
      expect(normalizedBuffer.sampleRate).toBe(16000)
    })
  })

  describe('cancelProcessing', () => {
    it('should cancel ongoing processing', () => {
      expect(() => processor.cancelProcessing()).not.toThrow()
    })

    it('should be safe to call multiple times', () => {
      processor.cancelProcessing()
      expect(() => processor.cancelProcessing()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle unknown errors gracefully', async () => {
      // Mock both detectors to throw non-Error objects
      mockKeyDetector.detectKey.mockRejectedValue('Unknown error')

      await expect(
        processor.processAudio(mockAudioBuffer)
      ).rejects.toThrow('Key detection failed: Unknown error')
    })

    it('should clean up resources on error', async () => {
      mockKeyDetector.detectKey.mockRejectedValue(new Error('Test error'))

      try {
        await processor.processAudio(mockAudioBuffer)
      } catch (error) {
        // Error expected
      }

      // Should be able to start new processing after error
      mockKeyDetector.detectKey.mockResolvedValue({
        keyName: 'D Major',
        keySignature: 'D',
        confidence: 0.75,
        mode: 'major'
      })

      const result = await processor.processAudio(mockAudioBuffer)
      expect(result.key.keyName).toBe('D Major')
    })
  })

  describe('confidence calculation', () => {
    it('should calculate overall confidence correctly', async () => {
      const result = await processor.processAudio(mockAudioBuffer)

      expect(result.confidence.overall).toBe((0.85 + 0.90) / 2)
      expect(result.confidence.key).toBe(0.85)
      expect(result.confidence.bpm).toBe(0.90)
    })

    it('should handle low confidence results', async () => {
      mockKeyDetector.detectKey.mockResolvedValue({
        keyName: 'Unknown',
        keySignature: 'C',
        confidence: 0.1,
        mode: 'major'
      })

      mockBPMDetector.detectBPM.mockResolvedValue({
        bpm: 120,
        confidence: 0.2,
        detectedBeats: 5
      })

      const result = await processor.processAudio(mockAudioBuffer)

      expect(result.confidence.overall).toBeCloseTo(0.15)
      expect(result.confidence.key).toBe(0.1)
      expect(result.confidence.bpm).toBe(0.2)
    })
  })
})