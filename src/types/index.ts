// Core data types for the audio analyzer application

export interface AudioFile {
  file: File
  name: string
  size: number
  format: string
  duration: number
}

export interface KeyResult {
  keyName: string        // e.g., "C Major", "A Minor"
  keySignature: string   // e.g., "C", "Am"
  confidence: number     // 0-1 confidence score (displayed as percentage)
  mode: 'major' | 'minor'
}

export interface BPMResult {
  bpm: number           // Rounded to nearest integer
  confidence: number    // 0-1 confidence score (displayed as percentage)
  detectedBeats: number // Number of beats detected
}

export interface AnalysisResult {
  key: KeyResult
  bpm: BPMResult
  confidence: ConfidenceScores
  processingTime: number
}

export interface ConfidenceScores {
  overall: number
  key: number
  bpm: number
}

export interface WaveformData {
  peaks: number[]
  duration: number
  sampleRate: number
  channels: number
}

export interface AppState {
  currentFile: AudioFile | null
  audioBuffer: AudioBuffer | null
  waveformData: WaveformData | null
  analysisResult: AnalysisResult | null
  isProcessing: boolean
  progress: number
  error: string | null
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}