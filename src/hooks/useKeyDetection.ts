import { useState, useCallback, useRef, useEffect } from 'react'
import type { KeyResult } from '../types'

interface UseKeyDetectionReturn {
  detectKey: (audioBuffer: AudioBuffer) => Promise<KeyResult>
  isDetecting: boolean
  error: string | null
  progress: number
}

export const useKeyDetection = (): UseKeyDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const workerRef = useRef<Worker | null>(null)

  const detectKey = useCallback(async (audioBuffer: AudioBuffer): Promise<KeyResult> => {
    return new Promise((resolve, reject) => {
      setIsDetecting(true)
      setError(null)
      setProgress(0)

      try {
        // Create worker if it doesn't exist
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('../workers/keyWorker.ts', import.meta.url),
            { type: 'module' }
          )
        }

        const worker = workerRef.current

        // Set up progress simulation (since actual progress is hard to track)
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90))
        }, 200)

        // Handle worker messages
        const handleMessage = (event: MessageEvent) => {
          const { type, result, error: workerError } = event.data

          clearInterval(progressInterval)
          setProgress(100)

          if (type === 'KEY_RESULT' && result) {
            setIsDetecting(false)
            resolve(result)
          } else if (type === 'KEY_ERROR') {
            setIsDetecting(false)
            setError(workerError || 'Key detection failed')
            reject(new Error(workerError || 'Key detection failed'))
          }

          // Clean up event listener
          worker.removeEventListener('message', handleMessage)
        }

        // Handle worker errors
        const handleError = (_error: ErrorEvent) => {
          clearInterval(progressInterval)
          setIsDetecting(false)
          setError('Worker error occurred')
          reject(new Error('Worker error occurred'))
          worker.removeEventListener('error', handleError)
        }

        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError)

        // Prepare audio data for transfer to worker
        const channelData: Float32Array[] = []
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
          channelData.push(audioBuffer.getChannelData(i))
        }

        // Send audio data to worker
        worker.postMessage({
          type: 'DETECT_KEY',
          audioData: {
            channelData,
            sampleRate: audioBuffer.sampleRate,
            length: audioBuffer.length,
            numberOfChannels: audioBuffer.numberOfChannels
          }
        })

        // Set timeout for long-running operations
        const timeoutId = setTimeout(() => {
          clearInterval(progressInterval)
          setIsDetecting(false)
          setError('Key detection timed out')
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          reject(new Error('Key detection timed out'))
        }, 30000) // 30 second timeout

        // Clear timeout when operation completes
        const originalHandleMessage = handleMessage
        const handleMessageWithTimeout = (event: MessageEvent) => {
          clearTimeout(timeoutId)
          originalHandleMessage(event)
        }
        
        worker.removeEventListener('message', handleMessage)
        worker.addEventListener('message', handleMessageWithTimeout)

      } catch (err) {
        setIsDetecting(false)
        setError(err instanceof Error ? err.message : 'Unknown error')
        reject(err)
      }
    })
  }, [isDetecting])

  // Cleanup worker on unmount
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  // Cleanup worker on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    detectKey,
    isDetecting,
    error,
    progress
  }
}