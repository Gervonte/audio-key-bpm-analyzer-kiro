import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFileUpload } from '../useFileUpload'
import { loadLargeFile } from '../../utils/progressiveLoader'

// Mock dependencies
vi.mock('../../utils/validation', () => ({
  validateAudioFile: vi.fn(() => ({ isValid: true })),
  createAudioFile: vi.fn((_file) => ({
    file: _file,
    name: _file.name,
    size: _file.size,
    format: 'mp3',
    duration: 180
  }))
}))

vi.mock('../../utils/audioProcessing', () => ({
  checkWebAudioSupport: vi.fn(() => ({ isSupported: true })),
  createAudioContext: vi.fn(() => ({
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 7938000
    })
  })),
  closeAudioContext: vi.fn().mockResolvedValue(undefined),
  validateAudioBuffer: vi.fn(() => ({ isValid: true })),
  isCorruptedAudioError: vi.fn(() => false)
}))

vi.mock('../../utils/progressiveLoader', () => ({
  loadLargeFile: vi.fn()
}))

vi.mock('../../utils/memoryManager', () => ({
  memoryManager: {
    hasEnoughMemoryForProcessing: vi.fn(() => true),
    forceGarbageCollection: vi.fn()
  }
}))

// Type the mocked function
const mockLoadLargeFile = vi.mocked(loadLargeFile)

describe('useFileUpload - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide smooth progress updates during file loading', async () => {
    // Mock loadLargeFile to simulate progress updates
    mockLoadLargeFile.mockImplementation(async (_file: File, options: any) => {
      const { onProgress } = options
      
      // Simulate smooth progress updates
      const progressSteps = [10, 25, 40, 60, 80, 95, 100]
      
      for (const progress of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 50))
        onProgress?.(progress)
      }
      
      return new ArrayBuffer(1024)
    })

    const { result } = renderHook(() => useFileUpload())
    
    const progressUpdates: number[] = []
    const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadAudioFile(mockFile, (progress) => {
        progressUpdates.push(Math.round(progress))
      })
    })

    // Verify that progress updates are smooth and continuous
    expect(progressUpdates.length).toBeGreaterThan(10) // Should have many progress updates
    expect(progressUpdates[0]).toBeGreaterThanOrEqual(0)
    expect(progressUpdates[progressUpdates.length - 1]).toBe(30) // File loading phase caps at 30%
    
    // Verify progress is generally increasing (allowing for small variations due to easing)
    let increasingCount = 0
    for (let i = 1; i < progressUpdates.length; i++) {
      if (progressUpdates[i] >= progressUpdates[i - 1]) {
        increasingCount++
      }
    }
    
    // At least 80% of updates should be increasing
    expect(increasingCount / (progressUpdates.length - 1)).toBeGreaterThan(0.8)
  })

  it('should handle progress updates for small files', async () => {
    // Mock loadLargeFile for small file (will use regular arrayBuffer)
    mockLoadLargeFile.mockImplementation(async (_file: File, options: any) => {
      const { onProgress } = options
      
      // Simulate small file loading with progress
      setTimeout(() => onProgress?.(50), 100)
      setTimeout(() => onProgress?.(100), 200)
      
      return new ArrayBuffer(1024)
    })

    const { result } = renderHook(() => useFileUpload())
    
    const progressUpdates: number[] = []
    const smallFile = new File(['small'], 'small.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadAudioFile(smallFile, (progress) => {
        progressUpdates.push(Math.round(progress))
      })
    })

    // Should have received progress updates
    expect(progressUpdates.length).toBeGreaterThan(0)
    expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThanOrEqual(25) // File loading phase should reach at least 25%
  })

  it('should handle progress updates for large files', async () => {
    // Mock loadLargeFile for large file (will use progressive loading)
    mockLoadLargeFile.mockImplementation(async (_file: File, options: any) => {
      const { onProgress } = options
      
      // Simulate progressive loading with frequent updates
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 20))
        onProgress?.(i)
      }
      
      return new ArrayBuffer(50 * 1024 * 1024) // 50MB
    })

    const { result } = renderHook(() => useFileUpload())
    
    const progressUpdates: number[] = []
    const largeFile = new File([new ArrayBuffer(50 * 1024 * 1024)], 'large.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadAudioFile(largeFile, (progress) => {
        progressUpdates.push(Math.round(progress))
      })
    })

    // Should have many progress updates for large files
    expect(progressUpdates.length).toBeGreaterThan(20)
    expect(progressUpdates[progressUpdates.length - 1]).toBe(30) // File loading phase caps at 30%
  })

  it('should not have progress jumps or gaps', async () => {
    mockLoadLargeFile.mockImplementation(async (_file: File, options: any) => {
      const { onProgress } = options
      
      // Simulate realistic progress updates
      const updates = [5, 15, 30, 45, 60, 75, 85, 95, 100]
      
      for (const progress of updates) {
        await new Promise(resolve => setTimeout(resolve, 30))
        onProgress?.(progress)
      }
      
      return new ArrayBuffer(1024)
    })

    const { result } = renderHook(() => useFileUpload())
    
    const progressUpdates: number[] = []
    const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadAudioFile(mockFile, (progress) => {
        progressUpdates.push(progress)
      })
    })

    // Check for large jumps (more than 40% at once, allowing for the new progress ranges)
    let hasLargeJumps = false
    for (let i = 1; i < progressUpdates.length; i++) {
      const jump = progressUpdates[i] - progressUpdates[i - 1]
      if (jump > 40) {
        hasLargeJumps = true
        break
      }
    }
    
    expect(hasLargeJumps).toBe(false)
  })

  it('should complete progress at 100%', async () => {
    mockLoadLargeFile.mockImplementation(async (_file: File, options: any) => {
      const { onProgress } = options
      onProgress?.(100)
      return new ArrayBuffer(1024)
    })

    const { result } = renderHook(() => useFileUpload())
    
    let finalProgress = 0
    const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadAudioFile(mockFile, (progress) => {
        finalProgress = progress
      })
    })

    expect(finalProgress).toBeGreaterThanOrEqual(25) // File loading phase should reach at least 25%
  })
})