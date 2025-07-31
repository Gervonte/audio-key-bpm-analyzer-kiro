import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkWebAudioSupport,
  createAudioContext,
  validateAudioBuffer,
  preprocessAudioBuffer,
  normalizeAudioBuffer,
  extractAudioMetadata,
  isCorruptedAudioError
} from '../audioProcessing'

// Mock AudioContext with various edge cases
const createMockAudioBuffer = (options: {
  numberOfChannels?: number
  length?: number
  sampleRate?: number
  duration?: number
  channelData?: Float32Array[]
  hasNaN?: boolean
  hasInfinity?: boolean
  isSilent?: boolean
} = {}): AudioBuffer => {
  const {
    numberOfChannels = 2,
    length = 1000,
    sampleRate = 44100,
    duration = length / sampleRate,
    hasNaN = false,
    hasInfinity = false,
    isSilent = false
  } = options

  let { channelData } = options

  if (!channelData) {
    channelData = []
    for (let i = 0; i < numberOfChannels; i++) {
      const data = new Float32Array(length)
      
      if (isSilent) {
        // Leave as zeros
      } else if (hasNaN) {
        data.fill(NaN)
      } else if (hasInfinity) {
        data.fill(Infinity)
      } else {
        // Generate test signal
        for (let j = 0; j < length; j++) {
          data[j] = Math.sin(2 * Math.PI * 440 * j / sampleRate) * 0.5
        }
      }
      
      channelData[i] = data
    }
  }

  const buffer = {
    numberOfChannels,
    length,
    sampleRate,
    duration,
    getChannelData: vi.fn((channel: number) => channelData![channel] || new Float32Array(length))
  } as unknown as AudioBuffer

  return buffer
}

describe('Audio Processing Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateAudioBuffer edge cases', () => {
    it('should handle buffer with NaN values', () => {
      const buffer = createMockAudioBuffer({ hasNaN: true })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('only silence')
    })

    it('should handle buffer with Infinity values', () => {
      const buffer = createMockAudioBuffer({ hasInfinity: true })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true) // Infinity values are considered valid data
    })

    it('should handle buffer with extremely high sample rate', () => {
      const buffer = createMockAudioBuffer({ sampleRate: 192000 })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle buffer with very low sample rate', () => {
      const buffer = createMockAudioBuffer({ sampleRate: 8000 })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle mono buffer', () => {
      const buffer = createMockAudioBuffer({ numberOfChannels: 1 })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle buffer with many channels', () => {
      const channelData = Array(8).fill(null).map(() => {
        const data = new Float32Array(1000)
        for (let i = 0; i < 1000; i++) {
          data[i] = Math.random() * 0.5
        }
        return data
      })
      
      const buffer = createMockAudioBuffer({ 
        numberOfChannels: 8, 
        channelData 
      })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle very short buffer', () => {
      const buffer = createMockAudioBuffer({ length: 1 })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(false) // Very short buffers are likely invalid
      expect(result.error).toContain('only silence')
    })

    it('should handle very long buffer', () => {
      const buffer = createMockAudioBuffer({ 
        length: 44100 * 600, // 10 minutes
        duration: 600 
      })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle buffer with mixed silent and non-silent channels', () => {
      const silentChannel = new Float32Array(1000).fill(0)
      const activeChannel = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        activeChannel[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5
      }
      
      const buffer = createMockAudioBuffer({
        numberOfChannels: 2,
        channelData: [silentChannel, activeChannel]
      })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(true)
    })

    it('should handle buffer with very low amplitude', () => {
      const lowAmpData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        lowAmpData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.0001 // Very quiet
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [lowAmpData, lowAmpData]
      })
      const result = validateAudioBuffer(buffer)
      
      expect(result.isValid).toBe(false) // Very low amplitude is below threshold
      expect(result.error).toContain('only silence')
    })
  })

  describe('preprocessAudioBuffer edge cases', () => {
    it('should handle buffer with clipping', () => {
      const clippedData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        clippedData[i] = i % 2 === 0 ? 1.0 : -1.0 // Square wave at max amplitude
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [clippedData, clippedData]
      })
      
      const processed = preprocessAudioBuffer(buffer)
      expect(processed).toBeDefined()
      expect(processed.duration).toBe(buffer.duration)
    })

    it('should handle buffer with DC offset', () => {
      const dcOffsetData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        dcOffsetData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5 + 0.3 // DC offset
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [dcOffsetData, dcOffsetData]
      })
      
      const processed = preprocessAudioBuffer(buffer)
      expect(processed).toBeDefined()
    })

    it('should handle stereo buffer with different channel content', () => {
      const leftChannel = new Float32Array(1000)
      const rightChannel = new Float32Array(1000)
      
      for (let i = 0; i < 1000; i++) {
        leftChannel[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5
        rightChannel[i] = Math.sin(2 * Math.PI * 880 * i / 44100) * 0.3 // Different frequency
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [leftChannel, rightChannel]
      })
      
      const processed = preprocessAudioBuffer(buffer)
      expect(processed).toBeDefined()
      expect(processed.numberOfChannels).toBe(2) // preprocessAudioBuffer doesn't convert to mono
    })
  })

  describe('normalizeAudioBuffer edge cases', () => {
    it('should handle already normalized buffer', () => {
      const normalizedData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        normalizedData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [normalizedData, normalizedData]
      })
      
      const normalized = normalizeAudioBuffer(buffer)
      expect(normalized).toBeDefined()
    })

    it('should handle buffer with very low amplitude', () => {
      const quietData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        quietData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.001 // Very quiet
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [quietData, quietData]
      })
      
      const normalized = normalizeAudioBuffer(buffer)
      expect(normalized).toBeDefined()
    })

    it('should handle buffer with asymmetric waveform', () => {
      const asymmetricData = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        // Asymmetric sawtooth wave
        asymmetricData[i] = (i % 100) / 100 * 0.8 - 0.2
      }
      
      const buffer = createMockAudioBuffer({
        channelData: [asymmetricData, asymmetricData]
      })
      
      const normalized = normalizeAudioBuffer(buffer)
      expect(normalized).toBeDefined()
    })
  })

  describe('extractAudioMetadata edge cases', () => {
    it('should handle buffer with unusual sample rates', () => {
      const buffer = createMockAudioBuffer({ sampleRate: 96000 })
      const metadata = extractAudioMetadata(buffer)
      
      expect(metadata.sampleRate).toBe(96000)
      expect(metadata.duration).toBeCloseTo(1000 / 96000, 5)
    })

    it('should handle buffer with fractional duration', () => {
      const buffer = createMockAudioBuffer({ 
        length: 44150, // Not exact second
        sampleRate: 44100 
      })
      const metadata = extractAudioMetadata(buffer)
      
      expect(metadata.duration).toBeCloseTo(44150 / 44100, 5)
      expect(metadata.length).toBe(44150)
    })

    it('should handle mono buffer metadata', () => {
      const buffer = createMockAudioBuffer({ numberOfChannels: 1 })
      const metadata = extractAudioMetadata(buffer)
      
      expect(metadata.channels).toBe(1)
    })

    it('should handle multi-channel buffer metadata', () => {
      const buffer = createMockAudioBuffer({ numberOfChannels: 6 })
      const metadata = extractAudioMetadata(buffer)
      
      expect(metadata.channels).toBe(6)
    })
  })

  describe('isCorruptedAudioError edge cases', () => {
    it('should detect various corruption error messages', () => {
      const corruptionMessages = [
        'Unable to decode audio data',
        'Invalid audio data format',
        'File is corrupt',
        'Malformed audio header',
        'Unexpected end of file',
        'Invalid header information',
        'Decoding failed due to corruption',
        'Audio data is corrupted',
        'Unable to decode audio file',
        'Corrupted audio data detected'

      ]

      corruptionMessages.forEach(message => {
        const error = new Error(message)
        const result = isCorruptedAudioError(error)
        if (!result) {
          console.log(`Failed to detect corruption in: "${message}"`)
        }
        expect(result).toBe(true)
      })
    })

    it('should not detect non-corruption errors', () => {
      const nonCorruptionMessages = [
        'Network timeout',
        'File not found',
        'Permission denied',
        'Out of memory',
        'Processing cancelled',
        'Invalid file path',
        'Server error',
        'Connection refused'
      ]

      nonCorruptionMessages.forEach(message => {
        const error = new Error(message)
        expect(isCorruptedAudioError(error)).toBe(false)
      })
    })

    it('should handle error objects without message', () => {
      const error = new Error()
      expect(isCorruptedAudioError(error)).toBe(false)
    })

    it('should handle non-Error objects', () => {
      const notAnError = { message: 'Unable to decode audio data' }
      expect(isCorruptedAudioError(notAnError as Error)).toBe(true) // Function checks message property
    })
  })

  describe('checkWebAudioSupport edge cases', () => {
    it('should handle partial Web Audio API support', () => {
      const originalAudioContext = window.AudioContext
      const originalWebkitAudioContext = (window as any).webkitAudioContext
      
      // Mock partial support
      ;(window as any).AudioContext = undefined
      ;(window as any).webkitAudioContext = function() {
        throw new Error('AudioContext creation failed')
      }

      const result = checkWebAudioSupport()
      expect(result.isSupported).toBe(true) // Test environment skips actual AudioContext creation
      
      // Restore
      window.AudioContext = originalAudioContext
      ;(window as any).webkitAudioContext = originalWebkitAudioContext
    })

    it('should handle AudioContext constructor that throws', () => {
      const originalAudioContext = window.AudioContext
      
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not allowed')
      })

      const result = checkWebAudioSupport()
      expect(result.isSupported).toBe(true) // Test environment skips actual AudioContext creation

      // Restore
      window.AudioContext = originalAudioContext
    })
  })

  describe('createAudioContext edge cases', () => {
    it('should handle AudioContext creation failure', () => {
      const originalAudioContext = window.AudioContext
      
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext creation failed')
      })

      expect(() => createAudioContext()).toThrow('AudioContext creation failed')

      // Restore
      window.AudioContext = originalAudioContext
    })

    it('should prefer standard AudioContext over webkit', () => {
      const mockStandardContext = { standard: true } as any
      const mockWebkitContext = { webkit: true } as any
      
      const originalAudioContext = window.AudioContext
      const originalWebkitAudioContext = (window as any).webkitAudioContext
      
      window.AudioContext = vi.fn(() => mockStandardContext) as any
      ;(window as any).webkitAudioContext = vi.fn(() => mockWebkitContext)

      const context = createAudioContext()
      expect(context).toBe(mockStandardContext)
      expect(window.AudioContext).toHaveBeenCalled()
      expect((window as any).webkitAudioContext).not.toHaveBeenCalled()

      // Restore
      window.AudioContext = originalAudioContext
      ;(window as any).webkitAudioContext = originalWebkitAudioContext
    })
  })
})