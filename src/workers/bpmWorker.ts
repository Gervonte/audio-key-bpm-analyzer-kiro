// Web Worker for BPM detection to prevent UI blocking

import { BPMDetector } from '../utils/bpmDetection'
import type { BPMResult } from '../types'

export interface BPMWorkerMessage {
  type: 'DETECT_BPM'
  audioBufferData: {
    sampleRate: number
    length: number
    numberOfChannels: number
    channelData: Float32Array[]
  }
}

export interface BPMWorkerResponse {
  type: 'BPM_RESULT' | 'BPM_ERROR'
  result?: BPMResult
  error?: string
}

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { taskId, type, audioBufferData } = event.data

  if (type === 'DETECT_BPM') {
    try {
      // Reconstruct AudioBuffer from transferred data
      const audioBuffer = new AudioBuffer({
        sampleRate: audioBufferData.sampleRate,
        length: audioBufferData.length,
        numberOfChannels: audioBufferData.numberOfChannels
      })

      // Copy channel data back to AudioBuffer
      for (let channel = 0; channel < audioBufferData.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        channelData.set(audioBufferData.channelData[channel])
      }

      // Perform BPM detection
      const detector = new BPMDetector()
      const result = await detector.detectBPM(audioBuffer)

      // Send result back to main thread with task ID
      self.postMessage({
        taskId,
        type: 'BPM_RESULT',
        result
      })
    } catch (error) {
      // Send error back to main thread with task ID
      self.postMessage({
        taskId,
        type: 'BPM_ERROR',
        error: error instanceof Error ? error.message : 'Unknown BPM detection error'
      })
    }
  }
}

// Export empty object to make this a module
export {}