# Demo Feature Quick Start Guide - Hip-Hop Focused

## Overview
This guide provides a simplified approach to implementing the demo feature using your existing hip-hop instrumental files, following the project's established design guidelines and hip-hop focus.

## Related Documentation
- **[DEMO_FEATURE_HIP_HOP_FOCUSED.md](./DEMO_FEATURE_HIP_HOP_FOCUSED.md)** - Comprehensive implementation plan and architecture
- **[DEMO_FEATURE_TASKS.md](./DEMO_FEATURE_TASKS.md)** - Detailed task breakdown and timeline
- **[DEMO_FEATURE_UI_MOCKUP.md](./DEMO_FEATURE_UI_MOCKUP.md)** - Visual design specifications and mockups

## Step 1: Prepare Audio Files

### File Requirements
- **Format**: MP3 (recommended for web compatibility)
- **Size**: Under 5MB each for fast loading
- **Duration**: 15-30 seconds for quick analysis
- **Quality**: 44.1kHz, 16-bit minimum

### File Organization
```
public/
└── demo-samples/
    ├── classic-hip-hop-beat.mp3      # 90 BPM, C Minor
    ├── trap-instrumental.mp3         # 140 BPM, A Minor
    ├── boom-bap-beat.mp3            # 85 BPM, F Minor
    └── modern-hip-hop-track.mp3     # 120 BPM, G Minor
```

### Sample Metadata
For each hip-hop instrumental, you'll need to know:
- **Expected Key**: The actual musical key (e.g., "C Minor", "A Minor")
- **Expected BPM**: The actual tempo (e.g., 90, 140, 85, 120)
- **Subgenre**: Hip-hop style (classic, trap, boom-bap, modern)
- **Duration**: Length in seconds
- **File Size**: Size in bytes
- **Hip-Hop Characteristics**: Era, tempo style, typical use

## Step 2: Create Sample Manager

### Basic Implementation (`src/utils/demoSamples.ts`)
```typescript
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

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'classic-hip-hop-beat',
    name: 'Classic Hip-Hop Beat',
    description: 'A classic 90s-style hip-hop instrumental with heavy kick and snare patterns, perfect for freestyle and underground rap',
    subgenre: 'classic',
    expectedKey: 'C Minor',
    expectedBPM: 90,
    duration: 30,
    fileSize: 1024 * 1024, // 1MB
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
    fileSize: 1024 * 1024, // 1MB
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
    fileSize: 1024 * 1024, // 1MB
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
    fileSize: 1024 * 1024, // 1MB
    filePath: '/demo-samples/modern-hip-hop-track.mp3',
    hipHopCharacteristics: {
      tempoStyle: 'moderate',
      keyType: 'minor',
      productionEra: '2020s',
      typicalUse: 'versatile'
    }
  }
]

export function getSampleById(id: string): DemoSample | null {
  return DEMO_SAMPLES.find(sample => sample.id === id) || null
}

export function getSamplesBySubgenre(subgenre: string): DemoSample[] {
  return DEMO_SAMPLES.filter(sample => sample.subgenre === subgenre)
}

export function getAllSamples(): DemoSample[] {
  return DEMO_SAMPLES
}
```

## Step 3: Create Audio Loader

### Simple Implementation (`src/utils/demoAudioLoader.ts`)
```typescript
export class DemoAudioLoader {
  private cache = new Map<string, AudioBuffer>()
  
  async loadSample(sampleId: string): Promise<AudioBuffer> {
    // Check cache first
    if (this.cache.has(sampleId)) {
      return this.cache.get(sampleId)!
    }
    
    // Find sample metadata
    const sample = getSampleById(sampleId)
    if (!sample) {
      throw new Error(`Sample not found: ${sampleId}`)
    }
    
    // Load audio file
    const audioBuffer = await this.fetchAudioBuffer(sample.filePath)
    
    // Cache the result
    this.cache.set(sampleId, audioBuffer)
    
    return audioBuffer
  }
  
  private async fetchAudioBuffer(filePath: string): Promise<AudioBuffer> {
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`Failed to load audio file: ${filePath}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const audioContext = new AudioContext()
    
    return await audioContext.decodeAudioData(arrayBuffer)
  }
  
  clearCache(): void {
    this.cache.clear()
  }
}
```

## Step 3: Sample Interaction Design

### Recommended Approach: Enhanced FileUpload Component
The demo samples should integrate seamlessly with the existing file upload flow:

1. **Demo Mode Toggle**: Above the drag & drop area
2. **Sample Selection**: When demo mode is active, replace the drag & drop area with sample cards
3. **Same Flow**: Uses the existing `handleFileSelect` function in App.tsx
4. **Pre-loaded Audio**: Demo samples provide pre-loaded AudioBuffer objects

### Integration Points
- **FileUpload Component**: Add demo mode toggle and sample selection
- **App.tsx**: Modify `handleFileSelect` to handle both File objects and DemoSample objects
- **useFileUpload Hook**: Add method to load demo sample audio files
- **Same Analysis Pipeline**: Demo samples flow through the same analysis process

## Step 4: Create Demo Mode Hook

### Basic Implementation (`src/hooks/useDemoMode.ts`)
```typescript
import { useState, useCallback } from 'react'
import { DemoSample, getAllSamples, getSampleById } from '../utils/demoSamples'
import { DemoAudioLoader } from '../utils/demoAudioLoader'

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [selectedSample, setSelectedSample] = useState<DemoSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioLoader = new DemoAudioLoader()
  
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => !prev)
    if (isDemoMode) {
      setSelectedSample(null)
      setError(null)
    }
  }, [isDemoMode])
  
  const selectSample = useCallback(async (sampleId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const sample = getSampleById(sampleId)
      if (!sample) {
        throw new Error(`Sample not found: ${sampleId}`)
      }
      
      setSelectedSample(sample)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select sample')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const loadSampleAudio = useCallback(async (sample: DemoSample): Promise<AudioBuffer> => {
    return await audioLoader.loadSample(sample.id)
  }, [audioLoader])
  
  return {
    isDemoMode,
    selectedSample,
    availableSamples: getAllSamples(),
    isLoading,
    error,
    toggleDemoMode,
    selectSample,
    loadSampleAudio
  }
}
```

## Step 5: Create Demo Components

### Demo Mode Toggle (`src/components/DemoModeToggle.tsx`)
```typescript
import React from 'react'
import { Box, Switch, Text, VStack, HStack } from '@chakra-ui/react'

interface DemoModeToggleProps {
  isDemoMode: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export const DemoModeToggle: React.FC<DemoModeToggleProps> = ({
  isDemoMode,
  onToggle,
  disabled = false
}) => {
  return (
    <Box
      bg={isDemoMode ? 'blue.50' : 'gray.50'}
      border="1px solid"
      borderColor={isDemoMode ? 'blue.200' : 'gray.200'}
      borderRadius="md"
      p={3}
    >
      <HStack justify="space-between" align="center">
        <VStack align="start" gap={1}>
          <Text fontWeight="medium" color={isDemoMode ? 'blue.800' : 'gray.800'}>
            Demo Mode
          </Text>
        <Text fontSize="sm" color={isDemoMode ? 'red.600' : 'gray.600'}>
          {isDemoMode ? 'Try hip-hop instrumental samples' : 'Upload your own hip-hop instrumentals'}
        </Text>
        </VStack>
        
        <Switch
          isChecked={isDemoMode}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={disabled}
          colorScheme="red"
        />
      </HStack>
    </Box>
  )
}
```

### Sample Selector (`src/components/DemoSelector.tsx`)
```typescript
import React from 'react'
import { Box, Button, Text, VStack, HStack, Badge, SimpleGrid } from '@chakra-ui/react'
import { DemoSample } from '../utils/demoSamples'

interface DemoSelectorProps {
  samples: DemoSample[]
  selectedSampleId?: string
  onSampleSelect: (sample: DemoSample) => void
  isLoading?: boolean
}

export const DemoSelector: React.FC<DemoSelectorProps> = ({
  samples,
  selectedSampleId,
  onSampleSelect,
  isLoading = false
}) => {
  const getGenreColor = (genre: string) => {
    const colors = {
      'hip-hop': 'purple',
      'electronic': 'blue',
      'jazz': 'green',
      'classical': 'orange'
    }
    return colors[genre] || 'gray'
  }
  
  return (
    <VStack gap={4} align="stretch">
      <Text fontWeight="bold" fontSize="lg">
        Choose a Sample to Analyze
      </Text>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {samples.map(sample => (
          <Box
            key={sample.id}
            border="2px solid"
            borderColor={selectedSampleId === sample.id ? 'blue.500' : 'gray.200'}
            borderRadius="lg"
            p={4}
            cursor="pointer"
            bg={selectedSampleId === sample.id ? 'blue.50' : 'white'}
            _hover={{ borderColor: 'blue.300', bg: 'blue.25' }}
            onClick={() => onSampleSelect(sample)}
            opacity={isLoading ? 0.6 : 1}
          >
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between" align="start">
                <VStack align="start" gap={1}>
                  <Text fontWeight="bold" fontSize="lg">
                    {sample.name}
                  </Text>
                  <Badge colorScheme={getGenreColor(sample.genre)} size="sm">
                    {sample.genre}
                  </Badge>
                </VStack>
              </HStack>
              
              <Text fontSize="sm" color="gray.600">
                {sample.description}
              </Text>
              
              <HStack justify="space-between" fontSize="xs" color="gray.500">
                <Text>Duration: {sample.duration}s</Text>
                <Text>Expected: {sample.expectedKey}, {sample.expectedBPM} BPM</Text>
              </HStack>
              
              <Button
                size="sm"
                colorScheme="blue"
                variant={selectedSampleId === sample.id ? 'solid' : 'outline'}
                onClick={() => onSampleSelect(sample)}
                isLoading={isLoading}
                loadingText="Loading..."
              >
                {selectedSampleId === sample.id ? 'Selected' : 'Try This Sample'}
              </Button>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  )
}
```

## Step 6: Integrate with App

### Update App.tsx
```typescript
// Add to imports
import { useDemoMode } from './hooks/useDemoMode'
import { DemoModeToggle } from './components/DemoModeToggle'
import { DemoSelector } from './components/DemoSelector'

// Add to App component
function App() {
  // ... existing state
  
  // Add demo mode
  const {
    isDemoMode,
    selectedSample,
    availableSamples,
    isLoading: isDemoLoading,
    error: demoError,
    toggleDemoMode,
    selectSample,
    loadSampleAudio
  } = useDemoMode()
  
  // Modify handleFileSelect to handle demo samples
  const handleFileSelect = async (file: File | DemoSample) => {
    if (isDemoMode && 'id' in file) {
      // Handle demo sample
      await handleDemoSampleSelect(file)
    } else {
      // Handle regular file upload
      await handleRegularFileSelect(file as File)
    }
  }
  
  const handleDemoSampleSelect = async (sample: DemoSample) => {
    try {
      // Load the sample audio
      const audioBuffer = await loadSampleAudio(sample)
      
      // Create a fake File object for compatibility
      const fakeFile = new File([], sample.name, { type: 'audio/mpeg' })
      
      // Process through existing pipeline
      await handleRegularFileSelect(fakeFile, audioBuffer)
    } catch (error) {
      console.error('Demo sample processing failed:', error)
      setAppState(prev => ({
        ...prev,
        error: 'Failed to process demo sample'
      }))
    }
  }
  
  // ... rest of component
  
  return (
    // ... existing JSX
    
    {/* Add demo mode toggle */}
    <Box w="100%" maxW={contentMaxW}>
      <DemoModeToggle
        isDemoMode={isDemoMode}
        onToggle={toggleDemoMode}
        disabled={isProcessingAny}
      />
    </Box>
    
    {/* Add demo selector */}
    {isDemoMode && (
      <Box w="100%" maxW={contentMaxW}>
        <DemoSelector
          samples={availableSamples}
          selectedSampleId={selectedSample?.id}
          onSampleSelect={selectSample}
          isLoading={isDemoLoading}
        />
      </Box>
    )}
    
    // ... rest of JSX
  )
}
```

## Step 7: Test the Implementation

### Basic Testing Checklist
- [ ] Demo mode toggle works
- [ ] Sample selection works
- [ ] Audio files load correctly
- [ ] Analysis pipeline processes demo samples
- [ ] Results display correctly
- [ ] Mode switching works smoothly

### File Structure After Implementation
```
src/
├── components/
│   ├── DemoModeToggle.tsx
│   └── DemoSelector.tsx
├── hooks/
│   └── useDemoMode.ts
├── utils/
│   ├── demoSamples.ts
│   └── demoAudioLoader.ts
└── public/
    └── demo-samples/
        ├── hip-hop-beat.mp3
        ├── electronic-track.mp3
        ├── jazz-sample.mp3
        └── classical-excerpt.mp3
```

## Next Steps

1. **Add your audio files** to `public/demo-samples/`
2. **Update the metadata** in `demoSamples.ts` with actual values
3. **Test the basic functionality** with the simple implementation
4. **Enhance gradually** by adding more features from the full specification
5. **Add error handling** and loading states
6. **Style the components** to match your app's design

This quick start approach gives you a working demo feature in minimal time, which you can then enhance with the full feature set from the comprehensive implementation plan.
