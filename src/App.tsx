import { Routes, Route } from 'react-router-dom'
import { Box, Container, Heading, VStack } from '@chakra-ui/react'
import { FileUpload } from './components/FileUpload'

function App() {
  const handleFileSelect = (file: File) => {
    console.log('Selected file:', file.name, file.size, file.type)
    // TODO: Process the file for key and BPM analysis
  }

  return (
    <Box minH="100vh" bg="white" color="black">
      <Container maxW="6xl" py={8}>
        <VStack gap={8} align="stretch">
          <Heading as="h1" size="4xl" textAlign="center">
            Audio Key & BPM Analyzer
          </Heading>

          <Routes>
            <Route path="/" element={
              <VStack gap={6} align="stretch">
                <Box textAlign="center">
                  <Heading as="h2" size="lg" mb={4}>
                    Upload your hip hop instrumental to analyze its key and BPM
                  </Heading>
                </Box>
                
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  isProcessing={false}
                />
              </VStack>
            } />
          </Routes>
        </VStack>
      </Container>
    </Box>
  )
}

export default App