import { KeyDetector } from '../utils/keyDetection'
import type { KeyResult } from '../types'

// Worker message types (kept for documentation but not used in new worker manager approach)

// Handle messages from main thread
self.onmessage = async (event: MessageEvent) => {
  const { taskId, type, audioData } = event.data

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
      const result: KeyResult = await keyDetector.detectKey(audioBuffer)

      // Send result back to main thread with task ID
      self.postMessage({
        taskId,
        type: 'KEY_RESULT',
        result
      })
    } catch (error) {
      // Send error back to main thread with task ID
      self.postMessage({
        taskId,
        type: 'KEY_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }
}

// Export empty object to make this a module
export {}