/**
 * Demo Samples Management
 * 
 * This module manages hip-hop instrumental demo samples for the demo feature.
 * It provides interfaces, sample definitions, and utility functions for
 * working with pre-loaded audio samples.
 */

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

/**
 * Hip-Hop Demo Samples Configuration
 * 
 * These samples represent different subgenres of hip-hop instrumentals
 * with known musical properties for testing and demonstration purposes.
 */
export const HIP_HOP_DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'classic-hip-hop-beat',
    name: 'Classic Hip-Hop Beat',
    description: 'A classic 90s-style hip-hop instrumental with heavy kick and snare patterns, perfect for freestyle and underground rap',
    subgenre: 'classic',
    expectedKey: 'C Minor',
    expectedBPM: 90,
    duration: 30,
    fileSize: 1024 * 1024, // 1MB placeholder
    filePath: '/demo-samples/classic-hip-hop-beat.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'laid-back',
      keyType: 'minor',
      productionEra: '90s',
      typicalUse: 'freestyle'
    }
  },
  {
    id: 'trap-instrumental',
    name: 'Trap Instrumental',
    description: 'A modern trap instrumental with heavy 808s, hi-hats, and dark minor key progression',
    subgenre: 'trap',
    expectedKey: 'A Minor',
    expectedBPM: 140,
    duration: 25,
    fileSize: 1024 * 1024, // 1MB placeholder
    filePath: '/demo-samples/trap-instrumental.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'uptempo',
      keyType: 'minor',
      productionEra: '2010s',
      typicalUse: 'commercial'
    }
  },
  {
    id: 'boom-bap-beat',
    name: 'Boom Bap Beat',
    description: 'A traditional boom bap instrumental with classic drum breaks and soulful samples',
    subgenre: 'boom-bap',
    expectedKey: 'F Minor',
    expectedBPM: 85,
    duration: 28,
    fileSize: 1024 * 1024, // 1MB placeholder
    filePath: '/demo-samples/boom-bap-beat.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '90s',
      typicalUse: 'underground'
    }
  },
  {
    id: 'modern-hip-hop-track',
    name: 'Modern Hip-Hop Track',
    description: 'A contemporary hip-hop instrumental blending traditional elements with modern production techniques',
    subgenre: 'modern',
    expectedKey: 'G Minor',
    expectedBPM: 120,
    duration: 32,
    fileSize: 1024 * 1024, // 1MB placeholder
    filePath: '/demo-samples/modern-hip-hop-track.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '2020s',
      typicalUse: 'versatile'
    }
  }
]

/**
 * Demo Categories for organizing samples by hip-hop subgenre
 */
export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: 'classic',
    name: 'Classic Hip-Hop',
    description: 'Traditional hip-hop beats from the golden era',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'classic'),
    hipHopStyle: 'Golden Era',
    era: '90s',
    characteristics: ['heavy kick', 'snare patterns', 'laid-back tempo', 'underground feel']
  },
  {
    id: 'trap',
    name: 'Trap',
    description: 'Modern trap instrumentals with heavy 808s',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'trap'),
    hipHopStyle: 'Trap',
    era: '2010s',
    characteristics: ['808s', 'hi-hats', 'dark minor keys', 'uptempo']
  },
  {
    id: 'boom-bap',
    name: 'Boom Bap',
    description: 'Traditional boom bap with classic drum breaks',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'boom-bap'),
    hipHopStyle: 'Boom Bap',
    era: '90s',
    characteristics: ['drum breaks', 'soulful samples', 'moderate tempo', 'underground']
  },
  {
    id: 'modern',
    name: 'Modern Hip-Hop',
    description: 'Contemporary hip-hop production',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'modern'),
    hipHopStyle: 'Contemporary',
    era: '2020s',
    characteristics: ['blended styles', 'modern production', 'versatile', 'current trends']
  }
]

/**
 * Utility functions for working with demo samples
 */

/**
 * Get a demo sample by its ID
 */
export function getSampleById(id: string): DemoSample | null {
  return HIP_HOP_DEMO_SAMPLES.find(sample => sample.id === id) || null
}

/**
 * Get all samples for a specific subgenre
 */
export function getSamplesBySubgenre(subgenre: string): DemoSample[] {
  return HIP_HOP_DEMO_SAMPLES.filter(sample => sample.subgenre === subgenre)
}

/**
 * Get all available demo samples
 */
export function getAllSamples(): DemoSample[] {
  return HIP_HOP_DEMO_SAMPLES
}

/**
 * Get samples by production era
 */
export function getSamplesByEra(era: string): DemoSample[] {
  return HIP_HOP_DEMO_SAMPLES.filter(sample => 
    sample.hipHopCharacteristics.productionEra === era
  )
}

/**
 * Get samples within a specific BPM range
 */
export function getSamplesByTempoRange(minBPM: number, maxBPM: number): DemoSample[] {
  return HIP_HOP_DEMO_SAMPLES.filter(sample => 
    sample.expectedBPM >= minBPM && sample.expectedBPM <= maxBPM
  )
}

/**
 * Get educational information about a sample
 */
export function getEducationalInfo(sample: DemoSample): string {
  const { tempoStyle, productionEra, typicalUse } = sample.hipHopCharacteristics
  
  return `This ${sample.subgenre} beat is typical of ${productionEra} hip-hop production with ${tempoStyle} tempo perfect for ${typicalUse}.`
}

/**
 * Get all available subgenres
 */
export function getAvailableSubgenres(): string[] {
  return [...new Set(HIP_HOP_DEMO_SAMPLES.map(sample => sample.subgenre))]
}

/**
 * Get all available production eras
 */
export function getAvailableEras(): string[] {
  return [...new Set(HIP_HOP_DEMO_SAMPLES.map(sample => sample.hipHopCharacteristics.productionEra))]
}

/**
 * Validate if a sample ID exists
 */
export function isValidSampleId(id: string): boolean {
  return HIP_HOP_DEMO_SAMPLES.some(sample => sample.id === id)
}

/**
 * Get sample statistics
 */
export function getSampleStats() {
  const samples = HIP_HOP_DEMO_SAMPLES
  const totalSamples = samples.length
  const totalDuration = samples.reduce((sum, sample) => sum + sample.duration, 0)
  const avgBPM = samples.reduce((sum, sample) => sum + sample.expectedBPM, 0) / totalSamples
  const subgenres = getAvailableSubgenres()
  const eras = getAvailableEras()
  
  return {
    totalSamples,
    totalDuration,
    avgBPM: Math.round(avgBPM),
    subgenres,
    eras,
    totalSize: samples.reduce((sum, sample) => sum + sample.fileSize, 0)
  }
}
