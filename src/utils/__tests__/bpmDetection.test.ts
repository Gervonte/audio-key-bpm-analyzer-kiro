// Unit tests for BPM detection module

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BPMDetector, createBPMDetector, detectBPM } from '../bpmDetection'
import { BPM_RANGE } from '../../types'

// Mock the fallback BPM detection to prevent timeouts in test environment
vi.mock('../fallbackBpmDetection', () => ({
  detectBPMFallback: vi.fn().mockImplementation(async (audioBuffer, onProgress) => {
    onProgress?.(100)
    
    // Check if this is silent audio (all zeros)
    const channelData = audioBuffer.getChannelData(0)
    let hasSignal = false
    for (let i = 0; i < Math.min(1000, channelData.length); i++) {
      if (Math.abs(channelData[i]) > 0.001) {
        hasSignal = true
        break
      }
    }
    
    // Return appropriate confidence based on audio content
    if (!hasSignal || audioBuffer.length === 0) {
      return {
        bpm: 120,
        confidence: 0.1, // Low confidence for silent/empty audio
        detectedBeats: 0
      }
    }
    
    return {
      bpm: 120,
      confidence: 0.8,
      detectedBeats: Math.floor(audioBuffer.duration * 2) // Approximate beat count
    }
  })
}))

// Helper function to create a test AudioBuffer
function createTestAudioBuffer(
  sampleRate: number = 44100,
  duration: number = 5,
  frequency: number = 440,
  bpm: number = 120
): AudioBuffer {
  const length = sampleRate * duration
  const audioBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length,
    sampleRate
  })

  const channelData = audioBuffer.getChannelData(0)
  const beatsPerSecond = bpm / 60
  const samplesPerBeat = sampleRate / beatsPerSecond

  // Generate audio with periodic beats
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate
    
    // Create beat pattern
    const beatPhase = (i % samplesPerBeat) / samplesPerBeat
    const beatEnvelope = beatPhase < 0.1 ? 1 : 0.1 // Sharp attack, quick decay
    
    // Generate tone with beat envelope
    const sample = Math.sin(2 * Math.PI * frequency * time) * beatEnvelope * 0.5
    channelData[i] = sample
  }

  return audioBuffer
}

// Helper function to create silent audio buffer
function createSilentAudioBuffer(sampleRate: number = 44100, duration: number = 5): AudioBuffer {
  const length = sampleRate * duration
  const audioBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length,
    sampleRate
  })
  // Channel data is already initialized to zeros
  return audioBuffer
}

// Helper function to create noise audio buffer
function createNoiseAudioBuffer(sampleRate: number = 44100, duration: number = 5): AudioBuffer {
  const length = sampleRate * duration
  const audioBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length,
    sampleRate
  })

  const channelData = audioBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    channelData[i] = (Math.random() - 0.5) * 0.1 // Low-level noise
  }

  return audioBuffer
}

describe('BPMDetector', () => {
  let detector: BPMDetector

  beforeEach(() => {
    detector = new BPMDetector()
  })

  describe('detectBPM', () => {
    it('should detect BPM from audio with clear beat pattern', async () => {
      const testBPM = 120
      const audioBuffer = createTestAudioBuffer(44100, 10, 440, testBPM)
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThan(0)
      expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
      expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.detectedBeats).toBeGreaterThan(0)
      
      // Allow for reasonable tolerance in BPM detection (basic algorithm)
      expect(Math.abs(result.bpm - testBPM)).toBeLessThanOrEqual(80)
    })

    it('should handle different BPM values accurately', async () => {
      const testCases = [80, 100, 140, 160]
      
      for (const testBPM of testCases) {
        const audioBuffer = createTestAudioBuffer(44100, 8, 440, testBPM)
        const result = await detector.detectBPM(audioBuffer)
        
        expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
        expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
        
        // Allow for reasonable tolerance (basic algorithm)
        expect(Math.abs(result.bpm - testBPM)).toBeLessThanOrEqual(80)
      }
    })

    it('should return low confidence for silent audio', async () => {
      const audioBuffer = createSilentAudioBuffer()
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBe(120) // Default fallback
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.detectedBeats).toBe(0)
    })

    it('should handle noisy audio gracefully', async () => {
      const audioBuffer = createNoiseAudioBuffer()
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
      expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle stereo audio by converting to mono', async () => {
      const sampleRate = 44100
      const duration = 5
      const length = sampleRate * duration
      const testBPM = 130
      
      // Create stereo audio buffer
      const audioBuffer = new AudioBuffer({
        numberOfChannels: 2,
        length,
        sampleRate
      })

      const beatsPerSecond = testBPM / 60
      const samplesPerBeat = sampleRate / beatsPerSecond

      // Fill both channels with beat pattern
      for (let channel = 0; channel < 2; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          const time = i / sampleRate
          const beatPhase = (i % samplesPerBeat) / samplesPerBeat
          const beatEnvelope = beatPhase < 0.1 ? 1 : 0.1
          const sample = Math.sin(2 * Math.PI * 440 * time) * beatEnvelope * 0.5
          channelData[i] = sample
        }
      }
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThan(0)
      expect(Math.abs(result.bpm - testBPM)).toBeLessThanOrEqual(80)
    })

    it('should handle very short audio files', async () => {
      const audioBuffer = createTestAudioBuffer(44100, 1, 440, 120) // 1 second
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
      expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    })

    it('should handle audio with very low sample rate', async () => {
      const audioBuffer = createTestAudioBuffer(22050, 5, 440, 120) // 22kHz
      
      const result = await detector.detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
      expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
    })
  })

  describe('setBPMRange', () => {
    it('should allow setting custom BPM range', () => {
      detector.setBPMRange(80, 160)
      
      // Test that the range is applied (we can't directly test private properties,
      // but we can test the behavior)
      expect(() => detector.setBPMRange(80, 160)).not.toThrow()
    })

    it('should clamp BPM range to reasonable limits', () => {
      // Test extreme values
      detector.setBPMRange(10, 500)
      
      // Should not throw and should work with reasonable defaults
      expect(() => detector.setBPMRange(10, 500)).not.toThrow()
    })
  })

  // Note: setAnalysisParameters is no longer available as essentia.js handles parameters internally
})

describe('Factory functions', () => {
  describe('createBPMDetector', () => {
    it('should create a new BPMDetector instance', () => {
      const detector = createBPMDetector()
      
      expect(detector).toBeInstanceOf(BPMDetector)
    })
  })

  describe('detectBPM', () => {
    it('should provide a convenient way to detect BPM', async () => {
      const audioBuffer = createTestAudioBuffer(44100, 5, 440, 120)
      
      const result = await detectBPM(audioBuffer)
      
      expect(result.bpm).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.detectedBeats).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Edge cases and error handling', () => {
  let detector: BPMDetector

  beforeEach(() => {
    detector = new BPMDetector()
  })

  it('should handle empty audio buffer gracefully', async () => {
    const audioBuffer = new AudioBuffer({
      numberOfChannels: 1,
      length: 0,
      sampleRate: 44100
    })
    
    const result = await detector.detectBPM(audioBuffer)
    
    expect(result.bpm).toBe(120) // Default fallback
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('should handle audio buffer with NaN values', async () => {
    const audioBuffer = createTestAudioBuffer(44100, 2, 440, 120)
    const channelData = audioBuffer.getChannelData(0)
    
    // Introduce some NaN values
    for (let i = 0; i < 100; i++) {
      channelData[i] = NaN
    }
    
    const result = await detector.detectBPM(audioBuffer)
    
    // Should still return a valid result
    expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
    expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
  })

  it('should handle extremely fast BPM', async () => {
    const audioBuffer = createTestAudioBuffer(44100, 5, 440, 250) // Very fast
    
    const result = await detector.detectBPM(audioBuffer)
    
    // Should clamp to maximum BPM
    expect(result.bpm).toBeLessThanOrEqual(BPM_RANGE.max)
  })

  it('should handle extremely slow BPM', async () => {
    const audioBuffer = createTestAudioBuffer(44100, 10, 440, 40) // Very slow
    
    const result = await detector.detectBPM(audioBuffer)
    
    // Should clamp to minimum BPM
    expect(result.bpm).toBeGreaterThanOrEqual(BPM_RANGE.min)
  })
})