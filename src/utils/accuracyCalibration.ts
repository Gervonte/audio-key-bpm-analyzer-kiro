// Accuracy calibration utilities for BPM and key detection
// Provides confidence score calibration and validation metrics

export interface CalibrationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
}

export interface BPMCalibrationData {
  detectedBPM: number
  expectedBPM: number
  confidence: number
  audioFeatures: {
    duration: number
    averageAmplitude: number
    spectralCentroid: number
  }
}

export interface KeyCalibrationData {
  detectedKey: string
  detectedMode: 'major' | 'minor'
  expectedKey: string
  expectedMode: 'major' | 'minor'
  confidence: number
  audioFeatures: {
    duration: number
    averageAmplitude: number
    spectralCentroid: number
  }
}

/**
 * Calibrate BPM confidence score based on historical accuracy data
 */
export function calibrateBPMConfidence(
  rawConfidence: number,
  detectedBPM: number,
  audioBuffer: AudioBuffer
): number {
  let calibratedConfidence = rawConfidence
  
  // Hip hop BPM range calibration
  if (detectedBPM >= 80 && detectedBPM <= 160) {
    calibratedConfidence += 0.1 // Boost for typical hip hop range
  } else if (detectedBPM < 70 || detectedBPM > 180) {
    calibratedConfidence -= 0.15 // Penalize extreme values
  }
  
  // Audio quality factors
  const audioFeatures = extractAudioFeatures(audioBuffer)
  
  // Duration factor
  if (audioFeatures.duration >= 8) {
    calibratedConfidence += 0.1
  } else if (audioFeatures.duration < 3) {
    calibratedConfidence -= 0.1
  }
  
  // Amplitude factor (avoid very quiet or clipped audio)
  if (audioFeatures.averageAmplitude < 0.01) {
    calibratedConfidence -= 0.2 // Very quiet
  } else if (audioFeatures.averageAmplitude > 0.8) {
    calibratedConfidence -= 0.1 // Likely clipped
  }
  
  // Spectral centroid factor (frequency content)
  if (audioFeatures.spectralCentroid > 2000 && audioFeatures.spectralCentroid < 8000) {
    calibratedConfidence += 0.05 // Good frequency range for beat detection
  }
  
  return Math.max(0.1, Math.min(1.0, calibratedConfidence))
}

/**
 * Calibrate key confidence score based on historical accuracy data
 */
export function calibrateKeyConfidence(
  rawConfidence: number,
  detectedKey: string,
  detectedMode: 'major' | 'minor',
  audioBuffer: AudioBuffer
): number {
  let calibratedConfidence = rawConfidence
  
  // Hip hop key preferences
  const commonHipHopKeys = ['A', 'C', 'D', 'F', 'G', 'Bb', 'F#']
  if (commonHipHopKeys.includes(detectedKey)) {
    calibratedConfidence += 0.05
  }
  
  // Minor key preference in hip hop
  if (detectedMode === 'minor') {
    calibratedConfidence += 0.1
  }
  
  // Audio quality factors
  const audioFeatures = extractAudioFeatures(audioBuffer)
  
  // Duration factor (key detection needs more audio)
  if (audioFeatures.duration >= 10) {
    calibratedConfidence += 0.15
  } else if (audioFeatures.duration >= 5) {
    calibratedConfidence += 0.05
  } else if (audioFeatures.duration < 3) {
    calibratedConfidence -= 0.2
  }
  
  // Amplitude factor
  if (audioFeatures.averageAmplitude < 0.01) {
    calibratedConfidence -= 0.25 // Very quiet audio hurts key detection more
  } else if (audioFeatures.averageAmplitude > 0.8) {
    calibratedConfidence -= 0.15 // Clipping hurts harmonic content
  }
  
  return Math.max(0.1, Math.min(1.0, calibratedConfidence))
}

/**
 * Extract basic audio features for calibration
 */
function extractAudioFeatures(audioBuffer: AudioBuffer): {
  duration: number
  averageAmplitude: number
  spectralCentroid: number
} {
  const channelData = audioBuffer.getChannelData(0)
  const duration = audioBuffer.duration
  
  // Calculate average amplitude
  let totalAmplitude = 0
  for (let i = 0; i < channelData.length; i++) {
    totalAmplitude += Math.abs(channelData[i])
  }
  const averageAmplitude = totalAmplitude / channelData.length
  
  // Simple spectral centroid estimation
  let spectralCentroid = 0
  const windowSize = 1024
  let windowCount = 0
  
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let numerator = 0
    let denominator = 0
    
    for (let j = 0; j < windowSize; j++) {
      const magnitude = Math.abs(channelData[i + j])
      const frequency = (j * audioBuffer.sampleRate) / windowSize
      numerator += frequency * magnitude
      denominator += magnitude
    }
    
    if (denominator > 0) {
      spectralCentroid += numerator / denominator
      windowCount++
    }
  }
  
  spectralCentroid = windowCount > 0 ? spectralCentroid / windowCount : 1000
  
  return {
    duration,
    averageAmplitude,
    spectralCentroid
  }
}

/**
 * Calculate validation metrics for BPM detection
 */
export function calculateBPMValidationMetrics(
  testResults: Array<{
    detected: number
    expected: number
    confidence: number
  }>,
  tolerance: number = 2
): CalibrationMetrics {
  const totalSamples = testResults.length
  let truePositives = 0
  let falsePositives = 0
  let falseNegatives = 0
  
  for (const result of testResults) {
    const withinTolerance = Math.abs(result.detected - result.expected) <= tolerance
    const highConfidence = result.confidence > 0.7
    
    if (withinTolerance && highConfidence) {
      truePositives++
    } else if (!withinTolerance && highConfidence) {
      falsePositives++
    } else if (withinTolerance && !highConfidence) {
      falseNegatives++
    }
  }
  
  const precision = truePositives / (truePositives + falsePositives) || 0
  const recall = truePositives / (truePositives + falseNegatives) || 0
  const accuracy = truePositives / totalSamples
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0
  
  return {
    accuracy,
    precision,
    recall,
    f1Score
  }
}

/**
 * Calculate validation metrics for key detection
 */
export function calculateKeyValidationMetrics(
  testResults: Array<{
    detectedKey: string
    detectedMode: 'major' | 'minor'
    expectedKey: string
    expectedMode: 'major' | 'minor'
    confidence: number
  }>
): CalibrationMetrics {
  const totalSamples = testResults.length
  let truePositives = 0
  let falsePositives = 0
  let falseNegatives = 0
  
  for (const result of testResults) {
    const keyMatch = result.detectedKey === result.expectedKey
    const modeMatch = result.detectedMode === result.expectedMode
    const exactMatch = keyMatch && modeMatch
    const highConfidence = result.confidence > 0.6
    
    if (exactMatch && highConfidence) {
      truePositives++
    } else if (!exactMatch && highConfidence) {
      falsePositives++
    } else if (exactMatch && !highConfidence) {
      falseNegatives++
    }
  }
  
  const precision = truePositives / (truePositives + falsePositives) || 0
  const recall = truePositives / (truePositives + falseNegatives) || 0
  const accuracy = truePositives / totalSamples
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0
  
  return {
    accuracy,
    precision,
    recall,
    f1Score
  }
}

/**
 * Hip hop specific BPM validation ranges
 */
export const HIP_HOP_BPM_RANGES = {
  boom_bap: { min: 85, max: 95 },
  old_school: { min: 95, max: 110 },
  trap: { min: 130, max: 150 },
  drill: { min: 140, max: 160 },
  lo_fi: { min: 80, max: 90 }
} as const

/**
 * Hip hop specific key preferences
 */
export const HIP_HOP_KEY_PREFERENCES = {
  common_keys: ['A', 'C', 'D', 'F', 'G', 'Bb', 'F#'],
  minor_preference: 0.7, // 70% of hip hop tracks are in minor keys
  mode_distribution: {
    major: 0.3,
    minor: 0.7
  }
} as const