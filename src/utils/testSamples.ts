// Test samples with known BPM and key values for validation
// This module provides synthetic audio samples for testing accuracy

export interface TestSample {
  name: string
  expectedBPM: number
  expectedKey: string
  expectedMode: 'major' | 'minor'
  description: string
}

// Hip hop instrumental test samples with known values
export const HIP_HOP_TEST_SAMPLES: TestSample[] = [
  {
    name: 'classic_boom_bap',
    expectedBPM: 90,
    expectedKey: 'C',
    expectedMode: 'minor',
    description: 'Classic boom bap style at 90 BPM in C minor'
  },
  {
    name: 'trap_style',
    expectedBPM: 140,
    expectedKey: 'F#',
    expectedMode: 'minor',
    description: 'Modern trap style at 140 BPM in F# minor'
  },
  {
    name: 'old_school',
    expectedBPM: 100,
    expectedKey: 'G',
    expectedMode: 'major',
    description: 'Old school hip hop at 100 BPM in G major'
  },
  {
    name: 'drill_style',
    expectedBPM: 150,
    expectedKey: 'D',
    expectedMode: 'minor',
    description: 'Drill style at 150 BPM in D minor'
  },
  {
    name: 'lo_fi_hip_hop',
    expectedBPM: 85,
    expectedKey: 'A',
    expectedMode: 'minor',
    description: 'Lo-fi hip hop at 85 BPM in A minor'
  }
]

/**
 * Generate synthetic audio buffer for testing with known BPM and key
 */
export function generateTestAudioBuffer(
  sample: TestSample,
  sampleRate: number = 44100,
  duration: number = 10
): AudioBuffer {
  const length = sampleRate * duration
  const audioBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length,
    sampleRate
  })

  const channelData = audioBuffer.getChannelData(0)
  const beatsPerSecond = sample.expectedBPM / 60
  const samplesPerBeat = sampleRate / beatsPerSecond

  // Generate key-specific frequencies
  const keyFrequencies = getKeyFrequencies(sample.expectedKey, sample.expectedMode)
  
  // Generate hip hop style beat pattern
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate
    const beatPhase = (i % samplesPerBeat) / samplesPerBeat
    
    // Create hip hop style drum pattern
    let amplitude = 0
    
    // Kick on beats 1 and 3 (stronger)
    if (beatPhase < 0.05) {
      amplitude = 0.8
    }
    // Snare on beats 2 and 4
    else if (beatPhase > 0.45 && beatPhase < 0.55) {
      amplitude = 0.6
    }
    // Hi-hats (subtle)
    else if (beatPhase % 0.25 < 0.02) {
      amplitude = 0.2
    }
    
    // Add harmonic content based on key
    let sample = 0
    for (let j = 0; j < keyFrequencies.length; j++) {
      const freq = keyFrequencies[j]
      const harmonic = Math.sin(2 * Math.PI * freq * time) * (1 / (j + 1))
      sample += harmonic * amplitude * 0.3
    }
    
    // Add some noise for realism
    sample += (Math.random() - 0.5) * 0.05 * amplitude
    
    channelData[i] = Math.max(-1, Math.min(1, sample))
  }

  return audioBuffer
}

/**
 * Get frequencies for a given key and mode
 */
function getKeyFrequencies(key: string, mode: 'major' | 'minor'): number[] {
  const noteFrequencies: Record<string, number> = {
    'C': 261.63,
    'C#': 277.18,
    'Db': 277.18,
    'D': 293.66,
    'D#': 311.13,
    'Eb': 311.13,
    'E': 329.63,
    'F': 349.23,
    'F#': 369.99,
    'Gb': 369.99,
    'G': 392.00,
    'G#': 415.30,
    'Ab': 415.30,
    'A': 440.00,
    'A#': 466.16,
    'Bb': 466.16,
    'B': 493.88
  }

  const rootFreq = noteFrequencies[key] || 261.63
  
  if (mode === 'major') {
    // Major scale intervals: 1, 3, 5
    return [
      rootFreq,           // Root
      rootFreq * 1.25,    // Major third
      rootFreq * 1.5      // Perfect fifth
    ]
  } else {
    // Minor scale intervals: 1, b3, 5
    return [
      rootFreq,           // Root
      rootFreq * 1.2,     // Minor third
      rootFreq * 1.5      // Perfect fifth
    ]
  }
}

/**
 * Calculate accuracy metrics for BPM detection
 */
export function calculateBPMAccuracy(detected: number, expected: number): {
  accuracy: number
  withinTolerance: boolean
  error: number
} {
  const error = Math.abs(detected - expected)
  const tolerance = 2 // ±2 BPM as per requirements
  const withinTolerance = error <= tolerance
  
  // Calculate accuracy as percentage (100% if within tolerance, decreasing with error)
  const accuracy = withinTolerance ? 100 : Math.max(0, 100 - (error / expected) * 100)
  
  return {
    accuracy,
    withinTolerance,
    error
  }
}

/**
 * Calculate accuracy metrics for key detection
 */
export function calculateKeyAccuracy(
  detectedKey: string,
  detectedMode: 'major' | 'minor',
  expectedKey: string,
  expectedMode: 'major' | 'minor'
): {
  keyMatch: boolean
  modeMatch: boolean
  exactMatch: boolean
  accuracy: number
} {
  const keyMatch = normalizeKey(detectedKey) === normalizeKey(expectedKey)
  const modeMatch = detectedMode === expectedMode
  const exactMatch = keyMatch && modeMatch
  
  // Calculate accuracy: 100% for exact match, 50% for key or mode match, 0% for no match
  let accuracy = 0
  if (exactMatch) {
    accuracy = 100
  } else if (keyMatch || modeMatch) {
    accuracy = 50
  }
  
  return {
    keyMatch,
    modeMatch,
    exactMatch,
    accuracy
  }
}

/**
 * Normalize key names for comparison (handle enharmonic equivalents)
 */
function normalizeKey(key: string): string {
  const enharmonicMap: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb'
  }
  
  return enharmonicMap[key] || key
}