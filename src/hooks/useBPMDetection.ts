// React hook for BPM detection using Web Workers

import { useState, useCallback, useRef } from 'react'
import type { BPMResult } from '../types'
import type { BPMWorkerMessage, BPMWorkerResponse } from '../workers/bpmWorker'

export interface UseBPMDetectionResult {
    detectBPM: (audioBuffer: AudioBuffer) => Promise<BPMResult>
    isDetecting: boolean
    progress: number
    error: string | null
    cancelDetection: () => void
}

export function useBPMDetection(): UseBPMDetectionResult {
    const [isDetecting, setIsDetecting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const workerRef = useRef<Worker | null>(null)
    const timeoutRef = useRef<number | null>(null)

    const cancelDetection = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate()
            workerRef.current = null
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }

        setIsDetecting(false)
        setProgress(0)
        setError(null)
    }, [])

    const detectBPM = useCallback(async (audioBuffer: AudioBuffer): Promise<BPMResult> => {
        return new Promise((resolve, reject) => {
            // Cancel any existing detection
            cancelDetection()

            setIsDetecting(true)
            setProgress(0)
            setError(null)

            try {
                // Create new worker
                workerRef.current = new Worker(
                    new URL('../workers/bpmWorker.ts', import.meta.url),
                    { type: 'module' }
                )

                // Set up progress simulation (since actual progress is hard to track)
                const progressInterval = setInterval(() => {
                    setProgress(prev => {
                        if (prev >= 90) {
                            clearInterval(progressInterval)
                            return 90
                        }
                        return prev + Math.random() * 10
                    })
                }, 200)

                // Set up timeout (30 seconds max)
                timeoutRef.current = setTimeout(() => {
                    clearInterval(progressInterval)
                    cancelDetection()
                    reject(new Error('BPM detection timed out after 30 seconds'))
                }, 30000) as unknown as number

                // Handle worker messages
                workerRef.current.onmessage = (event: MessageEvent<BPMWorkerResponse>) => {
                    const { type, result, error: workerError } = event.data

                    clearInterval(progressInterval)

                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current)
                        timeoutRef.current = null
                    }

                    if (type === 'BPM_RESULT' && result) {
                        setProgress(100)
                        setIsDetecting(false)
                        setError(null)

                        // Clean up worker
                        if (workerRef.current) {
                            workerRef.current.terminate()
                            workerRef.current = null
                        }

                        resolve(result)
                    } else if (type === 'BPM_ERROR') {
                        setIsDetecting(false)
                        setProgress(0)
                        const errorMessage = workerError || 'BPM detection failed'
                        setError(errorMessage)

                        // Clean up worker
                        if (workerRef.current) {
                            workerRef.current.terminate()
                            workerRef.current = null
                        }

                        reject(new Error(errorMessage))
                    }
                }

                // Handle worker errors
                workerRef.current.onerror = () => {
                    clearInterval(progressInterval)
                    setIsDetecting(false)
                    setProgress(0)
                    const errorMessage = 'BPM detection worker error'
                    setError(errorMessage)

                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current)
                        timeoutRef.current = null
                    }

                    reject(new Error(errorMessage))
                }

                // Prepare audio data for transfer to worker
                const channelData: Float32Array[] = []
                for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                    // Create a copy of the channel data for transfer
                    const data = new Float32Array(audioBuffer.getChannelData(channel))
                    channelData.push(data)
                }

                const message: BPMWorkerMessage = {
                    type: 'DETECT_BPM',
                    audioBufferData: {
                        sampleRate: audioBuffer.sampleRate,
                        length: audioBuffer.length,
                        numberOfChannels: audioBuffer.numberOfChannels,
                        channelData
                    }
                }

                // Start BPM detection
                workerRef.current.postMessage(message)

            } catch (error) {
                setIsDetecting(false)
                setProgress(0)
                const errorMessage = error instanceof Error ? error.message : 'Failed to start BPM detection'
                setError(errorMessage)
                reject(new Error(errorMessage))
            }
        })
    }, [cancelDetection])

    return {
        detectBPM,
        isDetecting,
        progress,
        error,
        cancelDetection
    }
}