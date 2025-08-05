import { describe, it, expect } from 'vitest'
import { 
  generateTempoSuggestions, 
  getSimpleSuggestionMessage, 
  isTypicalHipHopBPM,
  getBPMEducationalTip
} from '../tempoSuggestions'

describe('tempoSuggestions', () => {
  describe('generateTempoSuggestions', () => {
    it('should generate half-time suggestion for high BPM', () => {
      const result = generateTempoSuggestions(160, 0.7)
      
      expect(result.primary).toBe(160)
      expect(result.suggestions.length).toBeGreaterThanOrEqual(2) // Primary + half-time + possibly others
      
      const halfTimeSuggestion = result.suggestions.find(s => s.label === 'Half-time')
      expect(halfTimeSuggestion).toBeDefined()
      expect(halfTimeSuggestion?.bpm).toBe(80)
      expect(halfTimeSuggestion?.confidence).toBe('high')
    })

    it('should generate double-time suggestion for low BPM', () => {
      const result = generateTempoSuggestions(75, 0.6)
      
      expect(result.primary).toBe(75)
      
      const doubleTimeSuggestion = result.suggestions.find(s => s.label === 'Double-time')
      expect(doubleTimeSuggestion).toBeDefined()
      expect(doubleTimeSuggestion?.bpm).toBe(150)
      expect(doubleTimeSuggestion?.confidence).toBe('medium')
    })

    it('should generate triplet-based suggestion for very high BPM', () => {
      const result = generateTempoSuggestions(180, 0.5)
      
      const tripletSuggestion = result.suggestions.find(s => s.label === 'Triplet-based')
      expect(tripletSuggestion).toBeDefined()
      expect(tripletSuggestion?.bpm).toBe(120) // 180 * 2/3
    })

    it('should include appropriate tips for low confidence', () => {
      const result = generateTempoSuggestions(120, 0.4)
      
      expect(result.tips).toContain('Low confidence detection - the track may have irregular timing or complex rhythms.')
    })

    it('should include appropriate tips for high confidence', () => {
      const result = generateTempoSuggestions(120, 0.95)
      
      expect(result.tips).toContain('High confidence detection - the tempo is likely accurate.')
    })

    it('should include genre-specific tips for different BPM ranges', () => {
      // Boom-bap range
      const boomBapResult = generateTempoSuggestions(85, 0.8)
      expect(boomBapResult.tips.some(tip => tip.includes('boom-bap'))).toBe(true)

      // Trap range
      const trapResult = generateTempoSuggestions(130, 0.8)
      expect(trapResult.tips.some(tip => tip.includes('trap'))).toBe(true)

      // Drill range
      const drillResult = generateTempoSuggestions(150, 0.8)
      expect(drillResult.tips.some(tip => tip.includes('drill'))).toBe(true)
    })

    it('should remove duplicate suggestions', () => {
      const result = generateTempoSuggestions(120, 0.7)
      
      const bpms = result.suggestions.map(s => s.bpm)
      const uniqueBpms = [...new Set(bpms)]
      
      expect(bpms).toEqual(uniqueBpms)
    })

    it('should sort suggestions by confidence', () => {
      const result = generateTempoSuggestions(160, 0.5) // Should generate multiple suggestions
      
      for (let i = 0; i < result.suggestions.length - 1; i++) {
        const current = result.suggestions[i]
        const next = result.suggestions[i + 1]
        
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        expect(confidenceOrder[current.confidence]).toBeGreaterThanOrEqual(confidenceOrder[next.confidence])
      }
    })

    it('should limit tips to maximum of 3', () => {
      const result = generateTempoSuggestions(85, 0.3) // Should generate many tips
      
      expect(result.tips.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getSimpleSuggestionMessage', () => {
    it('should return null for high confidence', () => {
      const result = getSimpleSuggestionMessage(120, 0.9)
      expect(result).toBeNull()
    })

    it('should suggest half-time for high BPM with low confidence', () => {
      const result = getSimpleSuggestionMessage(160, 0.6)
      expect(result).toContain('80 BPM (half-time)')
    })

    it('should suggest double-time for low BPM with low confidence', () => {
      const result = getSimpleSuggestionMessage(75, 0.6)
      expect(result).toContain('150 BPM (double-time)')
    })

    it('should return null for BPM outside suggestion ranges', () => {
      const result = getSimpleSuggestionMessage(110, 0.6)
      expect(result).toBeNull()
    })
  })

  describe('isTypicalHipHopBPM', () => {
    it('should return true for classic hip-hop range (70-100)', () => {
      expect(isTypicalHipHopBPM(85)).toBe(true)
      expect(isTypicalHipHopBPM(70)).toBe(true)
      expect(isTypicalHipHopBPM(100)).toBe(true)
    })

    it('should return true for modern hip-hop range (120-180)', () => {
      expect(isTypicalHipHopBPM(130)).toBe(true)
      expect(isTypicalHipHopBPM(120)).toBe(true)
      expect(isTypicalHipHopBPM(180)).toBe(true)
    })

    it('should return false for BPM outside typical ranges', () => {
      expect(isTypicalHipHopBPM(60)).toBe(false)
      expect(isTypicalHipHopBPM(110)).toBe(false)
      expect(isTypicalHipHopBPM(200)).toBe(false)
    })
  })

  describe('getBPMEducationalTip', () => {
    it('should provide tip for low confidence', () => {
      const tip = getBPMEducationalTip(120, 0.4)
      expect(tip).toContain('complex rhythms')
    })

    it('should provide tip for high BPM', () => {
      const tip = getBPMEducationalTip(180, 0.8)
      expect(tip).toContain('hi-hat patterns')
    })

    it('should provide tip for low BPM', () => {
      const tip = getBPMEducationalTip(70, 0.8)
      expect(tip).toContain('underlying pulse')
    })

    it('should provide general tip for normal BPM and confidence', () => {
      const tip = getBPMEducationalTip(120, 0.8)
      expect(tip).toContain('rhythmic patterns')
    })
  })
})