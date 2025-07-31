import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { WaveformDisplay } from '../WaveformDisplay'

// Mock the useWaveform hook
const mockGenerateWaveformData = vi.fn()
const mockDrawWaveform = vi.fn()
const mockCanvasRef = { current: null }

vi.mock('../../hooks/useWaveform', () => ({
  useWaveform: () => ({
    generateWaveformData: mockGenerateWaveformData,
    drawWaveform: mockDrawWaveform,
    canvasRef: mockCanvasRef,
    isGenerating: false
  })
}))

  // Mock ResizeObserver
  ; (globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
})

const createMockAudioBuffer = (duration: number = 10): AudioBuffer => {
  return {
    duration,
    sampleRate: 44100,
    numberOfChannels: 1,
    length: duration * 44100,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(duration * 44100)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn()
  } as unknown as AudioBuffer
}

const renderWithChakra = (component: React.ReactElement) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {component}
    </ChakraProvider>
  )
}

describe('WaveformDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateWaveformData.mockReturnValue({
      peaks: [0.5, 0.8, 0.3, 0.9, 0.1],
      duration: 5,
      sampleRate: 44100,
      channels: 1
    })
  })

  it('should render empty state when no audio buffer is provided', () => {
    renderWithChakra(<WaveformDisplay />)

    expect(screen.getByText('Upload an audio file to see waveform')).toBeInTheDocument()
  })

  it('should render loading state when isLoading is true', () => {
    renderWithChakra(<WaveformDisplay isLoading={true} />)

    expect(screen.getByText('Loading audio...')).toBeInTheDocument()
    // Check for spinner by class instead of role
    expect(document.querySelector('.chakra-spinner')).toBeInTheDocument()
  })

  it('should render error state when error is provided', () => {
    const errorMessage = 'Failed to load waveform'
    renderWithChakra(<WaveformDisplay error={errorMessage} />)

    expect(screen.getByText('Waveform Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should generate and display waveform when audio buffer is provided', async () => {
    const mockAudioBuffer = createMockAudioBuffer(5)

    renderWithChakra(<WaveformDisplay audioBuffer={mockAudioBuffer} />)

    await waitFor(() => {
      expect(mockGenerateWaveformData).toHaveBeenCalledWith(mockAudioBuffer)
    })

    // Should display audio info (both desktop and mobile layouts)
    expect(screen.getAllByText(/Duration: 5s/)).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getByText(/Sample Rate: 44100Hz/)).toBeInTheDocument() // Desktop only
    expect(screen.getByText(/44100Hz • 1 channel/)).toBeInTheDocument() // Mobile only

    // Should have a canvas element
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should display progress when progress prop is provided', async () => {
    const mockAudioBuffer = createMockAudioBuffer(5)

    renderWithChakra(
      <WaveformDisplay
        audioBuffer={mockAudioBuffer}
        progress={0.75}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('75% analyzed')).toBeInTheDocument()
    })
  })

  it('should call drawWaveform with progress when progress changes', async () => {
    const mockAudioBuffer = createMockAudioBuffer(5)

    const { rerender } = renderWithChakra(
      <WaveformDisplay audioBuffer={mockAudioBuffer} />
    )

    await waitFor(() => {
      expect(mockGenerateWaveformData).toHaveBeenCalled()
    })

    // Update with progress
    rerender(
      <ChakraProvider value={defaultSystem}>
        <WaveformDisplay audioBuffer={mockAudioBuffer} progress={0.5} />
      </ChakraProvider>
    )

    await waitFor(() => {
      expect(mockDrawWaveform).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.any(Object),
        0.5
      )
    })
  })

  it('should handle canvas sizing and high DPI displays', async () => {
    // Mock high DPI display
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
    })

    const mockAudioBuffer = createMockAudioBuffer(5)

    renderWithChakra(<WaveformDisplay audioBuffer={mockAudioBuffer} />)

    await waitFor(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      expect(canvas).toBeInTheDocument()
    })
  })

  it('should not generate waveform data when loading', () => {
    const mockAudioBuffer = createMockAudioBuffer(5)

    renderWithChakra(
      <WaveformDisplay
        audioBuffer={mockAudioBuffer}
        isLoading={true}
      />
    )

    expect(mockGenerateWaveformData).not.toHaveBeenCalled()
  })

  it('should handle waveform generation errors gracefully', async () => {
    const mockAudioBuffer = createMockAudioBuffer(5)
    mockGenerateWaveformData.mockImplementation(() => {
      throw new Error('Generation failed')
    })

    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    renderWithChakra(<WaveformDisplay audioBuffer={mockAudioBuffer} />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to generate waveform data:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it('should update canvas size on window resize', async () => {
    const mockAudioBuffer = createMockAudioBuffer(5)

    renderWithChakra(<WaveformDisplay audioBuffer={mockAudioBuffer} />)

    // Trigger resize event
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(mockGenerateWaveformData).toHaveBeenCalled()
    })
  })

  it('should clean up resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderWithChakra(<WaveformDisplay />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})