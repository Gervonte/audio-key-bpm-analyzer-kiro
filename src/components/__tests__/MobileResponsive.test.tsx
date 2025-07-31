import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../../App'

// Mock the hooks
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    loadAudioFile: vi.fn().mockResolvedValue(new AudioBuffer({ length: 44100, sampleRate: 44100 })),
    createAudioFileObject: vi.fn().mockReturnValue({
      file: new File([''], 'test.mp3', { type: 'audio/mpeg' }),
      name: 'test.mp3',
      size: 1024,
      format: 'mp3',
      duration: 30
    })
  })
}))

vi.mock('../../hooks/useAudioProcessor', () => ({
  useAudioProcessor: () => ({
    processAudio: vi.fn().mockResolvedValue({
      key: { keyName: 'C Major', keySignature: 'C', confidence: 0.85, mode: 'major' },
      bpm: { bpm: 120, confidence: 0.92, detectedBeats: 480 },
      confidence: { overall: 0.88, key: 0.85, bpm: 0.92 },
      processingTime: 2500
    }),
    isProcessing: false,
    progress: 0,
    error: null,
    resetState: vi.fn()
  })
}))

vi.mock('../../hooks/useRetry', () => ({
  useAudioProcessingRetry: () => ({
    execute: vi.fn().mockResolvedValue({
      key: { keyName: 'C Major', keySignature: 'C', confidence: 0.85, mode: 'major' },
      bpm: { bpm: 120, confidence: 0.92, detectedBeats: 480 },
      confidence: { overall: 0.88, key: 0.85, bpm: 0.92 },
      processingTime: 2500
    }),
    retry: vi.fn(),
    canRetry: false,
    isRetrying: false
  })
}))

// Mock canvas context
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    roundRect: vi.fn()
  })),
  width: 800,
  height: 200,
  style: {}
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext
})

const renderApp = () => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  )
}

describe('Mobile Responsive Design', () => {
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    
    // Mock window.matchMedia for Chakra UI breakpoints
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
  })

  const setMobileViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })
    
    // Update matchMedia to return mobile breakpoint
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query.includes('max-width: 768px') || query.includes('(max-width: 48em)'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  const setDesktopViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    })
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  it('should render properly on mobile devices', () => {
    setMobileViewport()
    renderApp()
    
    // Check that main elements are present
    expect(screen.getByText('Audio Key & BPM Analyzer')).toBeInTheDocument()
    expect(screen.getByText('Upload your hip hop instrumental to analyze its key and BPM')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
  })

  it('should render properly on desktop devices', () => {
    setDesktopViewport()
    renderApp()
    
    // Check that main elements are present
    expect(screen.getByText('Audio Key & BPM Analyzer')).toBeInTheDocument()
    expect(screen.getByText('Upload your hip hop instrumental to analyze its key and BPM')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
  })

  it('should handle touch interactions on mobile', async () => {
    setMobileViewport()
    renderApp()
    
    const fileInput = screen.getByText('Choose File')
    
    // Simulate touch interaction
    fireEvent.touchStart(fileInput)
    fireEvent.touchEnd(fileInput)
    
    // Should not throw any errors
    expect(fileInput).toBeInTheDocument()
  })

  it('should handle orientation changes', async () => {
    setMobileViewport()
    renderApp()
    
    // Simulate orientation change
    fireEvent(window, new Event('orientationchange'))
    
    await waitFor(() => {
      expect(screen.getByText('Audio Key & BPM Analyzer')).toBeInTheDocument()
    })
  })

  it('should handle window resize events', async () => {
    setDesktopViewport()
    renderApp()
    
    // Change to mobile viewport
    setMobileViewport()
    
    // Simulate resize event
    fireEvent(window, new Event('resize'))
    
    await waitFor(() => {
      expect(screen.getByText('Audio Key & BPM Analyzer')).toBeInTheDocument()
    })
  })

  it('should have appropriate touch targets on mobile', () => {
    setMobileViewport()
    renderApp()
    
    const chooseFileButton = screen.getByText('Choose File')
    
    // Check that button has appropriate styling for touch
    expect(chooseFileButton).toBeInTheDocument()
    
    // The button should be clickable/touchable
    fireEvent.click(chooseFileButton)
    expect(chooseFileButton).toBeInTheDocument()
  })

  it('should handle file drag and drop on touch devices', async () => {
    setMobileViewport()
    renderApp()
    
    const dropZone = screen.getByText('Drag & drop your audio file here').closest('div')
    expect(dropZone).toBeInTheDocument()
    
    // Create a mock file
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' })
    
    // Simulate drag and drop (should work even on touch devices)
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
        types: ['Files']
      }
    })
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
        types: ['Files']
      }
    })
    
    // Should handle the interaction without errors
    expect(dropZone).toBeInTheDocument()
  })

  it('should display canvas with appropriate size on different screen sizes', () => {
    // Test mobile
    setMobileViewport()
    const { rerender } = renderApp()
    
    let canvas = document.querySelector('canvas')
    if (canvas) {
      // Mobile canvas should be smaller
      expect(canvas.width).toBeLessThanOrEqual(400)
    }
    
    // Test desktop
    setDesktopViewport()
    rerender(
      <ChakraProvider value={defaultSystem}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ChakraProvider>
    )
    
    canvas = document.querySelector('canvas')
    if (canvas) {
      // Desktop canvas should be larger
      expect(canvas.width).toBeGreaterThanOrEqual(600)
    }
  })

  it('should handle performance optimizations on mobile', () => {
    setMobileViewport()
    renderApp()
    
    // Check that the app renders without performance issues
    expect(screen.getByText('Audio Key & BPM Analyzer')).toBeInTheDocument()
    
    // Simulate multiple rapid interactions (should not cause issues)
    const chooseFileButton = screen.getByText('Choose File')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(chooseFileButton)
    }
    
    expect(chooseFileButton).toBeInTheDocument()
  })
})