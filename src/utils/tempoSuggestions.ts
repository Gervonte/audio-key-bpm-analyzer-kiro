// Smart tempo suggestions for BPM display
// Provides contextual suggestions for half-time/double-time detection

export interface TempoSuggestion {
  bpm: number
  label: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface TempoSuggestions {
  primary: number
  suggestions: TempoSuggestion[]
  tips: string[]
  genreContext: string
}

/**
 * Generate smart tempo suggestions based on detected BPM
 */
export function generateTempoSuggestions(detectedBPM: number, confidence: number): TempoSuggestions {
  const suggestions: TempoSuggestion[] = []
  const tips: string[] = []
  
  // Hip-hop specific context
  const genreContext = "Hip-hop tracks often have complex rhythmic patterns that can confuse BPM detection algorithms."
  
  // Calculate potential alternative tempos
  const halfTime = Math.round(detectedBPM / 2)
  const doubleTime = Math.round(detectedBPM * 2)
  const twoThirdsTime = Math.round(detectedBPM * 2 / 3)
  
  // Add primary detected BPM
  suggestions.push({
    bpm: detectedBPM,
    label: 'Detected',
    description: 'Primary tempo detected by the algorithm',
    confidence: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
    reason: `Algorithm confidence: ${Math.round(confidence * 100)}%`
  })
  
  // Analyze BPM range and add contextual suggestions
  if (detectedBPM >= 140 && detectedBPM <= 200) {
    // Likely double-time detection for hip-hop
    if (halfTime >= 70 && halfTime <= 100) {
      suggestions.push({
        bpm: halfTime,
        label: 'Half-time',
        description: 'Common hip-hop tempo (detected at double-time)',
        confidence: 'high',
        reason: 'Hip-hop tracks often get detected at double their actual tempo'
      })
      
      tips.push("Hip-hop beats are often detected at double-time due to prominent hi-hats and snare patterns.")
    }
  }
  
  if (detectedBPM >= 60 && detectedBPM <= 90) {
    // Likely half-time detection
    if (doubleTime >= 120 && doubleTime <= 180) {
      suggestions.push({
        bpm: doubleTime,
        label: 'Double-time',
        description: 'Faster tempo interpretation',
        confidence: 'medium',
        reason: 'Algorithm may have detected the slower underlying pulse'
      })
      
      tips.push("Some hip-hop tracks have a slower underlying pulse that can be interpreted as half-time.")
    }
  }
  
  // Check for triplet-based tempos (common in certain hip-hop styles)
  if (detectedBPM >= 150 && detectedBPM <= 240) {
    if (twoThirdsTime >= 80 && twoThirdsTime <= 160) {
      suggestions.push({
        bpm: twoThirdsTime,
        label: 'Triplet-based',
        description: 'Adjusted for triplet rhythm patterns',
        confidence: 'medium',
        reason: 'Triplet-heavy tracks can cause 1.5x tempo detection'
      })
    }
  }
  
  // Add confidence-based tips
  if (confidence < 0.6) {
    tips.push("Low confidence detection - the track may have irregular timing or complex rhythms.")
  }
  
  if (confidence > 0.9) {
    tips.push("High confidence detection - the tempo is likely accurate.")
  }
  
  // Add genre-specific tips comparing original and alternative tempos
  const getGenreForBPM = (bpm: number): string | null => {
    if (bpm >= 70 && bpm <= 90) return 'classic boom-bap and lo-fi hip-hop'
    if (bpm >= 120 && bpm <= 140) return 'modern trap and contemporary hip-hop'
    if (bpm >= 140 && bpm <= 180) return 'drill, UK drill, or uptempo hip-hop'
    return null
  }
  
  const originalGenre = getGenreForBPM(detectedBPM)
  const halfTimeGenre = getGenreForBPM(halfTime)
  const doubleTimeGenre = getGenreForBPM(doubleTime)
  
  // Create comprehensive tips comparing original and alternatives
  if (originalGenre && (halfTimeGenre || doubleTimeGenre)) {
    let tip = `The original detected tempo (${detectedBPM} BPM) is in the ${originalGenre} range`
    
    const alternatives = []
    if (halfTimeGenre && halfTime >= 60 && halfTime <= 200) {
      alternatives.push(`half-time (${halfTime} BPM) is in the ${halfTimeGenre} range`)
    }
    if (doubleTimeGenre && doubleTime >= 60 && doubleTime <= 200) {
      alternatives.push(`double-time (${doubleTime} BPM) is in the ${doubleTimeGenre} range`)
    }
    
    if (alternatives.length > 0) {
      tip += `, while the ${alternatives.join(' and ')}.`
      tips.push(tip)
    }
  } else if (originalGenre) {
    tips.push(`The detected tempo (${detectedBPM} BPM) is in the ${originalGenre} range.`)
  } else if (halfTimeGenre && halfTime >= 60 && halfTime <= 200) {
    tips.push(`The half-time suggestion (${halfTime} BPM) falls into the ${halfTimeGenre} range.`)
  } else if (doubleTimeGenre && doubleTime >= 60 && doubleTime <= 200) {
    tips.push(`The double-time suggestion (${doubleTime} BPM) is in the ${doubleTimeGenre} range.`)
  }
  
  // Remove duplicates and sort by confidence
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => s.bpm === suggestion.bpm)
  )
  
  const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
    const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 }
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
  })
  
  return {
    primary: detectedBPM,
    suggestions: sortedSuggestions,
    tips: tips.slice(0, 3), // Limit to 3 tips to avoid overwhelming UI
    genreContext
  }
}

/**
 * Get a simple suggestion message for display
 */
export function getSimpleSuggestionMessage(detectedBPM: number, confidence: number): string | null {
  if (confidence > 0.8) {
    return null // High confidence, no suggestion needed
  }
  
  const halfTime = Math.round(detectedBPM / 2)
  const doubleTime = Math.round(detectedBPM * 2)
  
  if (detectedBPM >= 140 && detectedBPM <= 200 && halfTime >= 70 && halfTime <= 100) {
    return `Consider ${halfTime} BPM (half-time) - common for hip-hop tracks`
  }
  
  if (detectedBPM >= 60 && detectedBPM <= 90 && doubleTime >= 120 && doubleTime <= 180) {
    return `Consider ${doubleTime} BPM (double-time) - may be the intended tempo`
  }
  
  return null
}

/**
 * Check if BPM is in a typical hip-hop range
 */
export function isTypicalHipHopBPM(bpm: number): boolean {
  return (bpm >= 70 && bpm <= 100) || (bpm >= 120 && bpm <= 180)
}

/**
 * Get educational context about BPM detection challenges
 */
export function getBPMEducationalTip(detectedBPM: number, confidence: number): string {
  if (confidence < 0.5) {
    return "BPM detection can be challenging with complex rhythms, syncopation, or irregular timing."
  }
  
  if (detectedBPM > 160) {
    return "High BPM values often indicate detection of hi-hat patterns rather than the main beat."
  }
  
  if (detectedBPM < 80) {
    return "Low BPM values might indicate detection of the underlying pulse rather than the perceived beat."
  }
  
  return "BPM detection algorithms analyze rhythmic patterns to estimate tempo."
}