import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFileUpload } from '../useFileUpload'
import { TEST_FILES } from '../../utils/test-validation'

// Mock audio processing utilities with simple implementations
vi.mock('../../utils/audioProcessing', () => ({
    checkWebAudioSupport: vi.fn(() => ({ isSupported: true })),
    createAudioContext: vi.fn(() => ({
        decodeAudioData: vi.fn().mockResolvedValue({
            duration: 180,
            sampleRate: 44100,
            numberOfChannels: 2,
            length: 7938000
        }),
        close: vi.fn().mockResolvedValue(undefined)
    })),
    closeAudioContext: vi.fn().mockResolvedValue(undefined),
    validateAudioBuffer: vi.fn(() => ({ isValid: true })),
    preprocessAudioBuffer: vi.fn((buffer) => buffer),
    isCorruptedAudioError: vi.fn(() => false),
    extractAudioMetadata: vi.fn(() => ({
        duration: 180,
        sampleRate: 44100,
        channels: 2,
        length: 7938000
    }))
}))

describe('useFileUpload', () => {

    describe('basic functionality', () => {
        it('should initialize with correct default values', () => {
            const { result } = renderHook(() => useFileUpload())

            expect(result.current.isLoading).toBe(false)
            expect(result.current.error).toBe(null)
            expect(typeof result.current.validateFile).toBe('function')
            expect(typeof result.current.loadAudioFile).toBe('function')
            expect(typeof result.current.getSupportedFormats).toBe('function')
            expect(typeof result.current.createAudioFileObject).toBe('function')
            expect(typeof result.current.checkBrowserCompatibility).toBe('function')
        })

        it('should return browser compatibility status', () => {
            const { result } = renderHook(() => useFileUpload())

            const compatibility = result.current.checkBrowserCompatibility()
            expect(compatibility.isSupported).toBe(true)
        })

        it('should validate supported audio files', () => {
            const { result } = renderHook(() => useFileUpload())

            const validation = result.current.validateFile(TEST_FILES.validMp3)
            expect(validation.isValid).toBe(true)
        })

        it('should reject unsupported file formats', () => {
            const { result } = renderHook(() => useFileUpload())

            const validation = result.current.validateFile(TEST_FILES.unsupported)
            expect(validation.isValid).toBe(false)
            expect(validation.error).toContain('Unsupported file format')
        })

        it('should return supported audio formats', () => {
            const { result } = renderHook(() => useFileUpload())

            const formats = result.current.getSupportedFormats()
            expect(formats).toEqual(['mp3', 'wav', 'flac', 'm4a'])
        })

        it('should create AudioFile object for valid files', () => {
            const { result } = renderHook(() => useFileUpload())

            const audioFile = result.current.createAudioFileObject(TEST_FILES.validMp3)
            expect(audioFile).toEqual({
                file: TEST_FILES.validMp3,
                name: TEST_FILES.validMp3.name,
                size: TEST_FILES.validMp3.size,
                format: 'mp3',
                duration: 0
            })
        })

        it('should return null for invalid files', () => {
            const { result } = renderHook(() => useFileUpload())

            const audioFile = result.current.createAudioFileObject(TEST_FILES.unsupported)
            expect(audioFile).toBeNull()
        })
    })
})