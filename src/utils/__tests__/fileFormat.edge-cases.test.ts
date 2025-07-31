import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateAudioFile, createAudioFile, getFileExtension } from '../validation'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '../../types'

// Helper to create File objects with specific properties
const createTestFile = (
  name: string,
  size: number = 1024 * 1024, // 1MB default
  type: string = 'audio/mpeg',
  content: string = 'fake audio content'
): File => {
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })

  // Override size property since File constructor doesn't respect it
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })

  return file
}

describe('File Format Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File extension edge cases', () => {
    it('should handle files with multiple dots in name', () => {
      const file = createTestFile('my.song.backup.mp3')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle files with uppercase extensions', () => {
      const testCases = [
        'song.MP3',
        'track.WAV',
        'audio.FLAC',
        'music.M4A'
      ]

      testCases.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle files with mixed case extensions', () => {
      const testCases = [
        'song.Mp3',
        'track.Wav',
        'audio.fLaC',
        'music.m4A'
      ]

      testCases.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle files with no extension', () => {
      const file = createTestFile('audiofile')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file format')
    })

    it('should handle files with only dot', () => {
      const file = createTestFile('audiofile.')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file format')
    })

    it('should handle files starting with dot', () => {
      const file = createTestFile('.mp3')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '.mp3'
      const file = createTestFile(longName)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle filenames with special characters', () => {
      const specialNames = [
        'song (remix).mp3',
        'track-01.wav',
        'audio_file.flac',
        'music@home.m4a',
        'song#1.mp3',
        'track$money.wav'
      ]

      specialNames.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle Unicode filenames', () => {
      const unicodeNames = [
        '音楽.mp3',
        'música.wav',
        'موسيقى.flac',
        'музыка.m4a'
      ]

      unicodeNames.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('File size edge cases', () => {
    it('should handle exactly maximum file size', () => {
      const file = createTestFile('song.mp3', MAX_FILE_SIZE)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should reject file one byte over limit', () => {
      const file = createTestFile('song.mp3', MAX_FILE_SIZE + 1)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('exceeds maximum limit')
    })

    it('should handle very small files', () => {
      const file = createTestFile('song.mp3', 1) // 1 byte
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle zero-byte files', () => {
      const file = createTestFile('song.mp3', 0)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File is empty')
    })

    it('should handle files with negative size (edge case)', () => {
      const file = createTestFile('song.mp3', -1)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true) // File size property can't actually be negative in practice
    })
  })

  describe('MIME type edge cases', () => {
    it('should handle files with correct MIME types', () => {
      const mimeTypes = [
        { name: 'song.mp3', type: 'audio/mpeg' },
        { name: 'track.wav', type: 'audio/wav' },
        { name: 'audio.flac', type: 'audio/flac' },
        { name: 'music.m4a', type: 'audio/mp4' }
      ]

      mimeTypes.forEach(({ name, type }) => {
        const file = createTestFile(name, 1024 * 1024, type)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle files with incorrect MIME types but correct extensions', () => {
      // File extension should take precedence over MIME type
      const file = createTestFile('song.mp3', 1024 * 1024, 'text/plain')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle files with empty MIME type', () => {
      const file = createTestFile('song.mp3', 1024 * 1024, '')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle files with generic MIME type', () => {
      const file = createTestFile('song.mp3', 1024 * 1024, 'application/octet-stream')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Unsupported format edge cases', () => {
    it('should reject common unsupported audio formats', () => {
      const unsupportedFormats = [
        'song.aac',
        'track.ogg',
        'audio.wma',
        'music.aiff',
        'sound.au',
        'file.ra',
        'audio.amr'
      ]

      unsupportedFormats.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unsupported file format')
        expect(result.error).toContain(SUPPORTED_FORMATS.join(', ').toUpperCase())
      })
    })

    it('should reject non-audio formats', () => {
      const nonAudioFormats = [
        'document.pdf',
        'image.jpg',
        'video.mp4',
        'text.txt',
        'archive.zip',
        'executable.exe'
      ]

      nonAudioFormats.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unsupported file format')
      })
    })

    it('should handle files with misleading extensions', () => {
      // File that looks like audio but isn't supported
      const file = createTestFile('song.mp3.txt')
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file format')
    })
  })

  describe('createAudioFile edge cases', () => {
    it('should create AudioFile for valid files', () => {
      const file = createTestFile('test.mp3', 2048)
      const audioFile = createAudioFile(file)

      expect(audioFile).not.toBeNull()
      expect(audioFile!.file).toBe(file)
      expect(audioFile!.name).toBe('test.mp3')
      expect(audioFile!.size).toBe(2048)
      expect(audioFile!.format).toBe('mp3')
      expect(audioFile!.duration).toBe(0) // Will be set after loading
    })

    it('should return null for invalid files', () => {
      const file = createTestFile('test.txt')
      const audioFile = createAudioFile(file)

      expect(audioFile).toBeNull()
    })

    it('should handle files with complex names', () => {
      const file = createTestFile('My Song (Remix) [2024].mp3')
      const audioFile = createAudioFile(file)

      expect(audioFile).not.toBeNull()
      expect(audioFile!.name).toBe('My Song (Remix) [2024].mp3')
      expect(audioFile!.format).toBe('mp3')
    })
  })

  describe('getFileExtension edge cases', () => {
    it('should extract extensions correctly', () => {
      const testCases = [
        { filename: 'song.mp3', expected: 'mp3' },
        { filename: 'track.backup.wav', expected: 'wav' },
        { filename: 'AUDIO.FLAC', expected: 'flac' },
        { filename: 'music.M4A', expected: 'm4a' },
        { filename: '.hidden.mp3', expected: 'mp3' },
        { filename: 'noextension', expected: '' },
        { filename: 'file.', expected: '' },
        { filename: '', expected: '' },
        { filename: '.', expected: '' },
        { filename: '..', expected: '' },
        { filename: 'file..mp3', expected: 'mp3' }
      ]

      testCases.forEach(({ filename, expected }) => {
        expect(getFileExtension(filename)).toBe(expected)
      })
    })

    it('should handle very long extensions', () => {
      const longExt = 'a'.repeat(10)
      const filename = `file.${longExt}`
      expect(getFileExtension(filename)).toBe(longExt)
    })

    it('should handle extensions with numbers', () => {
      const filename = 'file.mp3'
      expect(getFileExtension(filename)).toBe('mp3')
    })
  })

  describe('Boundary conditions', () => {
    it('should handle file at exact size boundary', () => {
      const boundarySize = MAX_FILE_SIZE
      const file = createTestFile('boundary.mp3', boundarySize)
      const result = validateAudioFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should handle all supported formats at maximum size', () => {
      SUPPORTED_FORMATS.forEach(format => {
        const filename = `test.${format}`
        const file = createTestFile(filename, MAX_FILE_SIZE)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle minimum valid file size for all formats', () => {
      SUPPORTED_FORMATS.forEach(format => {
        const filename = `test.${format}`
        const file = createTestFile(filename, 1) // 1 byte
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Error message consistency', () => {
    it('should provide consistent error messages for unsupported formats', () => {
      const unsupportedFiles = [
        'test.aac',
        'test.ogg',
        'test.wma'
      ]

      unsupportedFiles.forEach(filename => {
        const file = createTestFile(filename)
        const result = validateAudioFile(file)
        expect(result.isValid).toBe(false)
        expect(result.error).toMatch(/^Unsupported file format/)
        expect(result.error).toContain('Supported formats:')
        expect(result.error).toContain('MP3, WAV, FLAC, M4A')
      })
    })

    it('should provide consistent error messages for oversized files', () => {
      const oversizedFile = createTestFile('large.mp3', MAX_FILE_SIZE + 1000)
      const result = validateAudioFile(oversizedFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('exceeds maximum limit')
      expect(result.error).toContain(`${MAX_FILE_SIZE / 1024 / 1024}MB`)
    })

    it('should provide consistent error message for empty files', () => {
      const emptyFile = createTestFile('empty.mp3', 0)
      const result = validateAudioFile(emptyFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File is empty')
    })
  })
})