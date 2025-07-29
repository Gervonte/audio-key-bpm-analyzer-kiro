import { Routes, Route } from 'react-router-dom'
import { Box, Heading, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { WaveformDisplay } from './components/WaveformDisplay'
import { useFileUpload } from './hooks/useFileUpload'
import type { AudioFile } from './types'

function App() {
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loadAudioFile, createAudioFileObject } = useFileUpload()

  const handleFileSelect = async (file: File) => {
    console.log('Selected file:', file.name, file.size, file.type)

    setIsLoading(true)
    setError(null)
    setCurrentFile(null)
    setAudioBuffer(null)

    try {
      // Load the audio file and create AudioBuffer
      const buffer = await loadAudioFile(file)

      // Debug: Log buffer details
      console.log('AudioBuffer details:', {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        length: buffer.length
      })

      // Debug: Check first few samples
      const firstChannel = buffer.getChannelData(0)
      const sampleValues = Array.from(firstChannel.slice(0, 10))
      console.log('First 10 samples:', sampleValues)

      // Create AudioFile object with metadata
      const audioFile = createAudioFileObject(file, buffer)

      if (audioFile) {
        setCurrentFile(audioFile)
        setAudioBuffer(buffer)
        console.log('Audio loaded successfully!')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file'
      setError(errorMessage)
      console.error('Error loading audio file:', err)
    } finally {
      setIsLoading(false)
    }
  }

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
                    isProcessing={isLoading}
                  />
                </Box>

                {/* Waveform Display */}
                <Box w="100%" maxW="700px">
                  <WaveformDisplay
                    audioBuffer={audioBuffer || undefined}
                    isLoading={isLoading}
                    error={error || undefined}
                  />
                </Box>

                {/* Display file info when loaded */}
                {currentFile && !isLoading && (
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
              </VStack>
            } />
          </Routes>
        </VStack>
      </Box>
    </Box>
  )
}

export default App