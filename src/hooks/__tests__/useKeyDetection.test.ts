import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyDetection } from '../useKeyDetection'

// Mock Worker and URL for testing environment
const mockWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  terminate: vi.fn()
}

vi.stubGlobal('Worker', vi.fn(() => mockWorker))
vi.stubGlobal('URL', vi.fn(() => ({ href: 'mock-url' })))

// Mock import.meta.url
Object.defineProperty(import.meta, 'url', {
  value: 'file:///test/useKeyDetection.test.ts',
  writable: true
})

describe('useKeyDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useKeyDetection())

    expect(result.current.isDetecting).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.progress).toBe(0)
    expect(typeof result.current.detectKey).toBe('function')
  })

  it('should have detectKey function', () => {
    const { result } = renderHook(() => useKeyDetection())
    
    expect(result.current.detectKey).toBeDefined()
    expect(typeof result.current.detectKey).toBe('function')
  })

  it('should maintain state correctly', () => {
    const { result } = renderHook(() => useKeyDetection())
    
    // Initial state
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.progress).toBe(0)
  })

  it('should provide consistent interface', () => {
    const { result } = renderHook(() => useKeyDetection())
    
    // Check that all expected properties exist
    expect(result.current).toHaveProperty('detectKey')
    expect(result.current).toHaveProperty('isDetecting')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('progress')
  })

  it('should handle hook re-renders correctly', () => {
    const { result, rerender } = renderHook(() => useKeyDetection())
    
    const initialDetectKey = result.current.detectKey
    
    rerender()
    
    // Function reference should remain stable
    expect(result.current.detectKey).toBe(initialDetectKey)
  })
})