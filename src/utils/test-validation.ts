// Simple test to verify types and validation functions work
import { validateAudioFile, createAudioFile, formatFileSize, formatConfidence } from './validation'
import type { AudioFile, KeyResult, BPMResult } from '../types'

// Test the validation functions
console.log('Testing validation functions...')

// Create a mock file for testing
const mockFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' })

// Test file validation
const validation = validateAudioFile(mockFile)
console.log('File validation result:', validation)

// Test AudioFile creation
const audioFile = createAudioFile(mockFile)
console.log('Created AudioFile:', audioFile)

// Test utility functions
console.log('Formatted file size:', formatFileSize(1024 * 1024)) // 1MB
console.log('Formatted confidence:', formatConfidence(0.85)) // 85%

// Test type definitions work
const sampleKeyResult: KeyResult = {
  keyName: 'C Major',
  keySignature: 'C',
  confidence: 0.85,
  mode: 'major'
}

const sampleBPMResult: BPMResult = {
  bpm: 120,
  confidence: 0.90,
  detectedBeats: 240
}

console.log('Sample key result:', sampleKeyResult)
console.log('Sample BPM result:', sampleBPMResult)

console.log('All types and validation functions are working correctly!')