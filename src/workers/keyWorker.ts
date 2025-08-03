import { KeyDetector } from '../utils/keyDetection'
import type { KeyResult } from '../types'

// Worker message types
interface KeyWorkerMessage {
  type: 'DETECT_KEY'
  audioData: {
    channelData: Float32Array[]
    sampleRate: number
    length: number
    numberOfChannels: number
  }
}

interface KeyWorkerResponse {
  type: 'KEY_RESULT' | 'KEY_ERROR'
  result?: KeyResult
  error?: string
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<KeyWorkerMessage>) => {
  const { type, audioData } = event.data

  if (type === 'DETECT_KEY') {
    try {
      // Reconstruct AudioBuffer-like object from transferred data
      const audioBuffer = {
        sampleRate: audioData.sampleRate,
        length: audioData.length,
        numberOfChannels: audioData.numberOfChannels,
        getChannelData: (channel: number) => audioData.channelData[channel]
      } as AudioBuffer

      // Create key detector and analyze
      const keyDetector = new KeyDetector(audioData.sampleRate)
      const result = await keyDetector.detectKey(audioBuffer)

      // Send result back to main thread
      const response: KeyWorkerResponse = {
        type: 'KEY_RESULT',
        result
      }
      
      self.postMessage(response)
    } catch (error) {
      // Send error back to main thread
      const response: KeyWorkerResponse = {
        type: 'KEY_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
      
      self.postMessage(response)
    }
  }
}

// Export empty object to make this a module
export {}