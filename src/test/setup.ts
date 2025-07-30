import '@testing-library/jest-dom/vitest'

// Mock Web Audio API
class MockAudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number
  private channelData: Float32Array[]

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.duration = options.length / options.sampleRate
    
    // Initialize channel data arrays
    this.channelData = []
    for (let i = 0; i < options.numberOfChannels; i++) {
      this.channelData[i] = new Float32Array(options.length)
    }
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels || channel < 0) {
      throw new Error('Invalid channel index')
    }
    return this.channelData[channel]
  }
}

class MockAudioContext {
  sampleRate = 44100
  state = 'running'

  async close() {
    this.state = 'closed'
  }

  async decodeAudioData(_audioData: ArrayBuffer): Promise<AudioBuffer> {
    // Mock implementation - return a simple audio buffer
    return new MockAudioBuffer({
      numberOfChannels: 2,
      length: 44100 * 2, // 2 seconds
      sampleRate: 44100
    }) as unknown as AudioBuffer
  }
}

// Set up global mocks
;(globalThis as any).AudioBuffer = MockAudioBuffer
;(globalThis as any).AudioContext = MockAudioContext
;(globalThis as any).webkitAudioContext = MockAudioContext

// Mock window object for browser APIs
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContext
  })

  Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: MockAudioContext
  })
}