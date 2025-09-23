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

export interface ConfidenceScores {
  overall: number
  key: number
  bpm: number
}

export interface AnalysisResult {
  key: KeyResult
  bpm: BPMResult
  confidence: ConfidenceScores
  processingTime: number
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

// Supported audio formats
export const SUPPORTED_FORMATS = ['mp3', 'wav', 'flac', 'm4a'] as const
export type SupportedFormat = typeof SUPPORTED_FORMATS[number]

// File size limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
export const MAX_PROCESSING_TIME = 30 * 1000 // 30 seconds in milliseconds

// BPM and confidence ranges
export const BPM_RANGE = { min: 60, max: 200 } as const
export const CONFIDENCE_RANGE = { min: 0, max: 1 } as const

// Demo feature types
export interface DemoSample {
  id: string
  name: string
  description: string
  subgenre: 'classic' | 'trap' | 'boom-bap' | 'modern'
  expectedKey: string
  expectedBPM: number
  duration: number
  fileSize: number
  filePath: string
  hipHopCharacteristics: {
    tempoStyle: string // e.g., "laid-back", "uptempo", "moderate"
    keyType: 'minor' | 'major'
    productionEra: string // e.g., "90s", "2000s", "modern"
    typicalUse: string // e.g., "freestyle", "commercial", "underground"
  }
}

export interface DemoCategory {
  id: string
  name: string
  description: string
  samples: DemoSample[]
  hipHopStyle: string
  era: string
  characteristics: string[]
}

export interface AudioLoadingOptions {
  useCache?: boolean
  preload?: boolean
  timeout?: number
}

export interface LoadingProgress {
  loaded: number
  total: number
  percentage: number
  currentFile?: string
}

export interface AudioLoadingResult {
  audioBuffer: AudioBuffer
  sample: DemoSample
  loadTime: number
  fromCache: boolean
}

// Union type for file selection (regular files or demo samples)
export type FileSelection = File | DemoSample

// Extended AppState to support demo mode
export interface ExtendedAppState extends AppState {
  isDemoMode?: boolean
  selectedDemoSample?: DemoSample | null
}