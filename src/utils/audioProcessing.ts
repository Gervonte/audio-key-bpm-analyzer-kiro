// Audio processing utilities for Web Audio API integration

/**
 * Browser compatibility check for Web Audio API
 */
export function checkWebAudioSupport(): { isSupported: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { isSupported: false, error: 'Web Audio API not available in server environment' }
  }

  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    return { 
      isSupported: false, 
      error: 'Web Audio API not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.' 
    }
  }

  // Check for additional Web Audio API features (skip in test environment)
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).process === 'undefined' || 
      (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.NODE_ENV !== 'test')) {
    try {
      const testContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (!testContext.createAnalyser || !testContext.decodeAudioData) {
        testContext.close()
        return {
          isSupported: false,
          error: 'Your browser has limited Web Audio API support. Please update to a newer version.'
        }
      }
      testContext.close()
    } catch (error) {
      return {
        isSupported: false,
        error: 'Failed to initialize Web Audio API. Please check your browser settings.'
      }
    }
  }

  return { isSupported: true }
}

/**
 * Creates an AudioContext with proper browser compatibility
 */
export function createAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  return new AudioContextClass()
}

/**
 * Safely closes an AudioContext and handles any errors
 */
export async function closeAudioContext(audioContext: AudioContext): Promise<void> {
  try {
    if (audioContext.state !== 'closed') {
      await audioContext.close()
    }
  } catch (error) {
    console.warn('Error closing AudioContext:', error)
  }
}

/**
 * Normalizes audio buffer to prevent clipping and ensure consistent levels
 */
export function normalizeAudioBuffer(audioBuffer: AudioBuffer): AudioBuffer {
  const normalizedBuffer = new AudioBuffer({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    sampleRate: audioBuffer.sampleRate
  })

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel)
    const outputData = normalizedBuffer.getChannelData(channel)
    
    // Find the maximum absolute value in the channel
    let maxValue = 0
    for (let i = 0; i < inputData.length; i++) {
      const absValue = Math.abs(inputData[i])
      if (absValue > maxValue) {
        maxValue = absValue
      }
    }
    
    // Normalize if the max value is greater than 0 and less than 1
    if (maxValue > 0 && maxValue < 1) {
      const normalizationFactor = 0.95 / maxValue // Leave some headroom
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * normalizationFactor
      }
    } else {
      // Copy data as-is if already normalized or silent
      outputData.set(inputData)
    }
  }

  return normalizedBuffer
}

/**
 * Converts stereo audio buffer to mono by averaging channels
 */
export function convertToMono(audioBuffer: AudioBuffer): AudioBuffer {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer // Already mono
  }

  const monoBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length: audioBuffer.length,
    sampleRate: audioBuffer.sampleRate
  })

  const monoData = monoBuffer.getChannelData(0)
  const leftChannel = audioBuffer.getChannelData(0)
  const rightChannel = audioBuffer.getChannelData(1)

  // Average the left and right channels
  for (let i = 0; i < audioBuffer.length; i++) {
    monoData[i] = (leftChannel[i] + rightChannel[i]) / 2
  }

  return monoBuffer
}

/**
 * Applies a simple high-pass filter to remove DC offset and low-frequency noise
 */
export function applyHighPassFilter(audioBuffer: AudioBuffer, cutoffFreq: number = 20): AudioBuffer {
  const filteredBuffer = new AudioBuffer({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    sampleRate: audioBuffer.sampleRate
  })

  const sampleRate = audioBuffer.sampleRate
  const rc = 1.0 / (cutoffFreq * 2 * Math.PI)
  const dt = 1.0 / sampleRate
  const alpha = rc / (rc + dt)

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel)
    const outputData = filteredBuffer.getChannelData(channel)
    
    let prevInput = 0
    let prevOutput = 0

    for (let i = 0; i < inputData.length; i++) {
      const currentInput = inputData[i]
      const currentOutput = alpha * (prevOutput + currentInput - prevInput)
      
      outputData[i] = currentOutput
      prevInput = currentInput
      prevOutput = currentOutput
    }
  }

  return filteredBuffer
}

/**
 * Validates that an AudioBuffer contains valid audio data
 */
export function validateAudioBuffer(audioBuffer: AudioBuffer): { isValid: boolean; error?: string } {
  if (!audioBuffer) {
    return { isValid: false, error: 'AudioBuffer is null or undefined' }
  }

  if (audioBuffer.length === 0) {
    return { isValid: false, error: 'AudioBuffer is empty' }
  }

  if (audioBuffer.duration === 0) {
    return { isValid: false, error: 'AudioBuffer has zero duration' }
  }

  if (audioBuffer.sampleRate <= 0) {
    return { isValid: false, error: 'AudioBuffer has invalid sample rate' }
  }

  if (audioBuffer.numberOfChannels === 0) {
    return { isValid: false, error: 'AudioBuffer has no channels' }
  }

  // Check if audio data contains only silence or NaN values
  // Sample more data points and use a lower threshold for better detection
  let hasValidData = false
  const sampleSize = Math.min(audioBuffer.length, 10000) // Sample up to 10,000 values
  const threshold = 0.0001 // Lower threshold for quiet audio
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    
    // Check samples throughout the audio, not just the beginning
    const step = Math.max(1, Math.floor(channelData.length / sampleSize))
    
    for (let i = 0; i < channelData.length; i += step) {
      const value = channelData[i]
      if (!isNaN(value) && Math.abs(value) > threshold) {
        hasValidData = true
        break
      }
    }
    if (hasValidData) break
  }

  if (!hasValidData) {
    return { isValid: false, error: 'AudioBuffer appears to contain only silence or invalid data' }
  }

  return { isValid: true }
}

/**
 * Preprocesses audio buffer with normalization and filtering
 */
export function preprocessAudioBuffer(audioBuffer: AudioBuffer): AudioBuffer {
  // Apply high-pass filter to remove DC offset
  let processedBuffer = applyHighPassFilter(audioBuffer)
  
  // Normalize the audio
  processedBuffer = normalizeAudioBuffer(processedBuffer)
  
  return processedBuffer
}

/**
 * Detects if audio file might be corrupted based on decoding errors
 */
export function isCorruptedAudioError(error: Error): boolean {
  const corruptionIndicators = [
    'unable to decode',
    'invalid audio data',
    'corrupt',
    'malformed',
    'unexpected end of file',
    'invalid header',
    'decoding failed'
  ]
  
  const errorMessage = error.message.toLowerCase()
  return corruptionIndicators.some(indicator => errorMessage.includes(indicator))
}

/**
 * Gets audio file duration from AudioBuffer
 */
export function getAudioDuration(audioBuffer: AudioBuffer): number {
  return audioBuffer.duration
}

/**
 * Extracts basic audio metadata from AudioBuffer
 */
export interface AudioMetadata {
  duration: number
  sampleRate: number
  channels: number
  length: number
}

export function extractAudioMetadata(audioBuffer: AudioBuffer): AudioMetadata {
  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    length: audioBuffer.length
  }
}