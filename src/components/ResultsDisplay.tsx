import React from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react'
import type { AnalysisResult } from '../types'

interface ResultsDisplayProps {
  analysisResult?: AnalysisResult
  isLoading: boolean
  error?: string
  onReset: () => void
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  analysisResult,
  isLoading,
  error,
  onReset,
}) => {
  // Don't render anything if there's no result and not loading
  if (!analysisResult && !isLoading && !error) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <Box w="100%" maxW="600px" mx="auto" mt={6}>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p={6}>
          <VStack gap={4}>
            <Text color="black" fontSize="lg">
              Analyzing audio...
            </Text>
          </VStack>
        </Box>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box w="100%" maxW="600px" mx="auto" mt={6}>
        <Box bg="white" border="1px solid" borderColor="red.200" borderRadius="lg" p={6}>
          <VStack gap={4}>
            <Text color="red.600" fontSize="lg" fontWeight="semibold">
              Analysis Failed
            </Text>
            <Text color="black" textAlign="center">
              {error}
            </Text>
            <Button
              onClick={onReset}
              colorScheme="gray"
              variant="outline"
              color="black"
              borderColor="black"
              _hover={{ bg: 'gray.50' }}
            >
              Try Another File
            </Button>
          </VStack>
        </Box>
      </Box>
    )
  }

  // Results display
  if (!analysisResult) return null

  const { key, bpm, confidence, processingTime } = analysisResult

  return (
    <Box w="100%" maxW="600px" mx="auto" mt={6}>
      <VStack gap={6}>
        {/* Main Results Card */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p={6} w="100%">
          <VStack gap={6}>
            <Text fontSize="2xl" fontWeight="bold" color="black" textAlign="center">
              Analysis Results
            </Text>
            
            <HStack gap={8} justify="center" w="100%">
              {/* Key Result */}
              <VStack gap={2} textAlign="center">
                <Text color="gray.600" fontSize="md">
                  Musical Key
                </Text>
                <Text color="black" fontSize="3xl" fontWeight="bold">
                  {key.keyName}
                </Text>
                <Box bg="gray.100" px={3} py={1} borderRadius="md">
                  <Text color="gray.700" fontSize="sm">
                    {Math.round(key.confidence * 100)}% confidence
                  </Text>
                </Box>
              </VStack>

              <Box w="1px" h="80px" bg="gray.200" />

              {/* BPM Result */}
              <VStack gap={2} textAlign="center">
                <Text color="gray.600" fontSize="md">
                  Tempo (BPM)
                </Text>
                <Text color="black" fontSize="3xl" fontWeight="bold">
                  {bpm.bpm}
                </Text>
                <Box bg="gray.100" px={3} py={1} borderRadius="md">
                  <Text color="gray.700" fontSize="sm">
                    {Math.round(bpm.confidence * 100)}% confidence
                  </Text>
                </Box>
              </VStack>
            </HStack>

            <Box w="100%" h="1px" bg="gray.200" />

            {/* Additional Details */}
            <VStack gap={2} w="100%">
              <HStack justify="space-between" w="100%">
                <Text color="gray.600" fontSize="sm">
                  Key Signature:
                </Text>
                <Text color="black" fontSize="sm" fontWeight="medium">
                  {key.keySignature}
                </Text>
              </HStack>
              
              <HStack justify="space-between" w="100%">
                <Text color="gray.600" fontSize="sm">
                  Mode:
                </Text>
                <Text color="black" fontSize="sm" fontWeight="medium">
                  {key.mode.charAt(0).toUpperCase() + key.mode.slice(1)}
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%">
                <Text color="gray.600" fontSize="sm">
                  Detected Beats:
                </Text>
                <Text color="black" fontSize="sm" fontWeight="medium">
                  {bpm.detectedBeats}
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%">
                <Text color="gray.600" fontSize="sm">
                  Processing Time:
                </Text>
                <Text color="black" fontSize="sm" fontWeight="medium">
                  {(processingTime / 1000).toFixed(1)}s
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%">
                <Text color="gray.600" fontSize="sm">
                  Overall Confidence:
                </Text>
                <Box 
                  bg={confidence.overall > 0.7 ? "green.100" : confidence.overall > 0.5 ? "yellow.100" : "red.100"}
                  color={confidence.overall > 0.7 ? "green.800" : confidence.overall > 0.5 ? "yellow.800" : "red.800"}
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  <Text fontSize="sm" fontWeight="medium">
                    {Math.round(confidence.overall * 100)}%
                  </Text>
                </Box>
              </HStack>
            </VStack>

            <Box w="100%" h="1px" bg="gray.200" />

            {/* Reset Button */}
            <Button
              onClick={onReset}
              colorScheme="gray"
              variant="outline"
              color="black"
              borderColor="black"
              _hover={{ bg: 'gray.50' }}
              size="lg"
              w="100%"
            >
              Analyze Another File
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

export default ResultsDisplay