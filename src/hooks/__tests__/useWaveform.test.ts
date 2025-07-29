import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useWaveform } from '../useWaveform'

// Mock AudioBuffer for testing
const createMockAudioBuffer = (duration: number = 10, sampleRate: number = 44100): AudioBuffer => {
    const samples = duration * sampleRate
    const channelData = new Float32Array(samples)

    // Generate some test waveform data (sine wave)
    for (let i = 0; i < samples; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
    }

    return {
        duration,
        sampleRate,
        numberOfChannels: 1,
        length: samples,
        getChannelData: (_channel: number) => channelData,
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn()
    } as unknown as AudioBuffer
}

// Mock canvas context
const createMockCanvas = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 200

    const mockContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        scale: vi.fn(),
        set fillStyle(_value: string) { },
        set strokeStyle(_value: string) { },
        set lineWidth(_value: number) { }
    }

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any)

    return { canvas, mockContext }
}

describe('useWaveform', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('generateWaveformData', () => {
        it('should generate waveform data from AudioBuffer', () => {
            const { result } = renderHook(() => useWaveform())
            const mockAudioBuffer = createMockAudioBuffer(5, 44100)

            const waveformData = result.current.generateWaveformData(mockAudioBuffer)

            expect(waveformData).toEqual({
                peaks: expect.any(Array),
                duration: 5,
                sampleRate: 44100,
                channels: 1
            })

            expect(waveformData.peaks.length).toBeGreaterThan(0)
            expect(waveformData.peaks.length).toBeLessThanOrEqual(2100) // Allow some flexibility

            // All peaks should be between 0 and 1
            waveformData.peaks.forEach(peak => {
                expect(peak).toBeGreaterThanOrEqual(0)
                expect(peak).toBeLessThanOrEqual(1)
            })
        })

        it('should handle different audio buffer sizes', () => {
            const { result } = renderHook(() => useWaveform())

            // Test short audio
            const shortBuffer = createMockAudioBuffer(1, 44100)
            const shortData = result.current.generateWaveformData(shortBuffer)
            expect(shortData.peaks.length).toBeGreaterThan(0)

            // Test long audio
            const longBuffer = createMockAudioBuffer(60, 44100)
            const longData = result.current.generateWaveformData(longBuffer)
            expect(longData.peaks.length).toBeGreaterThan(0)
            expect(longData.peaks.length).toBeLessThanOrEqual(2100) // Allow some flexibility
        })

        it('should generate peaks with correct amplitude values', () => {
            const { result } = renderHook(() => useWaveform())

            // Create buffer with known amplitude
            const mockBuffer = createMockAudioBuffer(1, 1000)
            const waveformData = result.current.generateWaveformData(mockBuffer)

            // Should have some non-zero peaks for sine wave
            const nonZeroPeaks = waveformData.peaks.filter(peak => peak > 0)
            expect(nonZeroPeaks.length).toBeGreaterThan(0)
        })
    })

    describe('drawWaveform', () => {
        it('should draw waveform on canvas', () => {
            const { result } = renderHook(() => useWaveform())
            const { canvas, mockContext } = createMockCanvas()

            const waveformData = {
                peaks: [0.5, 0.8, 0.3, 0.9, 0.1],
                duration: 5,
                sampleRate: 44100,
                channels: 1
            }

            result.current.drawWaveform(canvas, waveformData)

            expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 200)
            expect(mockContext.fillRect).toHaveBeenCalled()

            // Should draw one rectangle per peak
            expect(mockContext.fillRect).toHaveBeenCalledTimes(waveformData.peaks.length)
        })

        it('should draw progress overlay when progress is provided', () => {
            const { result } = renderHook(() => useWaveform())
            const { canvas, mockContext } = createMockCanvas()

            const waveformData = {
                peaks: [0.5, 0.8, 0.3, 0.9, 0.1],
                duration: 5,
                sampleRate: 44100,
                channels: 1
            }

            result.current.drawWaveform(canvas, waveformData, 0.5)

            // Should draw progress overlay
            expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 400, 200) // 50% of 800px width
            expect(mockContext.beginPath).toHaveBeenCalled()
            expect(mockContext.moveTo).toHaveBeenCalledWith(400, 0)
            expect(mockContext.lineTo).toHaveBeenCalledWith(400, 200)
            expect(mockContext.stroke).toHaveBeenCalled()
        })

        it('should handle empty peaks array', () => {
            const { result } = renderHook(() => useWaveform())
            const { canvas, mockContext } = createMockCanvas()

            const waveformData = {
                peaks: [],
                duration: 0,
                sampleRate: 44100,
                channels: 1
            }

            result.current.drawWaveform(canvas, waveformData)

            expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 200)
            // Should not draw any bars for empty peaks
            expect(mockContext.fillRect).not.toHaveBeenCalled()
        })

        it('should handle canvas without context', () => {
            const { result } = renderHook(() => useWaveform())
            const canvas = document.createElement('canvas')
            vi.spyOn(canvas, 'getContext').mockReturnValue(null)

            const waveformData = {
                peaks: [0.5, 0.8],
                duration: 2,
                sampleRate: 44100,
                channels: 1
            }

            // Should not throw error
            expect(() => {
                result.current.drawWaveform(canvas, waveformData)
            }).not.toThrow()
        })
    })

    describe('canvasRef', () => {
        it('should provide a canvas ref', () => {
            const { result } = renderHook(() => useWaveform())

            expect(result.current.canvasRef).toBeDefined()
            expect(result.current.canvasRef.current).toBeNull() // Initially null
        })
    })

    describe('isGenerating', () => {
        it('should track generation state', () => {
            const { result } = renderHook(() => useWaveform())

            expect(result.current.isGenerating).toBe(false)

            // Generate waveform data
            const mockBuffer = createMockAudioBuffer(1, 1000)
            result.current.generateWaveformData(mockBuffer)

            // Should be false after synchronous generation
            expect(result.current.isGenerating).toBe(false)
        })
    })
})