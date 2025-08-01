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
self.onmessage = async (event: MessageEvent<BPMWorkerMessage>) => {
  const { type, audioBufferData } = event.data

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

      // Perform BPM detection using essentia.js
      const detector = new BPMDetector()
      const result = await detector.detectBPM(audioBuffer)
      
      // Cleanup detector
      detector.cleanup()

      // Send result back to main thread
      const response: BPMWorkerResponse = {
        type: 'BPM_RESULT',
        result
      }
      
      self.postMessage(response)
    } catch (error) {
      // Send error back to main thread
      const response: BPMWorkerResponse = {
        type: 'BPM_ERROR',
        error: error instanceof Error ? error.message : 'Unknown BPM detection error'
      }
      
      self.postMessage(response)
    }
  }
}

// Export empty object to make this a module
export {}