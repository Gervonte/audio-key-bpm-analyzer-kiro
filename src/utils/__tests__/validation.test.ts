import { describe, it, expect } from 'vitest'
import {
  validateAudioFile,
  createAudioFile,
  formatFileSize,
  formatConfidence,
  getFileExtension,
  validateBPMResult,
  validateKeyResult,
  validateWaveformData,
  validateAnalysisResult
} from '../validation'
import {
  TEST_FILES
} from '../test-validation'
import { MAX_FILE_SIZE, SUPPORTED_FORMATS } from '../../types'
import type { BPMResult, KeyResult, WaveformData, AnalysisResult } from '../../types'

describe('validateAudioFile', () => {
  it('should validate supported audio formats', () => {
    const mp3File = TEST_FILES.validMp3
    const wavFile = TEST_FILES.validWav
    const flacFile = TEST_FILES.validFlac
    const m4aFile = TEST_FILES.validM4a

    expect(validateAudioFile(mp3File)).toEqual({ isValid: true })
    expect(validateAudioFile(wavFile)).toEqual({ isValid: true })
    expect(validateAudioFile(flacFile)).toEqual({ isValid: true })
    expect(validateAudioFile(m4aFile)).toEqual({ isValid: true })
  })

  it('should reject unsupported file formats', () => {
    const unsupportedFile = TEST_FILES.unsupported
    const result = validateAudioFile(unsupportedFile)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Unsupported file format')
    expect(result.error).toContain(SUPPORTED_FORMATS.join(', ').toUpperCase())
  })

  it('should reject files exceeding size limit', () => {
    const oversizedFile = TEST_FILES.oversized
    const result = validateAudioFile(oversizedFile)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('exceeds maximum limit')
    expect(result.error).toContain(`${MAX_FILE_SIZE / 1024 / 1024}MB`)
  })

  it('should reject empty files', () => {
    const emptyFile = TEST_FILES.empty
    const result = validateAudioFile(emptyFile)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('File is empty')
  })

  it('should handle files without extensions', () => {
    const noExtensionFile = TEST_FILES.noExtension
    const result = validateAudioFile(noExtensionFile)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Unsupported file format')
  })

  it('should handle files with multiple extensions', () => {
    const multipleExtensionsFile = TEST_FILES.multipleExtensions
    const result = validateAudioFile(multipleExtensionsFile)

    expect(result.isValid).toBe(true)
  })

  it('should handle uppercase file extensions', () => {
    const uppercaseFile = TEST_FILES.uppercaseExtension
    const result = validateAudioFile(uppercaseFile)

    expect(result.isValid).toBe(true)
  })
})

describe('createAudioFile', () => {
  it('should create AudioFile object for valid files', () => {
    const validFile = TEST_FILES.validMp3
    const audioFile = createAudioFile(validFile)

    expect(audioFile).not.toBeNull()
    expect(audioFile?.file).toBe(validFile)
    expect(audioFile?.name).toBe(validFile.name)
    expect(audioFile?.size).toBe(validFile.size)
    expect(audioFile?.format).toBe('mp3')
    expect(audioFile?.duration).toBe(0) // Will be set after audio loading
  })

  it('should return null for invalid files', () => {
    const invalidFile = TEST_FILES.unsupported
    const audioFile = createAudioFile(invalidFile)

    expect(audioFile).toBeNull()
  })
})

describe('getFileExtension', () => {
  it('should extract file extensions correctly', () => {
    expect(getFileExtension('song.mp3')).toBe('mp3')
    expect(getFileExtension('song.wav')).toBe('wav')
    expect(getFileExtension('song.backup.flac')).toBe('flac')
    expect(getFileExtension('SONG.MP3')).toBe('mp3')
    expect(getFileExtension('noextension')).toBe('')
    expect(getFileExtension('')).toBe('')
  })
})

describe('formatFileSize', () => {
  it('should format file sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('formatConfidence', () => {
  it('should format confidence scores as percentages', () => {
    expect(formatConfidence(0)).toBe('0%')
    expect(formatConfidence(0.5)).toBe('50%')
    expect(formatConfidence(0.85)).toBe('85%')
    expect(formatConfidence(1)).toBe('100%')
    expect(formatConfidence(0.123)).toBe('12%')
    expect(formatConfidence(0.999)).toBe('100%')
  })
})

describe('validateBPMResult', () => {
  it('should validate correct BPM results', () => {
    const validBPM: BPMResult = {
      bpm: 120,
      confidence: 0.85,
      detectedBeats: 240
    }

    expect(validateBPMResult(validBPM)).toEqual({ isValid: true })
  })

  it('should reject invalid BPM values', () => {
    const invalidBPM = { bpm: NaN, confidence: 0.5, detectedBeats: 100 }
    const result = validateBPMResult(invalidBPM)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('BPM must be a valid number')
  })

  it('should reject BPM outside valid range', () => {
    const lowBPM = { bpm: 30, confidence: 0.5, detectedBeats: 100 }
    const highBPM = { bpm: 300, confidence: 0.5, detectedBeats: 100 }

    expect(validateBPMResult(lowBPM).isValid).toBe(false)
    expect(validateBPMResult(highBPM).isValid).toBe(false)
  })

  it('should reject invalid confidence values', () => {
    const invalidConfidence = { bpm: 120, confidence: 1.5, detectedBeats: 100 }
    const result = validateBPMResult(invalidConfidence)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('confidence must be between 0 and 1')
  })

  it('should reject negative detected beats', () => {
    const negativeBeats = { bpm: 120, confidence: 0.5, detectedBeats: -10 }
    const result = validateBPMResult(negativeBeats)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('non-negative number')
  })
})

describe('validateKeyResult', () => {
  it('should validate correct key results', () => {
    const validKey: KeyResult = {
      keyName: 'C Major',
      keySignature: 'C',
      confidence: 0.9,
      mode: 'major'
    }

    expect(validateKeyResult(validKey)).toEqual({ isValid: true })
  })

  it('should reject missing key name', () => {
    const invalidKey = { keySignature: 'C', confidence: 0.9, mode: 'major' as const }
    const result = validateKeyResult(invalidKey)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Key name is required')
  })

  it('should reject invalid mode', () => {
    const invalidKey = {
      keyName: 'C Major',
      keySignature: 'C',
      confidence: 0.9,
      mode: 'invalid' as any
    }
    const result = validateKeyResult(invalidKey)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('must be either "major" or "minor"')
  })
})

describe('validateWaveformData', () => {
  it('should validate correct waveform data', () => {
    const validWaveform: WaveformData = {
      peaks: [0.1, 0.5, 0.3, 0.8],
      duration: 180,
      sampleRate: 44100,
      channels: 2
    }

    expect(validateWaveformData(validWaveform)).toEqual({ isValid: true })
  })

  it('should reject empty peaks array', () => {
    const invalidWaveform = {
      peaks: [],
      duration: 180,
      sampleRate: 44100,
      channels: 2
    }
    const result = validateWaveformData(invalidWaveform)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('cannot be empty')
  })

  it('should reject invalid channel count', () => {
    const invalidWaveform = {
      peaks: [0.1, 0.5],
      duration: 180,
      sampleRate: 44100,
      channels: 3
    }
    const result = validateWaveformData(invalidWaveform)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('must be 1 (mono) or 2 (stereo)')
  })
})

describe('validateAnalysisResult', () => {
  it('should validate complete analysis result', () => {
    const validResult: AnalysisResult = {
      key: {
        keyName: 'C Major',
        keySignature: 'C',
        confidence: 0.9,
        mode: 'major'
      },
      bpm: {
        bpm: 120,
        confidence: 0.85,
        detectedBeats: 240
      },
      confidence: {
        overall: 0.87,
        key: 0.9,
        bpm: 0.85
      },
      processingTime: 5000
    }

    expect(validateAnalysisResult(validResult)).toEqual({ isValid: true })
  })

  it('should reject analysis result without key data', () => {
    const invalidResult = {
      bpm: { bpm: 120, confidence: 0.85, detectedBeats: 240 },
      processingTime: 5000
    }
    const result = validateAnalysisResult(invalidResult)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('must include key data')
  })

  it('should reject negative processing time', () => {
    const invalidResult = {
      key: {
        keyName: 'C Major',
        keySignature: 'C',
        confidence: 0.9,
        mode: 'major' as const
      },
      bpm: {
        bpm: 120,
        confidence: 0.85,
        detectedBeats: 240
      },
      processingTime: -1000
    }
    const result = validateAnalysisResult(invalidResult)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('non-negative number')
  })
})