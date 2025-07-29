import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkWebAudioSupport,
  createAudioContext,
  closeAudioContext,
  validateAudioBuffer,
  isCorruptedAudioError,
  extractAudioMetadata
} from '../audioProcessing'

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
  state: 'running'
}

const createMockAudioBuffer = (options: {
  numberOfChannels?: number
  length?: number
  sampleRate?: number
  duration?: number
  channelData?: Float32Array[]
} = {}): AudioBuffer => {
  const {
    numberOfChannels = 2,
    length = 1000,
    sampleRate = 44100,
    duration = length / sampleRate,
    channelData = [new Float32Array(length), new Float32Array(length)]
  } = options

  const buffer = {
    numberOfChannels,
    length,
    sampleRate,
    duration,
    getChannelData: vi.fn((channel: number) => channelData[channel] || new Float32Array(length))
  } as unknown as AudioBuffer

  return buffer
}

// Mock global AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
})

describe('audioProcessing utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkWebAudioSupport', () => {
    it('should return supported when AudioContext is available', () => {
      const result = checkWebAudioSupport()
      expect(result.isSupported).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return unsupported when AudioContext is not available', () => {
      // Temporarily set AudioContext to undefined
      const originalAudioContext = window.AudioContext
      const originalWebkitAudioContext = (window as any).webkitAudioContext
      
      ;(window as any).AudioContext = undefined
      ;(window as any).webkitAudioContext = undefined

      const result = checkWebAudioSupport()
      expect(result.isSupported).toBe(false)
      expect(result.error).toContain('Web Audio API not supported')

      // Restore
      window.AudioContext = originalAudioContext
      ;(window as any).webkitAudioContext = originalWebkitAudioContext
    })

    it('should work with webkit prefix', () => {
      const originalAudioContext = window.AudioContext
      ;(window as any).AudioContext = undefined
      ;(window as any).webkitAudioContext = vi.fn(() => mockAudioContext)

      const result = checkWebAudioSupport()
      expect(result.isSupported).toBe(true)

      // Restore
      window.AudioContext = originalAudioContext
    })
  })

  describe('createAudioContext', () => {
    it('should create AudioContext', () => {
      const context = createAudioContext()
      expect(context).toBe(mockAudioContext)
      expect(window.AudioContext).toHaveBeenCalled()
    })

    it('should use webkit prefix when available', () => {
      const originalAudioContext = window.AudioContext
      ;(window as any).AudioContext = undefined
      ;(window as any).webkitAudioContext = vi.fn(() => mockAudioContext)

      const context = createAudioContext()
      expect(context).toBe(mockAudioContext)

      // Restore
      window.AudioContext = originalAudioContext
    })
  })

  describe('closeAudioContext', () => {
    it('should close audio context successfully', async () => {
      mockAudioContext.close.mockResolvedValue(undefined)
      mockAudioContext.state = 'running'

      await closeAudioContext(mockAudioContext as any)
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('should not close already closed context', async () => {
      mockAudioContext.state = 'closed'

      await closeAudioContext(mockAudioContext as any)
      expect(mockAudioContext.close).not.toHaveBeenCalled()
    })

    it('should handle close errors gracefully', async () => {
      mockAudioContext.close.mockRejectedValue(new Error('Close failed'))
      mockAudioContext.state = 'running'

      // Should not throw
      await expect(closeAudioContext(mockAudioContext as any)).resolves.toBeUndefined()
    })
  })

  // Note: AudioBuffer processing functions are tested through integration tests
  // since mocking AudioBuffer constructor is complex in the test environment

  describe('validateAudioBuffer', () => {
    it('should validate correct audio buffer', () => {
      const validData = new Float32Array([0.1, -0.2, 0.3, -0.4])
      const buffer = createMockAudioBuffer({
        numberOfChannels: 2,
        length: 1000,
        duration: 1.0,
        channelData: [validData, validData]
      })

      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject null buffer', () => {
      const result = validateAudioBuffer(null as any)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('AudioBuffer is null or undefined')
    })

    it('should reject empty buffer', () => {
      const buffer = createMockAudioBuffer({ length: 0 })
      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('AudioBuffer is empty')
    })

    it('should reject buffer with zero duration', () => {
      const buffer = createMockAudioBuffer({ duration: 0 })
      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('AudioBuffer has zero duration')
    })

    it('should reject buffer with invalid sample rate', () => {
      const buffer = createMockAudioBuffer({ sampleRate: 0 })
      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('AudioBuffer has invalid sample rate')
    })

    it('should reject buffer with no channels', () => {
      const buffer = createMockAudioBuffer({ numberOfChannels: 0 })
      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('AudioBuffer has no channels')
    })

    it('should reject silent buffer', () => {
      const silentData = new Float32Array(1000).fill(0)
      const buffer = createMockAudioBuffer({
        channelData: [silentData, silentData]
      })

      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('only silence')
    })

    it('should reject buffer with NaN values', () => {
      const nanData = new Float32Array([NaN, NaN, NaN, NaN])
      const buffer = createMockAudioBuffer({
        channelData: [nanData, nanData]
      })

      const result = validateAudioBuffer(buffer)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('only silence')
    })
  })



  describe('isCorruptedAudioError', () => {
    it('should detect corruption indicators', () => {
      const corruptionErrors = [
        new Error('Unable to decode audio data'),
        new Error('Invalid audio data format'),
        new Error('File is corrupt'),
        new Error('Malformed audio header'),
        new Error('Unexpected end of file'),
        new Error('Invalid header information'),
        new Error('Decoding failed due to corruption')
      ]

      corruptionErrors.forEach(error => {
        expect(isCorruptedAudioError(error)).toBe(true)
      })
    })

    it('should not detect non-corruption errors', () => {
      const normalErrors = [
        new Error('Network error'),
        new Error('File not found'),
        new Error('Permission denied'),
        new Error('Timeout occurred')
      ]

      normalErrors.forEach(error => {
        expect(isCorruptedAudioError(error)).toBe(false)
      })
    })

    it('should be case insensitive', () => {
      const error = new Error('UNABLE TO DECODE AUDIO DATA')
      expect(isCorruptedAudioError(error)).toBe(true)
    })
  })

  describe('extractAudioMetadata', () => {
    it('should extract correct metadata', () => {
      const buffer = createMockAudioBuffer({
        duration: 180.5,
        sampleRate: 48000,
        numberOfChannels: 2,
        length: 8664000
      })

      const metadata = extractAudioMetadata(buffer)
      expect(metadata).toEqual({
        duration: 180.5,
        sampleRate: 48000,
        channels: 2,
        length: 8664000
      })
    })

    it('should handle mono audio', () => {
      const buffer = createMockAudioBuffer({
        numberOfChannels: 1,
        duration: 60,
        sampleRate: 44100,
        length: 2646000
      })

      const metadata = extractAudioMetadata(buffer)
      expect(metadata.channels).toBe(1)
      expect(metadata.duration).toBe(60)
    })
  })
})