// Unit tests for useAudioProcessor hook

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioProcessor, useProcessingState } from '../useAudioProcessor'
import type { AnalysisResult } from '../../types'

// Mock AudioProcessor
const mockProcessAudio = vi.fn()
const mockCancelProcessing = vi.fn()

vi.mock('../../utils/audioProcessor', () => ({
    AudioProcessor: vi.fn().mockImplementation(() => ({
        processAudio: mockProcessAudio,
        cancelProcessing: mockCancelProcessing
    }))
}))

// Mock AudioBuffer
const createMockAudioBuffer = (): AudioBuffer => ({
    duration: 10,
    sampleRate: 44100,
    numberOfChannels: 2,
    length: 441000,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(441000))
} as unknown as AudioBuffer)

const mockAnalysisResult: AnalysisResult = {
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
    },
    processingTime: 1500
}

describe('useAudioProcessor', () => {
    let mockAudioBuffer: AudioBuffer

    beforeEach(() => {
        mockAudioBuffer = createMockAudioBuffer()
        vi.clearAllMocks()

        // Default successful mock
        mockProcessAudio.mockImplementation(async (_audioBuffer, options) => {
            // Simulate progress updates
            if (options?.onProgress) {
                options.onProgress(10)
                options.onProgress(50)
                options.onProgress(100)
            }
            return mockAnalysisResult
        })
    })

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const { result } = renderHook(() => useAudioProcessor())

            expect(result.current.isProcessing).toBe(false)
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(null)
            expect(typeof result.current.processAudio).toBe('function')
            expect(typeof result.current.cancelProcessing).toBe('function')
            expect(typeof result.current.resetState).toBe('function')
        })
    })

    describe('processAudio', () => {
        it('should successfully process audio', async () => {
            const { result } = renderHook(() => useAudioProcessor())

            let analysisResult: AnalysisResult | undefined

            await act(async () => {
                analysisResult = await result.current.processAudio(mockAudioBuffer)
            })

            expect(analysisResult).toEqual(mockAnalysisResult)
            expect(result.current.isProcessing).toBe(false)
            expect(result.current.progress).toBe(100)
            expect(result.current.error).toBe(null)
        })

        it('should handle processing errors', async () => {
            const { result } = renderHook(() => useAudioProcessor())
            const errorMessage = 'Processing failed'

            mockProcessAudio.mockRejectedValue(new Error(errorMessage))

            await act(async () => {
                try {
                    await result.current.processAudio(mockAudioBuffer)
                } catch (error) {
                    // Expected error
                }
            })

            expect(result.current.isProcessing).toBe(false)
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(errorMessage)
        })

        it('should handle timeout errors with custom message', async () => {
            const { result } = renderHook(() => useAudioProcessor())

            mockProcessAudio.mockRejectedValue(new Error('Processing timed out after 30 seconds'))

            await act(async () => {
                try {
                    await result.current.processAudio(mockAudioBuffer)
                } catch (error) {
                    // Expected error
                }
            })

            expect(result.current.error).toBe('Audio processing timed out after 30 seconds. Please try with a shorter audio file (under 5 minutes) or a less complex track.')
        })

        it('should handle key detection errors', async () => {
            const { result } = renderHook(() => useAudioProcessor())

            mockProcessAudio.mockRejectedValue(new Error('Key detection failed'))

            await act(async () => {
                try {
                    await result.current.processAudio(mockAudioBuffer)
                } catch (error) {
                    // Expected error
                }
            })

            expect(result.current.error).toBe('Unable to detect the musical key. The audio may not contain clear harmonic content or may be too noisy. Try using an instrumental track with distinct musical elements.')
        })

        it('should handle BPM detection errors', async () => {
            const { result } = renderHook(() => useAudioProcessor())

            mockProcessAudio.mockRejectedValue(new Error('BPM detection failed'))

            await act(async () => {
                try {
                    await result.current.processAudio(mockAudioBuffer)
                } catch (error) {
                    // Expected error
                }
            })

            expect(result.current.error).toBe('Unable to detect the BPM. The audio may not have a clear rhythmic pattern or steady beat. Try using a track with a more prominent drum pattern.')
        })
    })

    describe('cancelProcessing', () => {
        it('should cancel processing and reset state', () => {
            const { result } = renderHook(() => useAudioProcessor())

            act(() => {
                result.current.cancelProcessing()
            })

            expect(mockCancelProcessing).toHaveBeenCalled()
            expect(result.current.isProcessing).toBe(false)
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(null)
        })
    })

    describe('resetState', () => {
        it('should reset all state values', () => {
            const { result } = renderHook(() => useAudioProcessor())

            act(() => {
                result.current.resetState()
            })

            expect(result.current.isProcessing).toBe(false)
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(null)
        })
    })
})

describe('useProcessingState', () => {
    it('should manage processing state correctly', () => {
        const { result } = renderHook(() => useProcessingState())

        expect(result.current.processingState).toEqual({
            isProcessing: false,
            progress: 0,
            error: null,
            stage: 'idle'
        })

        act(() => {
            result.current.updateProcessingState({
                isProcessing: true,
                stage: 'analyzing',
                progress: 50
            })
        })

        expect(result.current.processingState).toEqual({
            isProcessing: true,
            progress: 50,
            error: null,
            stage: 'analyzing'
        })

        act(() => {
            result.current.resetProcessingState()
        })

        expect(result.current.processingState).toEqual({
            isProcessing: false,
            progress: 0,
            error: null,
            stage: 'idle'
        })
    })
})