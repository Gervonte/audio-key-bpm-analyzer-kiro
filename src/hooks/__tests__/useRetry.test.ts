// Unit tests for useRetry hook

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRetry } from '../useRetry'

describe('useRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const { result } = renderHook(() => useRetry(mockFn))

      let executionResult: any

      await act(async () => {
        executionResult = await result.current.execute('arg1', 'arg2')
      })

      expect(executionResult).toBe('success')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result.current.attemptCount).toBe(1)
      expect(result.current.isRetrying).toBe(false)
      expect(result.current.lastError).toBe(null)
    })

    it('should handle errors correctly', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))
      const { result } = renderHook(() => useRetry(mockFn, { maxAttempts: 1 }))

      let executionError: Error | undefined

      await act(async () => {
        try {
          await result.current.execute('test')
        } catch (error) {
          executionError = error as Error
        }
      })

      expect(executionError?.message).toBe('Test error')
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result.current.attemptCount).toBe(1)
      expect(result.current.lastError?.message).toBe('Test error')
    })

    it('should track state correctly', () => {
      const mockFn = vi.fn()
      const { result } = renderHook(() => useRetry(mockFn))

      expect(result.current.isRetrying).toBe(false)
      expect(result.current.attemptCount).toBe(0)
      expect(result.current.canRetry).toBe(false)
      expect(result.current.lastError).toBe(null)
    })

    it('should reset state correctly', () => {
      const mockFn = vi.fn()
      const { result } = renderHook(() => useRetry(mockFn))

      act(() => {
        result.current.reset()
      })

      expect(result.current.isRetrying).toBe(false)
      expect(result.current.attemptCount).toBe(0)
      expect(result.current.lastError).toBe(null)
      expect(result.current.canRetry).toBe(false)
    })
  })
})