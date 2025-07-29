import { Routes, Route } from 'react-router-dom'
import { Box, Container, Heading, VStack } from '@chakra-ui/react'

function App() {
  return (
    <Box minH="100vh" bg="white" color="black">
      <Container maxW="6xl" py={8}>
        <VStack gap={8} align="stretch">
          <Heading as="h1" size="4xl" textAlign="center">
            Audio Key & BPM Analyzer
          </Heading>

          <Routes>
            <Route path="/" element={
              <Box textAlign="center">
                <Heading as="h2" size="lg" mb={4}>
                  Upload your hip hop instrumental to analyze its key and BPM
                </Heading>
              </Box>
            } />
          </Routes>
        </VStack>
      </Container>
    </Box>
  )
}

export default App