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
    id: 'chance-the-rapper-back-to-the-go',
    name: 'Chance The Rapper - Back To The Go [Instrumental]',
    description: 'Complex instrumental (analyzed incorrectly) track featuring Chance The Rapper\'s signature style with soulful samples, intricate production, and jazz-influenced arrangements',
    subgenre: 'modern',
    expectedKey: 'E Minor',
    expectedBPM: 170,
    duration: 35,
    fileSize: 4128967, // ~4.1MB actual file size
    filePath: '/demo-samples/Chance The Rapper - Back To The Go [Instrumental] | Complex.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'laid-back',
      keyType: 'minor',
      productionEra: '2020s',
      typicalUse: 'versatile'
    }
  },
  {
    id: 'daffy-accurate',
    name: 'Daffy [prod. Tumfy] | Accurate',
    description: 'Clean instrumental production by Tumfy featuring modern trap elements with crisp 808s, melodic synths, and professional mixing',
    subgenre: 'trap',
    expectedKey: 'D Minor',
    expectedBPM: 132,
    duration: 30,
    fileSize: 2797537, // ~2.8MB actual file size
    filePath: '/demo-samples/Daffy [prod. Tumfy] | Accurate.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '2020s',
      typicalUse: 'commercial'
    }
  },
  {
    id: 'daffy-corrupted',
    name: 'Daffy [prod. Tumfy] | Corrupted',
    description: 'Corrupted version of the Daffy trap instrumental for testing error handling and audio processing edge cases',
    subgenre: 'trap',
    expectedKey: 'Error',
    expectedBPM: 0,
    duration: 30,
    fileSize: 2797537, // ~2.8MB actual file size (same as accurate version)
    filePath: '/demo-samples/Daffy [prod. Tumfy] | Corrupted.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '2020s',
      typicalUse: 'testing'
    }
  },
  {
    id: 'kaytranada-glowed-up',
    name: 'Kaytranada - GLOWED UP [Instrumental] | Accurate',
    description: 'Accurate instrumental from Kaytranada\'s GLOWED UP featuring electronic hip-hop production with jazz fusion, soulful samples, and intricate beat programming',
    subgenre: 'modern',
    expectedKey: 'F# Minor',
    expectedBPM: 139,
    duration: 40,
    fileSize: 4324760, // ~4.3MB actual file size
    filePath: '/demo-samples/Kaytranada - GLOWED UP [Instrumental] | Accurate.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '2010s',
      typicalUse: 'versatile'
    }
  }
]

/**
 * Demo Categories for organizing samples by hip-hop subgenre
 */
export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: 'modern',
    name: 'Modern Hip-Hop',
    description: 'Contemporary hip-hop production featuring real artist instrumentals with jazz and electronic influences',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'modern'),
    hipHopStyle: 'Contemporary',
    era: '2010s-2020s',
    characteristics: ['real artist tracks', 'jazz fusion', 'electronic elements', 'versatile styles']
  },
  {
    id: 'trap',
    name: 'Trap Production',
    description: 'Modern trap instrumentals featuring 808s, melodic synths, and contemporary production techniques',
    samples: HIP_HOP_DEMO_SAMPLES.filter(s => s.subgenre === 'trap'),
    hipHopStyle: 'Trap',
    era: '2020s',
    characteristics: ['808s', 'melodic synths', 'modern mixing', 'commercial appeal']
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
