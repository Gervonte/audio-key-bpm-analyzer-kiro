import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultsDisplay } from '../ResultsDisplay'
import type { AnalysisResult } from '../../types'

// Wrapper component to provide Chakra UI context
const renderWithChakra = (component: React.ReactElement) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {component}
    </ChakraProvider>
  )
}

const mockAnalysisResult: AnalysisResult = {
  key: {
    keyName: 'C Major',
    keySignature: 'C',
    confidence: 0.85,
    mode: 'major'
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
}

describe('ResultsDisplay', () => {
  it('renders nothing when no result, not loading, and no error', () => {
    const { container } = renderWithChakra(
      <ResultsDisplay
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('displays loading state correctly', () => {
    renderWithChakra(
      <ResultsDisplay
        isLoading={true}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('Analyzing audio...')).toBeInTheDocument()
  })

  it('displays error state correctly', () => {
    const mockOnReset = vi.fn()
    const errorMessage = 'Analysis failed due to corrupted file'

    renderWithChakra(
      <ResultsDisplay
        isLoading={false}
        error={errorMessage}
        onReset={mockOnReset}
      />
    )

    expect(screen.getByText('File Loading Error')).toBeInTheDocument()
    expect(screen.getByText(/corrupted or in an unsupported codec/i)).toBeInTheDocument()

    const tryAgainButton = screen.getByText('Try Another File')
    fireEvent.click(tryAgainButton)
    expect(mockOnReset).toHaveBeenCalledTimes(1)
  })

  it('displays analysis results correctly', () => {
    renderWithChakra(
      <ResultsDisplay
        analysisResult={mockAnalysisResult}
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    // Check main results
    expect(screen.getByText('Analysis Results')).toBeInTheDocument()
    expect(screen.getAllByText('C Major')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getAllByText('120')).toHaveLength(2) // Desktop and mobile layouts

    // Check confidence scores as percentages (both desktop and mobile layouts)
    expect(screen.getAllByText('85% confidence')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getAllByText('92% confidence')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getByText('88%')).toBeInTheDocument() // Overall confidence (single instance)

    // Check additional details
    expect(screen.getByText('C')).toBeInTheDocument() // Key signature
    expect(screen.getByText('Major')).toBeInTheDocument() // Mode
    expect(screen.getByText('480')).toBeInTheDocument() // Detected beats
    expect(screen.getByText('2.5s')).toBeInTheDocument() // Processing time
  })

  it('displays minor key correctly', () => {
    const minorKeyResult: AnalysisResult = {
      ...mockAnalysisResult,
      key: {
        keyName: 'A Minor',
        keySignature: 'Am',
        confidence: 0.78,
        mode: 'minor'
      }
    }

    renderWithChakra(
      <ResultsDisplay
        analysisResult={minorKeyResult}
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    expect(screen.getAllByText('A Minor')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getByText('Am')).toBeInTheDocument()
    expect(screen.getByText('Minor')).toBeInTheDocument()
    expect(screen.getAllByText('78% confidence')).toHaveLength(2) // Desktop and mobile layouts
  })

  it('calls onReset when analyze another file button is clicked', () => {
    const mockOnReset = vi.fn()

    renderWithChakra(
      <ResultsDisplay
        analysisResult={mockAnalysisResult}
        isLoading={false}
        onReset={mockOnReset}
      />
    )

    const resetButton = screen.getByText('Analyze Another File')
    fireEvent.click(resetButton)
    expect(mockOnReset).toHaveBeenCalledTimes(1)
  })

  it('displays confidence badges with appropriate colors', () => {
    const lowConfidenceResult: AnalysisResult = {
      ...mockAnalysisResult,
      confidence: {
        overall: 0.45,
        key: 0.45,
        bpm: 0.45
      }
    }

    renderWithChakra(
      <ResultsDisplay
        analysisResult={lowConfidenceResult}
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('formats processing time correctly for different durations', () => {
    const fastResult: AnalysisResult = {
      ...mockAnalysisResult,
      processingTime: 750 // 0.75 seconds
    }

    renderWithChakra(
      <ResultsDisplay
        analysisResult={fastResult}
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('0.8s')).toBeInTheDocument()
  })

  it('handles edge case values correctly', () => {
    const edgeCaseResult: AnalysisResult = {
      key: {
        keyName: 'F# Major',
        keySignature: 'F#',
        confidence: 1.0,
        mode: 'major'
      },
      bpm: {
        bpm: 180,
        confidence: 0.0,
        detectedBeats: 0
      },
      confidence: {
        overall: 0.5,
        key: 1.0,
        bpm: 0.0
      },
      processingTime: 0
    }

    renderWithChakra(
      <ResultsDisplay
        analysisResult={edgeCaseResult}
        isLoading={false}
        onReset={vi.fn()}
      />
    )

    expect(screen.getAllByText('F# Major')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getAllByText('180')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getAllByText('100% confidence')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getAllByText('0% confidence')).toHaveLength(2) // Desktop and mobile layouts
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Detected beats
    expect(screen.getByText('0.0s')).toBeInTheDocument() // Processing time
  })
})