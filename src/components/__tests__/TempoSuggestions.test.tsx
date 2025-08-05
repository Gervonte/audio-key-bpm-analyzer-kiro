import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { TempoSuggestions } from '../TempoSuggestions'

const renderWithChakra = (component: React.ReactElement) => {
    return render(
        <ChakraProvider value={defaultSystem}>
            {component}
        </ChakraProvider>
    )
}

describe('TempoSuggestions', () => {
    it('should not render for high confidence and typical BPM', () => {
        const { container } = renderWithChakra(
            <TempoSuggestions detectedBPM={120} confidence={0.9} />
        )

        expect(container.firstChild).toBeNull()
    })

    it('should render toggle button for low confidence', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        expect(screen.getByText('Tempo Analysis & Suggestions')).toBeInTheDocument()
    })

    it('should expand and show suggestions when clicked', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        // Should show genre context
        expect(screen.getByText(/Hip-hop tracks often have complex rhythmic patterns/)).toBeInTheDocument()

        // Should show alternative tempos section
        expect(screen.getByText('Alternative Tempos:')).toBeInTheDocument()

        // The actual suggestions may vary, so just check that some BPM values are shown
        const bpmElements = screen.getAllByText(/\d+ BPM/)
        expect(bpmElements.length).toBeGreaterThan(0)
    })

    it('should show tips section when expanded', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        expect(screen.getByText('Tips:')).toBeInTheDocument()
    })

    it('should show low confidence warning for very low confidence', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={120} confidence={0.4} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        expect(screen.getByText(/Low confidence detected/)).toBeInTheDocument()
    })

    it('should toggle expanded state when clicked', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')

        // Initially collapsed - check button text shows down arrow
        expect(screen.getByText('▼')).toBeInTheDocument()

        // Expand
        fireEvent.click(toggleButton)
        expect(screen.getByText('▲')).toBeInTheDocument()

        // Collapse again
        fireEvent.click(toggleButton)
        expect(screen.getByText('▼')).toBeInTheDocument()
    })

    it('should show appropriate confidence badges', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        // Should show some kind of badge/label for suggestions
        expect(screen.getByText('Detected')).toBeInTheDocument()
    })

    it('should handle double-time suggestions for low BPM', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={75} confidence={0.6} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        // Should show double-time suggestion
        expect(screen.getByText('150 BPM')).toBeInTheDocument()
        expect(screen.getByText('Double-time')).toBeInTheDocument()
    })

    it('should show genre-specific tips for different BPM ranges', () => {
        // Test boom-bap range
        renderWithChakra(
            <TempoSuggestions detectedBPM={85} confidence={0.7} />
        )

        const toggleButton = screen.getByText('Tempo Analysis & Suggestions')
        fireEvent.click(toggleButton)

        expect(screen.getByText(/boom-bap/)).toBeInTheDocument()
    })

    it('should be accessible with proper button role', () => {
        renderWithChakra(
            <TempoSuggestions detectedBPM={160} confidence={0.6} />
        )

        const toggleButton = screen.getByRole('button')
        expect(toggleButton).toBeInTheDocument()
        expect(toggleButton).toHaveTextContent('Tempo Analysis & Suggestions')
    })
})