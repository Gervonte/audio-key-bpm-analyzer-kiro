import React from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react'
import type { AnalysisResult } from '../types'
import { ErrorDisplay } from './ErrorDisplay'

interface ResultsDisplayProps {
  analysisResult?: AnalysisResult
  isLoading: boolean
  error?: string
  onReset: () => void
  onRetry?: () => void
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  analysisResult,
  isLoading,
  error,
  onReset,
  onRetry,
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
        <ErrorDisplay
          error={error}
          onRetry={onRetry}
          context="Audio Analysis"
        />
        <Box mt={4} textAlign="center">
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
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p={{ base: 4, md: 6 }} w="100%">
          <VStack gap={{ base: 4, md: 6 }}>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="black" textAlign="center">
              Analysis Results
            </Text>
            
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <Box w="100%">
              {/* Desktop Layout */}
              <HStack 
                gap={8} 
                justify="center" 
                w="100%" 
                display={{ base: 'none', md: 'flex' }}
              >
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

              {/* Mobile Layout */}
              <VStack 
                gap={6} 
                w="100%" 
                display={{ base: 'flex', md: 'none' }}
              >
                {/* Key Result */}
                <VStack gap={2} textAlign="center" w="100%">
                  <Text color="gray.600" fontSize="sm">
                    Musical Key
                  </Text>
                  <Text color="black" fontSize="2xl" fontWeight="bold">
                    {key.keyName}
                  </Text>
                  <Box bg="gray.100" px={3} py={1} borderRadius="md">
                    <Text color="gray.700" fontSize="sm">
                      {Math.round(key.confidence * 100)}% confidence
                    </Text>
                  </Box>
                </VStack>

                <Box w="100%" h="1px" bg="gray.200" />

                {/* BPM Result */}
                <VStack gap={2} textAlign="center" w="100%">
                  <Text color="gray.600" fontSize="sm">
                    Tempo (BPM)
                  </Text>
                  <Text color="black" fontSize="2xl" fontWeight="bold">
                    {bpm.bpm}
                  </Text>
                  <Box bg="gray.100" px={3} py={1} borderRadius="md">
                    <Text color="gray.700" fontSize="sm">
                      {Math.round(bpm.confidence * 100)}% confidence
                    </Text>
                  </Box>
                </VStack>
              </VStack>
            </Box>

            <Box w="100%" h="1px" bg="gray.200" />

            {/* Additional Details */}
            <VStack gap={2} w="100%">
              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Key Signature:
                </Text>
                <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {key.keySignature}
                </Text>
              </HStack>
              
              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Mode:
                </Text>
                <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {key.mode.charAt(0).toUpperCase() + key.mode.slice(1)}
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Detected Beats:
                </Text>
                <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {bpm.detectedBeats}
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Processing Time:
                </Text>
                <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {(processingTime / 1000).toFixed(1)}s
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Overall Confidence:
                </Text>
                <Box 
                  bg={confidence.overall > 0.7 ? "green.100" : confidence.overall > 0.5 ? "yellow.100" : "red.100"}
                  color={confidence.overall > 0.7 ? "green.800" : confidence.overall > 0.5 ? "yellow.800" : "red.800"}
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
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
              _active={{ bg: 'gray.100', transform: 'scale(0.98)' }}
              size={{ base: 'md', md: 'lg' }}
              w="100%"
              minH={{ base: '44px', md: '48px' }} // iOS recommended touch target size
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