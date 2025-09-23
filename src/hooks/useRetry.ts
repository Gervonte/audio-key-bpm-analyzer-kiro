import { useState, useCallback, useRef } from 'react'
import { categorizeError, getRetryDelay } from '../utils/errorHandling'

interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  backoffMultiplier?: number
  onRetryAttempt?: (attempt: number, error: Error) => void
}

interface UseRetryResult<T> {
  execute: (...args: unknown[]) => Promise<T>
  retry: () => Promise<T>
  isRetrying: boolean
  attemptCount: number
  canRetry: boolean
  lastError: Error | null
  reset: () => void
}

export function useRetry<T>(
  asyncFunction: (...args: unknown[]) => Promise<T>,
  options: RetryOptions = {}
): UseRetryResult<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    backoffMultiplier = 1.5,
    onRetryAttempt
  } = options

  const [isRetrying, setIsRetrying] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [lastArgs, setLastArgs] = useState<unknown[]>([])

  const timeoutRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    setIsRetrying(false)
    setAttemptCount(0)
    setLastError(null)
    setLastArgs([])
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const executeWithRetry = useCallback(async (
    args: unknown[],
    currentAttempt: number = 0
  ): Promise<T> => {
    try {
      setAttemptCount(currentAttempt + 1)
      
      if (currentAttempt > 0) {
        setIsRetrying(true)
        if (onRetryAttempt && lastError) {
          onRetryAttempt(currentAttempt, lastError)
        }
      }

      const result = await asyncFunction(...args)
      
      // Success - reset state
      setIsRetrying(false)
      setLastError(null)
      
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setLastError(err)
      setIsRetrying(false)

      // Check if we should retry
      const errorInfo = categorizeError(err)
      const shouldRetry = errorInfo.canRetry && currentAttempt < maxAttempts - 1

      if (shouldRetry) {
        // Calculate delay based on error type and attempt count
        const errorTypeDelay = getRetryDelay(errorInfo.type)
        const attemptDelay = baseDelay * Math.pow(backoffMultiplier, currentAttempt)
        const delay = Math.max(errorTypeDelay, attemptDelay)

        // Wait before retrying
        await new Promise<void>((resolve) => {
          timeoutRef.current = setTimeout(() => {
            resolve()
          }, delay) as unknown as number
        })

        // Recursive retry
        return executeWithRetry(args, currentAttempt + 1)
      } else {
        // No more retries - throw the error
        throw err
      }
    }
  }, [asyncFunction, maxAttempts, baseDelay, backoffMultiplier, onRetryAttempt, lastError])

  const execute = useCallback(async (...args: unknown[]): Promise<T> => {
    setLastArgs(args)
    return executeWithRetry(args, 0)
  }, [executeWithRetry])

  const retry = useCallback(async (): Promise<T> => {
    if (lastArgs.length === 0) {
      throw new Error('No previous execution to retry')
    }
    return executeWithRetry(lastArgs, attemptCount)
  }, [executeWithRetry, lastArgs, attemptCount])

  const canRetry = lastError ? categorizeError(lastError).canRetry && attemptCount < maxAttempts : false

  return {
    execute,
    retry,
    isRetrying,
    attemptCount,
    canRetry,
    lastError,
    reset
  }
}

// Specialized retry hook for audio processing
export function useAudioProcessingRetry<T>(
  asyncFunction: (...args: unknown[]) => Promise<T>
): UseRetryResult<T> {
  return useRetry(asyncFunction, {
    maxAttempts: 3,
    baseDelay: 1500,
    backoffMultiplier: 2,
    onRetryAttempt: () => {
      // Audio processing retry attempt
    }
  })
}

// Specialized retry hook for file operations
export function useFileOperationRetry<T>(
  asyncFunction: (...args: unknown[]) => Promise<T>
): UseRetryResult<T> {
  return useRetry(asyncFunction, {
    maxAttempts: 2,
    baseDelay: 1000,
    backoffMultiplier: 1.5,
    onRetryAttempt: () => {
      // File operation retry attempt
    }
  })
}