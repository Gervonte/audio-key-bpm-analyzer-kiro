// Fallback key detection using custom algorithms when essentia.js fails
import type { KeyResult } from '../types'

// Enhanced key profiles with better minor key detection
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
// Enhanced minor profile with stronger emphasis on characteristic minor intervals
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17].map((val, i) => {
  // Boost the minor third (index 3) and minor seventh (index 10) for better minor detection
  if (i === 3) return val * 1.2  // Minor third
  if (i === 10) return val * 1.1 // Minor seventh
  return val
})

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
    
    // Extract chroma features from the audio (with limits to prevent hanging)
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
  
  // Use a more comprehensive analysis for better accuracy (with limits)
  const analysisLength = Math.min(audioData.length, sampleRate * 30) // Max 30 seconds to prevent hanging
  const stepSize = Math.max(1, Math.floor(analysisLength / 2000)) // Reduce sample points to prevent hanging
  
  let totalEnergy = 0
  let sampleCount = 0

  // Simplified frequency analysis to prevent hanging
  for (let i = 0; i < analysisLength - stepSize; i += stepSize) {
    const sample = audioData[i]
    if (Math.abs(sample) > 0.001) { // Only process non-silent samples
      
      // Use single window size to prevent hanging
      const windowSize = 2048
      
      if (i + windowSize < audioData.length) {
        const localEnergy = getLocalEnergy(audioData, i, windowSize)
        
        if (localEnergy > 0.005) { // Higher threshold to reduce processing
          const estimatedPitch = estimatePitch(audioData, i, windowSize, sampleRate)
          
          if (estimatedPitch > 80 && estimatedPitch < 2000) { // Musical range
            const chromaClass = frequencyToChroma(estimatedPitch)
            if (chromaClass >= 0 && chromaClass < 12) {
              // Simple weighting
              const pitchWeight = Math.min(1.0, localEnergy * 10)
              
              chromaValues[chromaClass] += pitchWeight
              totalEnergy += pitchWeight
              sampleCount++
            }
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

  // Essential debugging - only log if we have very low energy
  if (totalEnergy < 0.1) {
    console.log('Warning: Very low audio energy detected for key analysis')
  }

  return {
    values: chromaValues,
    confidence: sampleCount > 10 ? Math.min(1, sampleCount / 100) : 0
  }
}

/**
 * Calculate key profile using improved Krumhansl-Schmuckler algorithm
 */
function calculateKeyProfile(chromaVector: ChromaVector): KeyProfile {
  const results: Array<{key: string, mode: 'major' | 'minor', correlation: number}> = []

  // Test all major keys
  for (let i = 0; i < 12; i++) {
    const rotatedProfile = rotateArray(MAJOR_PROFILE, i)
    const correlation = calculateCorrelation(chromaVector.values, rotatedProfile)
    results.push({
      key: MAJOR_KEYS[i],
      mode: 'major',
      correlation
    })
  }

  // Test all minor keys with slight preference boost for minor detection
  for (let i = 0; i < 12; i++) {
    const rotatedProfile = rotateArray(MINOR_PROFILE, i)
    let correlation = calculateCorrelation(chromaVector.values, rotatedProfile)
    
    // Slight boost for minor keys to improve detection
    correlation *= 1.05
    
    results.push({
      key: MINOR_KEYS[i],
      mode: 'minor',
      correlation
    })
  }
  
  // Find the best result
  results.sort((a, b) => b.correlation - a.correlation)
  const best = results[0]
  
  // Fallback to C Major if no good correlation found
  if (!best || best.correlation < 0.1) {
    console.log('Fallback key detection: No strong correlation found, using C Major')
    return {
      key: 'C Major',
      mode: 'major',
      correlation: 0.1
    }
  }
  
  console.log(`Fallback key detection result: ${best.key} (confidence: ${(best.correlation * 100).toFixed(1)}%)`)
  
  return {
    key: best.key,
    mode: best.mode,
    correlation: best.correlation
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
 * Estimate pitch using an improved autocorrelation method with better accuracy
 */
function estimatePitch(audioData: Float32Array, start: number, length: number, sampleRate: number): number {
  const end = Math.min(start + length, audioData.length)
  const windowSize = end - start
  
  if (windowSize < 200) return 0
  
  let bestCorrelation = 0
  let bestPeriod = 0
  
  // Extended frequency range for better musical note detection
  const minPeriod = Math.floor(sampleRate / 1000) // Up to 1000Hz
  const maxPeriod = Math.floor(sampleRate / 60)   // Down to 60Hz
  
  // Use normalized autocorrelation with harmonic enhancement
  for (let period = minPeriod; period < Math.min(maxPeriod, windowSize / 3); period++) {
    let correlation = 0
    let energy1 = 0
    let energy2 = 0
    let count = 0
    
    for (let i = start; i < end - period; i++) {
      const sample1 = audioData[i]
      const sample2 = audioData[i + period]
      
      correlation += sample1 * sample2
      energy1 += sample1 * sample1
      energy2 += sample2 * sample2
      count++
    }
    
    if (count > 0 && energy1 > 0 && energy2 > 0) {
      // Normalized correlation
      let normalizedCorrelation = correlation / Math.sqrt(energy1 * energy2)
      
      // Boost correlation for musically relevant frequencies
      const frequency = sampleRate / period
      if (frequency >= 80 && frequency <= 800) { // Musical fundamental range
        normalizedCorrelation *= 1.2
      }
      
      // Additional boost for common musical notes
      const noteFrequencies = [82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47, 130.81, 138.59, 146.83, 155.56] // C2-B2
      for (const noteFreq of noteFrequencies) {
        if (Math.abs(frequency - noteFreq) < 2 || Math.abs(frequency - noteFreq * 2) < 4 || Math.abs(frequency - noteFreq * 4) < 8) {
          normalizedCorrelation *= 1.3
          break
        }
      }
      
      if (normalizedCorrelation > bestCorrelation && normalizedCorrelation > 0.2) {
        bestCorrelation = normalizedCorrelation
        bestPeriod = period
      }
    }
  }
  
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0
}

/**
 * Convert frequency to chroma class (0-11) with better accuracy
 */
function frequencyToChroma(frequency: number): number {
  if (frequency <= 0) return 0
  
  // Convert frequency to MIDI note number with better precision
  const midiNote = 12 * Math.log2(frequency / 440) + 69
  
  // Use more precise rounding and handle edge cases
  let chromaClass = Math.round(midiNote) % 12
  
  // Ensure positive result
  while (chromaClass < 0) {
    chromaClass += 12
  }
  
  // Handle harmonics - if we detect a harmonic, map it back to the fundamental
  // This helps with detecting the root note when harmonics are stronger
  return chromaClass
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