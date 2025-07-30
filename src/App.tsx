import { Routes, Route } from 'react-router-dom'
import { Box, Heading, VStack, Text, HStack } from '@chakra-ui/react'
import { useState, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { WaveformDisplay } from './components/WaveformDisplay'
import { ResultsDisplay } from './components/ResultsDisplay'
import { useFileUpload } from './hooks/useFileUpload'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import type { AudioFile, AnalysisResult } from './types'

function App() {
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [processingStage, setProcessingStage] = useState<'idle' | 'loading' | 'analyzing' | 'complete' | 'error'>('idle')


  const { loadAudioFile, createAudioFileObject } = useFileUpload()
  const { processAudio, isProcessing, progress, error: processingError, resetState } = useAudioProcessor()



  const handleFileSelect = async (file: File) => {
    console.log('Selected file:', file.name, file.size, file.type)

    // Reset all states
    setIsLoadingFile(true)
    setFileError(null)
    setCurrentFile(null)
    setAudioBuffer(null)
    setAnalysisResult(null)
    setProcessingStage('loading')
    resetState()

    try {
      // Load the audio file and create AudioBuffer
      const buffer = await loadAudioFile(file)

      // Create AudioFile object with metadata
      const audioFile = createAudioFileObject(file, buffer)

      if (audioFile) {
        setCurrentFile(audioFile)
        setAudioBuffer(buffer)
        setProcessingStage('analyzing')
        console.log('Audio loaded successfully, starting analysis...')

        // Start audio analysis
        try {
          const result = await processAudio(buffer)
          setAnalysisResult(result)
          setProcessingStage('complete')
          console.log('Analysis completed:', result)
        } catch (analysisError) {
          console.error('Analysis failed:', analysisError)
          setProcessingStage('error')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file'
      setFileError(errorMessage)
      setProcessingStage('error')
      console.error('Error loading audio file:', err)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const handleReset = useCallback(() => {
    setCurrentFile(null)
    setAudioBuffer(null)
    setAnalysisResult(null)
    setIsLoadingFile(false)
    setFileError(null)
    setProcessingStage('idle')
    resetState()
  }, [resetState])

  // Calculate estimated time when progress updates
  const currentEstimatedTime = progress > 0 && isProcessing
    ? Math.ceil((30 * (100 - progress)) / 100) // Simple estimation based on 30s max
    : null

  // Determine if we should prevent new uploads
  const isProcessingAny = isLoadingFile || isProcessing || processingStage === 'analyzing'

  return (
    <Box
      minH="100vh"
      w="100vw"
      bg="white"
      color="black"
      p={2}
      overflow="auto"
    >
      <Box maxW="800px" w="100%" mx="auto" py={4}>
        <VStack gap={6} align="center">
          <VStack gap={3} textAlign="center">
            <Heading as="h1" size="3xl">
              Audio Key & BPM Analyzer
            </Heading>
            <Heading as="h2" size="lg" color="gray.600" fontWeight="normal">
              Upload your hip hop instrumental to analyze its key and BPM
            </Heading>
          </VStack>

          <Routes>
            <Route path="/" element={
              <VStack gap={5} align="center" w="100%">
                <Box w="100%" maxW="650px">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={isProcessingAny}
                  />
                </Box>

                {/* Progress Indicators */}
                {isProcessingAny && (
                  <Box w="100%" maxW="650px">
                    <VStack gap={3} align="stretch">
                      {/* Main Progress Bar */}
                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="sm" color="gray.600">
                            {processingStage === 'loading' && 'Loading audio file...'}
                            {processingStage === 'analyzing' && 'Analyzing audio...'}
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
                          {processingStage === 'loading' ? (
                            <Box
                              w="30%"
                              h="100%"
                              bg="red.500"
                              borderRadius="md"
                              animation="pulse 2s infinite"
                            />
                          ) : (
                            <Box
                              w={`${progress}%`}
                              h="100%"
                              bg="red.500"
                              borderRadius="md"
                              transition="width 0.3s ease"
                            />
                          )}
                        </Box>
                        {processingStage === 'analyzing' && (
                          <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
                            {Math.round(progress)}% complete
                          </Text>
                        )}
                      </Box>

                      {/* Processing Stage Indicator */}
                      <Box bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="md" p={3}>
                        <HStack>
                          <Box
                            w={2}
                            h={2}
                            bg="blue.500"
                            borderRadius="full"
                            animation="pulse 2s infinite"
                          />
                          <Text fontSize="sm" color="blue.800">
                            {processingStage === 'loading' && 'Preparing audio for analysis...'}
                            {processingStage === 'analyzing' && 'Detecting key and BPM patterns...'}
                          </Text>
                        </HStack>
                      </Box>
                    </VStack>
                  </Box>
                )}

                {/* Error Display */}
                {(fileError || processingError) && processingStage === 'error' && (
                  <Box w="100%" maxW="650px">
                    <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4}>
                      <HStack>
                        <Box w={4} h={4} bg="red.500" borderRadius="full" />
                        <Text color="red.800" fontWeight="medium">Error:</Text>
                        <Text color="red.700">{fileError || processingError}</Text>
                      </HStack>
                    </Box>
                  </Box>
                )}

                {/* Waveform Display */}
                <Box w="100%" maxW="700px">
                  <WaveformDisplay
                    audioBuffer={audioBuffer || undefined}
                    isLoading={isLoadingFile}
                    progress={isProcessing ? progress / 100 : undefined}
                    error={(fileError || processingError) || undefined}
                  />
                </Box>

                {/* Display file info when loaded */}
                {currentFile && !isProcessingAny && processingStage !== 'error' && (
                  <Box bg="gray.50" p={4} borderRadius="lg" w="100%" maxW="600px">
                    <Heading as="h3" size="md" mb={4} textAlign="center">File Information</Heading>
                    <VStack gap={2}>
                      <Box textAlign="center"><strong>Name:</strong> {currentFile.name}</Box>
                      <Box textAlign="center"><strong>Size:</strong> {(currentFile.size / (1024 * 1024)).toFixed(2)} MB</Box>
                      <Box textAlign="center"><strong>Format:</strong> {currentFile.format.toUpperCase()}</Box>
                      <Box textAlign="center"><strong>Duration:</strong> {Math.round(currentFile.duration)}s</Box>
                    </VStack>
                  </Box>
                )}

                {/* Results Display */}
                <ResultsDisplay
                  analysisResult={analysisResult || undefined}
                  isLoading={isProcessing}
                  error={processingError || undefined}
                  onReset={handleReset}
                />
              </VStack>
            } />
          </Routes>
        </VStack>
      </Box>
    </Box>
  )
}

export default App