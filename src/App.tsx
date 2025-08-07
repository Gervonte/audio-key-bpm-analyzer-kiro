import { Routes, Route } from 'react-router-dom'
import {
  Box,
  Heading,
  VStack,
  Text,
  HStack,
  Container,
  Flex,
  Spinner,
  useBreakpointValue
} from '@chakra-ui/react'

import { useState, useCallback, useEffect, useRef } from 'react'
import { FileUpload } from './components/FileUpload'
import { WaveformDisplay } from './components/WaveformDisplay'
import { ResultsDisplay } from './components/ResultsDisplay'
import { ErrorDisplay } from './components/ErrorDisplay'
import { MemoryMonitor } from './components/MemoryMonitor'
import { CacheStats } from './components/CacheStats'
import { DebugInfo } from './components/DebugInfo'
import { useFileUpload } from './hooks/useFileUpload'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import { useAudioProcessingRetry } from './hooks/useRetry'
import { getDebugConfig } from './utils/debugMode'
import type { AppState } from './types'

// Processing stages for better state management
type ProcessingStage = 'idle' | 'loading' | 'analyzing' | 'complete' | 'error'

function App() {
  // Get debug configuration from URL parameters
  const debugConfig = getDebugConfig()

  // Centralized app state following the AppState interface
  const [appState, setAppState] = useState<AppState>({
    currentFile: null,
    audioBuffer: null,
    waveformData: null,
    analysisResult: null,
    isProcessing: false,
    progress: 0,
    error: null
  })

  // Additional UI state not in AppState interface
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle')

  // Refs for cleanup
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const cleanupTimeoutRef = useRef<number | null>(null)

  // Responsive breakpoints
  const containerMaxW = useBreakpointValue({ base: '100%', md: '800px' })
  const contentMaxW = useBreakpointValue({ base: '100%', md: '650px' })
  const waveformMaxW = useBreakpointValue({ base: '100%', md: '700px' })

  // Hooks
  const { loadAudioFile, createAudioFileObject } = useFileUpload()
  const { processAudio, isProcessing, progress, error: processingError, resetState } = useAudioProcessor({
    enableCaching: debugConfig.enableCaching
  })

  // Retry functionality for audio processing
  const {
    execute: executeAudioProcessing,
    retry: retryAudioProcessing,
    canRetry: canRetryProcessing,
    isRetrying: isRetryingProcessing
  } = useAudioProcessingRetry(processAudio)

  // Memory cleanup function
  const cleanupAudioResources = useCallback(() => {
    if (audioBufferRef.current) {
      // Clear reference to allow garbage collection
      audioBufferRef.current = null
    }

    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }

    // Trigger garbage collection hint (if available)
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc()
    }
  }, [])

  // Update app state when processing state changes
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      isProcessing,
      progress,
      error: processingError
    }))
  }, [isProcessing, progress, processingError])



  const handleFileSelect = async (file: File) => {
    console.log('Selected file:', file.name, file.size, file.type)

    // Cleanup previous resources
    cleanupAudioResources()

    // Reset all states using centralized state management
    setIsLoadingFile(true)
    setProcessingStage('loading')
    setAppState({
      currentFile: null,
      audioBuffer: null,
      waveformData: null,
      analysisResult: null,
      isProcessing: false,
      progress: 0,
      error: null
    })
    resetState()

    try {
      // Load the audio file and create AudioBuffer with optional progress tracking
      const buffer = await loadAudioFile(file, debugConfig.enableProgressiveLoading ? (loadProgress) => {
        // File loading is 0-50% of total progress
        setAppState(prev => ({
          ...prev,
          progress: loadProgress * 0.5
        }))
      } : undefined)
      audioBufferRef.current = buffer

      // Create AudioFile object with metadata
      const audioFile = createAudioFileObject(file, buffer)

      if (audioFile) {
        // Update centralized state
        setAppState(prev => ({
          ...prev,
          currentFile: audioFile,
          audioBuffer: buffer
        }))
        setProcessingStage('analyzing')
        console.log('Audio loaded successfully, starting analysis...')

        // Start audio analysis with retry capability and optional caching
        try {
          const result = await executeAudioProcessing(buffer, debugConfig.enableCaching ? file : undefined)
          setAppState(prev => ({
            ...prev,
            analysisResult: result
          }))
          setProcessingStage('complete')
          console.log('Analysis completed:', result)
        } catch (analysisError) {
          console.error('Analysis failed:', analysisError)
          setProcessingStage('error')
          setAppState(prev => ({
            ...prev,
            error: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
          }))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file'
      setProcessingStage('error')
      setAppState(prev => ({
        ...prev,
        error: errorMessage
      }))
      console.error('Error loading audio file:', err)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const handleReset = useCallback(() => {
    // Cleanup audio resources before reset
    cleanupAudioResources()

    // Reset centralized state
    setAppState({
      currentFile: null,
      audioBuffer: null,
      waveformData: null,
      analysisResult: null,
      isProcessing: false,
      progress: 0,
      error: null
    })
    setIsLoadingFile(false)
    setProcessingStage('idle')
    resetState()
  }, [resetState, cleanupAudioResources])

  const handleRetryAnalysis = useCallback(async () => {
    if (!canRetryProcessing || !appState.audioBuffer || !appState.currentFile) return

    setProcessingStage('analyzing')
    setAppState(prev => ({
      ...prev,
      analysisResult: null,
      error: null
    }))

    try {
      const result = await retryAudioProcessing()
      setAppState(prev => ({
        ...prev,
        analysisResult: result
      }))
      setProcessingStage('complete')
      console.log('Retry analysis completed:', result)
    } catch (retryError) {
      console.error('Retry analysis failed:', retryError)
      setProcessingStage('error')
      setAppState(prev => ({
        ...prev,
        error: retryError instanceof Error ? retryError.message : 'Retry failed'
      }))
    }
  }, [canRetryProcessing, appState.audioBuffer, appState.currentFile, retryAudioProcessing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioResources()
    }
  }, [cleanupAudioResources])

  // Calculate estimated time when progress updates
  const currentEstimatedTime = appState.progress > 0 && appState.isProcessing
    ? Math.ceil((30 * (100 - appState.progress)) / 100) // Simple estimation based on 30s max
    : null

  // Determine if we should prevent new uploads
  const isProcessingAny = isLoadingFile || appState.isProcessing || isRetryingProcessing || processingStage === 'analyzing'

  // Progress indicator component
  const ProgressIndicator = () => (
    <Box w="100%" maxW={contentMaxW}>
      <VStack gap={3} align="stretch">
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color="gray.600">
              {processingStage === 'loading' && 'Loading audio file...'}
              {processingStage === 'analyzing' && (isRetryingProcessing ? 'Retrying analysis...' : 'Analyzing audio...')}
            </Text>
            {currentEstimatedTime && (
              <Text fontSize="sm" color="gray.500">
                ~{currentEstimatedTime}s remaining
              </Text>
            )}
          </HStack>
          <Box
            w="100%"
            h="8px"
            bg="gray.100"
            borderRadius="md"
            overflow="hidden"
            position="relative"
          >
            <Box
              w={`${processingStage === 'loading' ? 30 : appState.progress}%`}
              h="100%"
              bg="red.500"
              borderRadius="md"
              transition="width 0.3s ease"
              animation={processingStage === 'loading' ? "pulse 2s infinite" : undefined}
            />
          </Box>
          {processingStage === 'analyzing' && (
            <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
              {Math.round(appState.progress)}% complete
            </Text>
          )}
        </Box>

        <Box bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="md" p={3}>
          <HStack>
            <Spinner size="sm" />
            <Text fontSize="sm" color="blue.800">
              {processingStage === 'loading' && 'Preparing audio for analysis...'}
              {processingStage === 'analyzing' && (isRetryingProcessing ? 'Retrying key and BPM detection...' : 'Detecting key and BPM patterns...')}
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  )

  // File information component
  const FileInformation = () => (
    appState.currentFile && !isProcessingAny && processingStage !== 'error' ? (
      <Box bg="gray.50" p={4} borderRadius="lg" w="100%" maxW={contentMaxW}>
        <Heading as="h3" size="md" mb={4} textAlign="center">File Information</Heading>
        <VStack gap={2}>
          <Text textAlign="center"><strong>Name:</strong> {appState.currentFile.name}</Text>
          <Text textAlign="center"><strong>Size:</strong> {(appState.currentFile.size / (1024 * 1024)).toFixed(2)} MB</Text>
          <Text textAlign="center"><strong>Format:</strong> {appState.currentFile.format.toUpperCase()}</Text>
          <Text textAlign="center"><strong>Duration:</strong> {Math.round(appState.currentFile.duration)}s</Text>
        </VStack>
      </Box>
    ) : null
  )

  return (
    <Flex
      minH="100vh"
      w="100vw"
      bg="white"
      color="black"
      direction="column"
      overflow="auto"
    >
      <Container
        maxW={containerMaxW}
        w="100%"
        py={{ base: 4, md: 6 }}
        px={{ base: 4, md: 6 }}
        flex="1"
      >
        <VStack gap={{ base: 4, md: 6 }} align="center" h="100%">
          {/* Header Section */}
          <VStack gap={3} textAlign="center" w="100%">
            <Heading
              as="h1"
              size={{ base: "2xl", md: "3xl" }}
              lineHeight="shorter"
            >
              Audio Key & BPM Analyzer
            </Heading>
            <Heading
              as="h2"
              size={{ base: "md", md: "lg" }}
              color="gray.600"
              fontWeight="normal"
              px={{ base: 2, md: 0 }}
            >
              Upload your hip hop instrumental to analyze its key and BPM
            </Heading>
          </VStack>

          {/* Main Content */}
          <Routes>
            <Route path="/" element={
              <VStack gap={5} align="center" w="100%" flex="1">
                {/* Debug Info - Only show in debug mode */}
                <Box w="100%" maxW={contentMaxW}>
                  <DebugInfo />
                </Box>

                {/* File Upload Section */}
                <Box w="100%" maxW={contentMaxW}>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={isProcessingAny}
                  />
                </Box>

                {/* Progress Indicators */}
                {isProcessingAny && <ProgressIndicator />}

                {/* Error Display */}
                {appState.error && processingStage === 'error' && (
                  <Box w="100%" maxW={contentMaxW}>
                    <ErrorDisplay
                      error={appState.error}
                      onRetry={canRetryProcessing ? handleRetryAnalysis : undefined}
                      onDismiss={handleReset}
                    />
                  </Box>
                )}

                {/* Waveform Display */}
                <Box w="100%" maxW={waveformMaxW}>
                  <WaveformDisplay
                    audioBuffer={appState.audioBuffer || undefined}
                    isLoading={isLoadingFile}
                    progress={appState.isProcessing ? appState.progress / 100 : undefined}
                    error={appState.error || undefined}
                  />
                </Box>

                {/* File Information */}
                <FileInformation />

                {/* Results Display */}
                <Box w="100%" maxW={contentMaxW}>
                  <ResultsDisplay
                    analysisResult={appState.analysisResult || undefined}
                    isLoading={appState.isProcessing || isRetryingProcessing}
                    error={appState.error || undefined}
                    onReset={handleReset}
                    onRetry={canRetryProcessing ? handleRetryAnalysis : undefined}
                  />
                </Box>

                {/* Performance Monitoring Section - Only show in debug mode */}
                {debugConfig.showPerformanceMonitoring && (
                  <VStack gap={4} w="100%" maxW={contentMaxW}>
                    <HStack justify="space-between" w="100%">
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        Performance Monitoring
                      </Text>
                      <Text fontSize="xs" color="gray.500" fontStyle="italic">
                        Debug Mode: Add ?debug=true to URL
                      </Text>
                    </HStack>

                    <HStack gap={4} w="100%" align="start" flexWrap="wrap">
                      <Box flex="1" minW="250px">
                        <MemoryMonitor showDetails={true} />
                      </Box>
                      <Box flex="1" minW="250px">
                        <CacheStats showControls={true} />
                      </Box>
                    </HStack>
                  </VStack>
                )}
              </VStack>
            } />
          </Routes>
        </VStack>
      </Container>
    </Flex>
  )
}

export default App