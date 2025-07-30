// Unit tests for useBPMDetection hook

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBPMDetection } from '../useBPMDetection'

// Mock the Web Worker
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((error: ErrorEvent) => void) | null
}

  // Mock Worker constructor
  ; (globalThis as any).Worker = vi.fn().mockImplementation(() => mockWorker)

  // Mock URL constructor and createObjectURL for worker creation
  ; (globalThis as any).URL = class MockURL {
    constructor(url: string, _base?: string) {
      return { href: url, toString: () => url }
    }
    static createObjectURL = vi.fn().mockReturnValue('mock-worker-url')
  }

// Helper function to create test AudioBuffer
function createTestAudioBuffer(sampleRate: number = 44100, duration: number = 5): AudioBuffer {
  const length = sampleRate * duration
  const audioBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length,
    sampleRate
  })

  const channelData = audioBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate
    channelData[i] = Math.sin(2 * Math.PI * 440 * time) * 0.5
  }

  return audioBuffer
}

describe('useBPMDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock worker state
    mockWorker.onmessage = null
    mockWorker.onerror = null
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useBPMDetection())

    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.detectBPM).toBe('function')
    expect(typeof result.current.cancelDetection).toBe('function')
  })

  it('should start BPM detection and create worker', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    act(() => {
      result.current.detectBPM(audioBuffer)
    })

    expect(result.current.isDetecting).toBe(true)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
    expect((globalThis as any).Worker).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('bpmWorker.ts')
      }),
      { type: 'module' }
    )
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'DETECT_BPM',
      audioBufferData: {
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length,
        numberOfChannels: audioBuffer.numberOfChannels,
        channelData: expect.any(Array)
      }
    })
  })

  it('should handle successful BPM detection result', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    const mockResult = {
      bpm: 120,
      confidence: 0.85,
      detectedBeats: 10
    }

    let detectPromise: Promise<any>

    act(() => {
      detectPromise = result.current.detectBPM(audioBuffer)
    })

    // Simulate worker success response
    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'BPM_RESULT',
            result: mockResult
          }
        } as MessageEvent)
      }
    })

    const detectionResult = await detectPromise!

    expect(detectionResult).toEqual(mockResult)
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(100)
    expect(result.current.error).toBe(null)
    expect(mockWorker.terminate).toHaveBeenCalled()
  })

  it('should handle BPM detection error', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    const errorMessage = 'BPM detection failed'
    let detectPromise: Promise<any>
    let detectionError: unknown = null

    act(() => {
      detectPromise = result.current.detectBPM(audioBuffer).catch(error => {
        detectionError = error
        throw error
      })
    })

    // Simulate worker error response
    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'BPM_ERROR',
            error: errorMessage
          }
        } as MessageEvent)
      }
    })

    await expect(detectPromise!).rejects.toThrow(errorMessage)

    expect(detectionError).toBeInstanceOf(Error)
    expect((detectionError as Error)?.message).toBe(errorMessage)
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(errorMessage)
    expect(mockWorker.terminate).toHaveBeenCalled()
  })

  it('should handle worker onerror', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    let detectPromise: Promise<any>
    let detectionError: unknown = null

    act(() => {
      detectPromise = result.current.detectBPM(audioBuffer).catch(error => {
        detectionError = error
        throw error
      })
    })

    // Simulate worker error
    act(() => {
      if (mockWorker.onerror) {
        mockWorker.onerror({} as ErrorEvent)
      }
    })

    await expect(detectPromise!).rejects.toThrow('BPM detection worker error')

    expect(detectionError).toBeInstanceOf(Error)
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe('BPM detection worker error')
  })

  it('should handle timeout after 30 seconds', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    let detectPromise: Promise<any>
    let detectionError: unknown = null

    act(() => {
      detectPromise = result.current.detectBPM(audioBuffer).catch(error => {
        detectionError = error
        throw error
      })
    })

    // Fast-forward time to trigger timeout
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await expect(detectPromise!).rejects.toThrow('BPM detection timed out after 30 seconds')

    expect(detectionError).toBeInstanceOf(Error)
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(0)

    vi.useRealTimers()
  })

  it('should update progress during detection', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    act(() => {
      result.current.detectBPM(audioBuffer)
    })

    expect(result.current.progress).toBe(0)

    // Advance time to trigger progress updates
    act(() => {
      vi.advanceTimersByTime(1000) // 1 second
    })

    expect(result.current.progress).toBeGreaterThan(0)
    expect(result.current.progress).toBeLessThan(100)

    vi.useRealTimers()
  })

  it('should cancel detection properly', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    act(() => {
      result.current.detectBPM(audioBuffer)
    })

    expect(result.current.isDetecting).toBe(true)

    act(() => {
      result.current.cancelDetection()
    })

    expect(result.current.isDetecting).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
    expect(mockWorker.terminate).toHaveBeenCalled()
  })

  it('should cancel previous detection when starting new one', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer1 = createTestAudioBuffer()
    const audioBuffer2 = createTestAudioBuffer()

    // Start first detection
    act(() => {
      result.current.detectBPM(audioBuffer1)
    })

    expect(result.current.isDetecting).toBe(true)
    const firstWorkerTerminate = mockWorker.terminate

    // Start second detection (should cancel first)
    act(() => {
      result.current.detectBPM(audioBuffer2)
    })

    expect(firstWorkerTerminate).toHaveBeenCalled()
    expect(result.current.isDetecting).toBe(true)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
  })

  it('should handle stereo audio buffer correctly', async () => {
    const { result } = renderHook(() => useBPMDetection())

    // Create stereo audio buffer
    const audioBuffer = new AudioBuffer({
      numberOfChannels: 2,
      length: 44100 * 2, // 2 seconds
      sampleRate: 44100
    })

    // Fill both channels
    for (let channel = 0; channel < 2; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        const time = i / 44100
        channelData[i] = Math.sin(2 * Math.PI * 440 * time) * 0.5
      }
    }

    act(() => {
      result.current.detectBPM(audioBuffer)
    })

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'DETECT_BPM',
      audioBufferData: {
        sampleRate: 44100,
        length: 44100 * 2,
        numberOfChannels: 2,
        channelData: expect.arrayContaining([
          expect.any(Float32Array),
          expect.any(Float32Array)
        ])
      }
    })
  })

  it('should handle multiple rapid detection calls', async () => {
    const { result } = renderHook(() => useBPMDetection())
    const audioBuffer = createTestAudioBuffer()

    // Start multiple detections rapidly
    act(() => {
      result.current.detectBPM(audioBuffer)
      result.current.detectBPM(audioBuffer)
      result.current.detectBPM(audioBuffer)
    })

    // Should only have one active detection
    expect(result.current.isDetecting).toBe(true)
    expect(mockWorker.terminate).toHaveBeenCalledTimes(2) // Previous ones terminated
  })
})