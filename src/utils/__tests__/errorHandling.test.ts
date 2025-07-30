// Unit tests for error handling utilities

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  categorizeError,
  checkBrowserCompatibility,
  generateErrorMessage,
  isRecoverableError,
  getRetryDelay,
  getErrorSeverityColor
} from '../errorHandling'

// Mock navigator and window for browser compatibility tests
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  deviceMemory: 4
}

const mockWindow = {
  AudioContext: vi.fn(),
  File: vi.fn(),
  FileReader: vi.fn()
}

Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true
})

Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true
})

describe('errorHandling utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('categorizeError', () => {
    it('should categorize file size errors', () => {
      const error = 'File size (60.5MB) exceeds maximum limit of 50MB'
      const result = categorizeError(error)

      expect(result.type).toBe('file_validation')
      expect(result.canRetry).toBe(false)
      expect(result.severity).toBe('error')
      expect(result.suggestion).toContain('compress')
    })

    it('should categorize unsupported format errors', () => {
      const error = 'Unsupported file format. Supported formats: MP3, WAV, FLAC, M4A'
      const result = categorizeError(error)

      expect(result.type).toBe('file_validation')
      expect(result.canRetry).toBe(false)
      expect(result.suggestion).toContain('convert')
    })

    it('should categorize browser compatibility errors', () => {
      const error = 'Web Audio API not supported in this browser'
      const result = categorizeError(error)

      expect(result.type).toBe('browser_compatibility')
      expect(result.canRetry).toBe(false)
      expect(result.suggestion).toContain('modern browser')
    })

    it('should categorize corrupted file errors', () => {
      const error = 'Audio file appears to be corrupted'
      const result = categorizeError(error)

      expect(result.type).toBe('file_loading')
      expect(result.canRetry).toBe(false)
      expect(result.suggestion).toContain('re-exporting')
    })

    it('should categorize timeout errors', () => {
      const error = 'Audio processing timed out after 30 seconds'
      const result = categorizeError(error)

      expect(result.type).toBe('timeout')
      expect(result.canRetry).toBe(true)
      expect(result.suggestion).toContain('shorter audio file')
    })

    it('should categorize key detection errors', () => {
      const error = 'Key detection failed'
      const result = categorizeError(error)

      expect(result.type).toBe('key_detection')
      expect(result.canRetry).toBe(true)
      expect(result.suggestion).toContain('harmonic content')
    })

    it('should categorize BPM detection errors', () => {
      const error = 'BPM detection failed'
      const result = categorizeError(error)

      expect(result.type).toBe('bpm_detection')
      expect(result.canRetry).toBe(true)
      expect(result.suggestion).toContain('rhythmic pattern')
    })

    it('should categorize memory errors', () => {
      const error = 'Not enough memory to process'
      const result = categorizeError(error)

      expect(result.type).toBe('memory')
      expect(result.canRetry).toBe(true)
      expect(result.suggestion).toContain('closing other browser tabs')
    })

    it('should categorize cancelled operations', () => {
      const error = 'Processing was cancelled'
      const result = categorizeError(error)

      expect(result.type).toBe('audio_processing')
      expect(result.canRetry).toBe(true)
      expect(result.severity).toBe('info')
    })

    it('should categorize unknown errors', () => {
      const error = 'Some unexpected error'
      const result = categorizeError(error)

      expect(result.type).toBe('unknown')
      expect(result.canRetry).toBe(true)
      expect(result.severity).toBe('error')
      expect(result.suggestion).toContain('try again')
    })

    it('should handle Error objects', () => {
      const error = new Error('File size exceeds maximum')
      const result = categorizeError(error)

      expect(result.type).toBe('file_validation')
      expect(result.message).toBe('File size exceeds maximum')
    })
  })

  describe('checkBrowserCompatibility', () => {
    it('should return supported for modern browsers', () => {
      const result = checkBrowserCompatibility()

      expect(result.isSupported).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing Web Audio API', () => {
      const originalAudioContext = mockWindow.AudioContext
      delete (mockWindow as any).AudioContext

      const result = checkBrowserCompatibility()

      expect(result.isSupported).toBe(false)
      expect(result.errors).toContain('Web Audio API is not supported')

      mockWindow.AudioContext = originalAudioContext
    })

    it('should detect missing File API', () => {
      const originalFile = mockWindow.File
      delete (mockWindow as any).File

      const result = checkBrowserCompatibility()

      expect(result.isSupported).toBe(false)
      expect(result.errors).toContain('File API is not supported')

      mockWindow.File = originalFile
    })

    it('should warn about Internet Explorer', () => {
      const originalUserAgent = mockNavigator.userAgent
      mockNavigator.userAgent = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)'

      const result = checkBrowserCompatibility()

      expect(result.warnings).toContain('Internet Explorer is not fully supported')

      mockNavigator.userAgent = originalUserAgent
    })

    it('should warn about mobile browsers', () => {
      const originalUserAgent = mockNavigator.userAgent
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'

      const result = checkBrowserCompatibility()

      expect(result.warnings).toContain('Mobile browsers may have limited audio processing capabilities')

      mockNavigator.userAgent = originalUserAgent
    })

    it('should warn about low memory devices', () => {
      const originalDeviceMemory = mockNavigator.deviceMemory
      mockNavigator.deviceMemory = 1

      const result = checkBrowserCompatibility()

      expect(result.warnings).toContain('Low device memory detected')

      mockNavigator.deviceMemory = originalDeviceMemory
    })
  })

  describe('generateErrorMessage', () => {
    it('should generate message with context', () => {
      const error = 'File not found'
      const context = 'File Upload'
      const result = generateErrorMessage(error, context)

      expect(result).toContain('File Upload: File not found')
    })

    it('should include suggestions', () => {
      const error = 'File size exceeds maximum'
      const result = generateErrorMessage(error)

      expect(result).toContain('Suggestion:')
      expect(result).toContain('compress')
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error')
      const result = generateErrorMessage(error)

      expect(result).toContain('Test error')
    })
  })

  describe('isRecoverableError', () => {
    it('should identify recoverable errors', () => {
      expect(isRecoverableError('Processing timed out')).toBe(true)
      expect(isRecoverableError('Key detection failed')).toBe(true)
      expect(isRecoverableError('Network error')).toBe(true)
    })

    it('should identify non-recoverable errors', () => {
      expect(isRecoverableError('File size exceeds maximum')).toBe(false)
      expect(isRecoverableError('Unsupported file format')).toBe(false)
      expect(isRecoverableError('Web Audio API not supported')).toBe(false)
    })
  })

  describe('getRetryDelay', () => {
    it('should return appropriate delays for different error types', () => {
      expect(getRetryDelay('network')).toBe(2000)
      expect(getRetryDelay('memory')).toBe(5000)
      expect(getRetryDelay('timeout')).toBe(1000)
      expect(getRetryDelay('audio_processing')).toBe(1500)
      expect(getRetryDelay('unknown')).toBe(1000)
    })
  })

  describe('getErrorSeverityColor', () => {
    it('should return correct colors for severity levels', () => {
      expect(getErrorSeverityColor('error')).toBe('red')
      expect(getErrorSeverityColor('warning')).toBe('orange')
      expect(getErrorSeverityColor('info')).toBe('blue')
    })
  })
})