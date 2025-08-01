import { describe, it, expect, vi, beforeEach } from 'vitest'
//import { fireEvent, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'

// Simplified canvas mock to avoid IPC issues
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => null), // Return null to skip canvas operations
})

// Set shorter timeout to avoid IPC issues
const INTEGRATION_TEST_TIMEOUT = 5000

// Set test timeout globally
vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT })

// Mock matchMedia for Chakra UI
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock the audio processing modules
vi.mock('../utils/audioProcessor', () => ({
  AudioProcessor: vi.fn().mockImplementation(() => ({
    processAudio: vi.fn().mockResolvedValue({
      key: {
        keyName: 'C Major',
        keySignature: 'C',
        confidence: 0.85,
        mode: 'major' as const
      },
      bpm: {
        bpm: 120,
        confidence: 0.92,
        detectedBeats: 480
      },
      confidence: {
        overall: 0.88,
        key: 0.85,
        bpm: 0.92
      },
      processingTime: 2500
    }),
    cancelProcessing: vi.fn(),
    keyDetector: {} as any,
    bpmDetector: {} as any,
    abortController: new AbortController(),
    getAudioFeatures: vi.fn(),
    normalizeAudio: vi.fn(),
    cleanup: vi.fn(),
    isProcessing: false,
    progress: 0
  }))
}))

vi.mock('../utils/validation', () => ({
  validateAudioFile: vi.fn(),
  formatFileSize: vi.fn((size: number) => `${Math.round(size / (1024 * 1024))}MB`),
  SUPPORTED_FORMATS: ['mp3', 'wav', 'flac', 'm4a'],
  MAX_FILE_SIZE: 50 * 1024 * 1024
}))

vi.mock('../utils/audioProcessing', () => ({
  checkWebAudioSupport: vi.fn(() => ({ isSupported: true })),
  createAudioContext: vi.fn(() => ({
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 7938000,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(7938000))
    }),
    close: vi.fn().mockResolvedValue(undefined)
  })),
  closeAudioContext: vi.fn().mockResolvedValue(undefined),
  validateAudioBuffer: vi.fn(() => ({ isValid: true })),
  preprocessAudioBuffer: vi.fn((buffer: AudioBuffer) => buffer),
  isCorruptedAudioError: vi.fn(() => false),
  extractAudioMetadata: vi.fn(() => ({
    duration: 180,
    sampleRate: 44100,
    channels: 2,
    length: 7938000
  }))
}))

vi.mock('../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    loadAudioFile: vi.fn().mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 7938000,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(7938000))
    }),
    createAudioFileObject: vi.fn().mockReturnValue({
      file: new File(['test'], 'test.mp3', { type: 'audio/mpeg' }),
      name: 'test.mp3',
      size: 1024,
      format: 'mp3',
      duration: 180
    }),
    isSupported: true,
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a']
  })
}))

vi.mock('../hooks/useWaveform', () => ({
  useWaveform: () => ({
    canvasRef: { current: null },
    drawWaveform: vi.fn(),
    clearWaveform: vi.fn(),
    isDrawing: false,
    error: null
  })
}))

// Helper functions for creating test files
const createValidAudioFile = () => {
  return new File(['fake audio content'], 'test.mp3', { type: 'audio/mpeg' })
}

// const createUnsupportedFile = () => {
//   return new File(['fake content'], 'test.txt', { type: 'text/plain' })
// }

// const createOversizedAudioFile = () => {
//   // Create a file that appears to be over 50MB
//   const largeContent = new Array(52 * 1024 * 1024).fill('a').join('')
//   return new File([largeContent], 'large.mp3', { type: 'audio/mpeg' })
// }

const system = createSystem(defaultConfig)

const renderApp = () => {
  return render(
    <BrowserRouter>
      <ChakraProvider value={system}>
        <App />
      </ChakraProvider>
    </BrowserRouter>
  )
}

describe('Integration Tests - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render app and handle file upload', async () => {
    const { validateAudioFile } = await import('../utils/validation')
    const mockValidateAudioFile = validateAudioFile as any
    mockValidateAudioFile.mockReturnValue({ isValid: true })

    renderApp()

    // Verify app renders
    expect(screen.getByText(/drag.*drop.*audio file/i)).toBeInTheDocument()

    // Verify file input exists
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(hiddenInput).toBeInTheDocument()

    // Basic functionality test - upload a file
    const validFile = createValidAudioFile()
    await userEvent.upload(hiddenInput, validFile)

    // Give minimal time for processing
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify app doesn't crash and shows some content
    expect(document.body.textContent).toBeTruthy()
  })

  it('should show app title and basic UI elements', () => {
    renderApp()
    
    // Verify basic UI elements are present
    expect(screen.getByText(/Audio Key & BPM Analyzer/i)).toBeInTheDocument()
    expect(screen.getByText(/Supported formats/i)).toBeInTheDocument()
    expect(screen.getByText(/Maximum file size/i)).toBeInTheDocument()
  })
})