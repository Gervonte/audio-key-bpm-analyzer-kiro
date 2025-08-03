// Fallback key detection using custom algorithms when essentia.js fails
import type { KeyResult } from '../types'

// Krumhansl-Schmuckler key profiles for major and minor keys
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// Note names for key identification
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_KEYS = NOTE_NAMES.map(note => `${note} Major`)
const MINOR_KEYS = NOTE_NAMES.map(note => `${note} Minor`)

export interface ChromaVector {
  values: number[]
  confidence: number
}

export interface KeyProfile {
  key: string
  mode: 'major' | 'minor'
  correlation: number
}

export async function detectKeyFallback(audioBuffer: AudioBuffer, onProgress?: (progress: number) => void): Promise<KeyResult> {
  try {
    onProgress?.(10)
    
    // Extract chroma features from the audio
    const chromaVector = extractChromaFeatures(audioBuffer)
    onProgress?.(60)
    
    // Calculate key profiles using Krumhansl-Schmuckler algorithm
    const keyProfile = calculateKeyProfile(chromaVector)
    onProgress?.(90)
    
    // Format the result
    const keySignature = getKeySignature(keyProfile.key, keyProfile.mode)
    onProgress?.(100)
    
    return {
      keyName: keyProfile.key,
      keySignature,
      confidence: Math.max(0, Math.min(1, keyProfile.correlation)),
      mode: keyProfile.mode
    }
  } catch (error) {
    console.error('Fallback key detection failed:', error)
    return {
      keyName: 'C Major',
      keySignature: 'C',
      confidence: 0.0,
      mode: 'major' as const
    }
  }
}

/**
 * Extract chroma features from audio buffer using simplified frequency analysis
 */
function extractChromaFeatures(audioBuffer: AudioBuffer): ChromaVector {
  // Convert to mono if stereo
  const audioData = convertToMono(audioBuffer)
  const chromaValues = new Array(12).fill(0)
  const sampleRate = audioBuffer.sampleRate
  
  // Use a smaller, more efficient analysis
  const analysisLength = Math.min(audioData.length, sampleRate * 30) // Max 30 seconds
  const stepSize = Math.max(1, Math.floor(analysisLength / 2000)) // Sample every ~15ms
  
  let totalEnergy = 0
  let sampleCount = 0

  // Simplified frequency analysis using autocorrelation-like approach
  for (let i = 0; i < analysisLength - stepSize; i += stepSize) {
    const sample = audioData[i]
    if (Math.abs(sample) > 0.001) { // Only process non-silent samples
      
      // Simple pitch detection using zero-crossing and energy
      const localEnergy = getLocalEnergy(audioData, i, Math.min(1024, audioData.length - i))
      if (localEnergy > 0.01) {
        const estimatedPitch = estimatePitch(audioData, i, Math.min(2048, audioData.length - i), sampleRate)
        
        if (estimatedPitch > 80 && estimatedPitch < 2000) { // Musical range
          const chromaClass = frequencyToChroma(estimatedPitch)
          if (chromaClass >= 0 && chromaClass < 12) { // Ensure valid chroma class
            chromaValues[chromaClass] += localEnergy
            totalEnergy += localEnergy
            sampleCount++
          }
        }
      }
    }
  }

  // Normalize chroma values
  if (totalEnergy > 0) {
    for (let i = 0; i < 12; i++) {
      chromaValues[i] /= totalEnergy
    }
  }

  return {
    values: chromaValues,
    confidence: sampleCount > 10 ? Math.min(1, sampleCount / 100) : 0
  }
}

/**
 * Calculate key profile using Krumhansl-Schmuckler algorithm
 */
function calculateKeyProfile(chromaVector: ChromaVector): KeyProfile {
  let bestCorrelation = -1
  let bestKey = 'C Major'
  let bestMode: 'major' | 'minor' = 'major'

  // Test all major keys
  for (let i = 0; i < 12; i++) {
    const rotatedProfile = rotateArray(MAJOR_PROFILE, i)
    const correlation = calculateCorrelation(chromaVector.values, rotatedProfile)
    
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestKey = MAJOR_KEYS[i]
      bestMode = 'major'
    }
  }

  // Test all minor keys
  for (let i = 0; i < 12; i++) {
    const rotatedProfile = rotateArray(MINOR_PROFILE, i)
    const correlation = calculateCorrelation(chromaVector.values, rotatedProfile)
    
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestKey = MINOR_KEYS[i]
      bestMode = 'minor'
    }
  }

  return {
    key: bestKey,
    mode: bestMode,
    correlation: bestCorrelation
  }
}

/**
 * Convert stereo audio to mono
 */
function convertToMono(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  const length = audioBuffer.length
  const monoData = new Float32Array(length)
  
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i]
    }
    monoData[i] = sum / audioBuffer.numberOfChannels
  }
  
  return monoData
}

/**
 * Get local energy around a sample point
 */
function getLocalEnergy(audioData: Float32Array, start: number, length: number): number {
  let energy = 0
  const end = Math.min(start + length, audioData.length)
  
  for (let i = start; i < end; i++) {
    energy += audioData[i] * audioData[i]
  }
  
  return energy / length
}

/**
 * Estimate pitch using a simplified autocorrelation method
 */
function estimatePitch(audioData: Float32Array, start: number, length: number, sampleRate: number): number {
  const end = Math.min(start + length, audioData.length)
  const windowSize = end - start
  
  if (windowSize < 100) return 0
  
  let bestCorrelation = 0
  let bestPeriod = 0
  
  // Check periods corresponding to frequencies between 80Hz and 800Hz
  const minPeriod = Math.floor(sampleRate / 800)
  const maxPeriod = Math.floor(sampleRate / 80)
  
  for (let period = minPeriod; period < Math.min(maxPeriod, windowSize / 2); period += 2) {
    let correlation = 0
    let count = 0
    
    for (let i = start; i < end - period; i++) {
      correlation += audioData[i] * audioData[i + period]
      count++
    }
    
    if (count > 0) {
      correlation /= count
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    }
  }
  
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0
}

/**
 * Convert frequency to chroma class (0-11)
 */
function frequencyToChroma(frequency: number): number {
  if (frequency <= 0) return 0
  
  // Convert frequency to MIDI note number
  const midiNote = 12 * Math.log2(frequency / 440) + 69
  
  // Map to chroma class (0-11), ensuring positive result
  const chromaClass = Math.round(midiNote) % 12
  return chromaClass < 0 ? chromaClass + 12 : chromaClass
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n === 0) return 0
  
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Rotate array by specified number of positions
 */
function rotateArray(arr: number[], positions: number): number[] {
  const n = arr.length
  const rotated = new Array(n)
  
  for (let i = 0; i < n; i++) {
    rotated[i] = arr[(i + positions) % n]
  }
  
  return rotated
}

/**
 * Get key signature from key name and mode
 */
function getKeySignature(keyName: string, mode: 'major' | 'minor'): string {
  const note = keyName.split(' ')[0]
  return mode === 'minor' ? `${note}m` : note
}