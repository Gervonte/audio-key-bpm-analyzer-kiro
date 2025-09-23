import React from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
} from '@chakra-ui/react'
import type { AnalysisResult, DemoSample } from '../types'
import { ErrorDisplay } from './ErrorDisplay'
import { TempoSuggestions } from './TempoSuggestions'

interface ResultsDisplayProps {
  analysisResult?: AnalysisResult
  audioBuffer?: AudioBuffer
  isLoading: boolean
  error?: string
  onReset: () => void
  onRetry?: () => void
  isDemoMode?: boolean
  demoSample?: DemoSample | null
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  analysisResult,
  audioBuffer,
  isLoading,
  error,
  onReset,
  onRetry,
  isDemoMode = false,
  demoSample = null,
}) => {
  // Don't render anything if there's no audio buffer and not loading
  if (!audioBuffer && !analysisResult && !isLoading && !error) {
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

  // Show results UI as soon as we have audio buffer or analysis results
  if (!audioBuffer && !analysisResult) return null

  const { key, bpm, confidence, processingTime } = analysisResult || {}

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
                {key ? (
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
                ) : (
                  <VStack gap={2} textAlign="center">
                    <Text color="gray.600" fontSize="md">
                      Musical Key
                    </Text>
                    <VStack gap={2}>
                      <Spinner size="lg" color="red.500" />
                      <Text color="gray.400" fontSize="sm">
                        Analyzing...
                      </Text>
                    </VStack>
                  </VStack>
                )}

                <Box w="1px" h="80px" bg="gray.200" />

                {/* BPM Result */}
                {bpm ? (
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
                ) : (
                  <VStack gap={2} textAlign="center">
                    <Text color="gray.600" fontSize="md">
                      Tempo (BPM)
                    </Text>
                    <VStack gap={2}>
                      <Spinner size="lg" color="red.500" />
                      <Text color="gray.400" fontSize="sm">
                        Analyzing...
                      </Text>
                    </VStack>
                  </VStack>
                )}
              </HStack>

              {/* Mobile Layout */}
              <VStack
                gap={6}
                w="100%"
                display={{ base: 'flex', md: 'none' }}
              >
                {/* Key Result */}
                {key ? (
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
                ) : (
                  <VStack gap={2} textAlign="center" w="100%">
                    <Text color="gray.600" fontSize="sm">
                      Musical Key
                    </Text>
                    <VStack gap={2}>
                      <Spinner size="md" color="red.500" />
                      <Text color="gray.400" fontSize="xs">
                        Analyzing...
                      </Text>
                    </VStack>
                  </VStack>
                )}

                <Box w="100%" h="1px" bg="gray.200" />

                {/* BPM Result */}
                {bpm ? (
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
                ) : (
                  <VStack gap={2} textAlign="center" w="100%">
                    <Text color="gray.600" fontSize="sm">
                      Tempo (BPM)
                    </Text>
                    <VStack gap={2}>
                      <Spinner size="md" color="red.500" />
                      <Text color="gray.400" fontSize="xs">
                        Analyzing...
                      </Text>
                    </VStack>
                  </VStack>
                )}
              </VStack>
            </Box>

            {/* Tempo Suggestions */}
            {bpm && (
              <TempoSuggestions
                detectedBPM={bpm.bpm}
                confidence={bpm.confidence}
              />
            )}

            <Box w="100%" h="1px" bg="gray.200" />

            {/* Additional Details */}
            <VStack gap={2} w="100%">
              {key && (
                <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                  <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                    Key Signature:
                  </Text>
                  <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                    {key.keySignature}
                  </Text>
                </HStack>
              )}

              {key && (
                <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                  <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                    Mode:
                  </Text>
                  <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                    {key.mode.charAt(0).toUpperCase() + key.mode.slice(1)}
                  </Text>
                </HStack>
              )}

              {bpm && (
                <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                  <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                    Detected Beats:
                  </Text>
                  <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                    {bpm.detectedBeats}
                  </Text>
                </HStack>
              )}

              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Processing Time:
                </Text>
                <Text color="black" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {processingTime !== undefined ? (processingTime / 1000).toFixed(1) : '0'}s
                </Text>
              </HStack>

              <HStack justify="space-between" w="100%" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                  Overall Confidence:
                </Text>
                <Box
                  bg={confidence?.overall && confidence.overall > 0.7 ? "green.100" : confidence?.overall && confidence.overall > 0.5 ? "yellow.100" : "red.100"}
                  color={confidence?.overall && confidence.overall > 0.7 ? "green.800" : confidence?.overall && confidence.overall > 0.5 ? "yellow.800" : "red.800"}
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                    {confidence?.overall ? Math.round(confidence.overall * 100) : '--'}%
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

        {/* Hip-Hop Educational Content for Demo Mode */}
        {isDemoMode && demoSample && analysisResult && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p={{ base: 4, md: 6 }} w="100%">
            <VStack gap={4} align="stretch">
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="black" textAlign="center">
                Hip-Hop Analysis Insights
              </Text>

              {/* Sample Information */}
              <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4}>
                <VStack gap={3} align="stretch">
                  <Text fontSize="md" fontWeight="bold" color="red.800">
                    {demoSample.name}
                  </Text>
                  <Text fontSize="sm" color="red.700">
                    {demoSample.description}
                  </Text>
                  
                  <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <Box>
                      <Text fontSize="xs" color="red.600" fontWeight="medium">Subgenre:</Text>
                      <Text fontSize="sm" color="red.800" fontWeight="bold">
                        {demoSample.subgenre.replace('-', ' ').toUpperCase()}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="red.600" fontWeight="medium">Era:</Text>
                      <Text fontSize="sm" color="red.800" fontWeight="bold">
                        {demoSample.hipHopCharacteristics.productionEra}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="red.600" fontWeight="medium">Style:</Text>
                      <Text fontSize="sm" color="red.800" fontWeight="bold">
                        {demoSample.hipHopCharacteristics.tempoStyle}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>

              {/* Expected vs Detected Comparison */}
              <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
                <VStack gap={3} align="stretch">
                  <Text fontSize="md" fontWeight="bold" color="black">
                    Expected vs Detected Results
                  </Text>
                  
                  <HStack justify="space-between" flexWrap="wrap" gap={4}>
                    {/* Key Comparison */}
                    <VStack gap={1} align="center" flex="1" minW="120px">
                      <Text fontSize="xs" color="gray.600" fontWeight="medium">Key</Text>
                      <Text fontSize="sm" color="black" fontWeight="bold">
                        Expected: {demoSample.expectedKey}
                      </Text>
                      <Text fontSize="sm" color="black" fontWeight="bold">
                        Detected: {key?.keyName || 'Analyzing...'}
                      </Text>
                      {key && (
                        <Box
                          bg={key.keyName === demoSample.expectedKey ? "green.100" : "red.100"}
                          color={key.keyName === demoSample.expectedKey ? "green.800" : "red.800"}
                          px={2}
                          py={1}
                          borderRadius="sm"
                        >
                          <Text fontSize="xs" fontWeight="bold">
                            {key.keyName === demoSample.expectedKey ? "✓ MATCH" : "✗ DIFFERENT"}
                          </Text>
                        </Box>
                      )}
                    </VStack>

                    {/* BPM Comparison */}
                    <VStack gap={1} align="center" flex="1" minW="120px">
                      <Text fontSize="xs" color="gray.600" fontWeight="medium">BPM</Text>
                      <Text fontSize="sm" color="black" fontWeight="bold">
                        Expected: {demoSample.expectedBPM}
                      </Text>
                      <Text fontSize="sm" color="black" fontWeight="bold">
                        Detected: {bpm?.bpm || 'Analyzing...'}
                      </Text>
                      {bpm && (
                        <Box
                          bg={Math.abs(bpm.bpm - demoSample.expectedBPM) <= 2 ? "green.100" : "red.100"}
                          color={Math.abs(bpm.bpm - demoSample.expectedBPM) <= 2 ? "green.800" : "red.800"}
                          px={2}
                          py={1}
                          borderRadius="sm"
                        >
                          <Text fontSize="xs" fontWeight="bold">
                            {Math.abs(bpm.bpm - demoSample.expectedBPM) <= 2 ? "✓ MATCH" : "✗ DIFFERENT"}
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </HStack>
                </VStack>
              </Box>

              {/* Hip-Hop Educational Content */}
              <Box bg="white" border="1px solid" borderColor="gray.300" borderRadius="md" p={4}>
                <VStack gap={3} align="stretch">
                  <Text fontSize="md" fontWeight="bold" color="black">
                    About This Hip-Hop Style
                  </Text>
                  
                  <Text fontSize="sm" color="gray.700" lineHeight="short">
                    <strong>{demoSample.subgenre.replace('-', ' ').toUpperCase()}</strong> is a {demoSample.hipHopCharacteristics.productionEra} style 
                    characterized by {demoSample.hipHopCharacteristics.tempoStyle} tempo and {demoSample.hipHopCharacteristics.keyType} key progressions. 
                    This style is commonly used for {demoSample.hipHopCharacteristics.typicalUse} and features 
                    {demoSample.subgenre === 'trap' ? ' heavy 808s, hi-hats, and dark minor keys' :
                     demoSample.subgenre === 'boom-bap' ? ' classic drum breaks and soulful samples' :
                     demoSample.subgenre === 'classic' ? ' heavy kick and snare patterns' :
                     ' modern production techniques blending traditional elements'}.
                  </Text>

                  <Text fontSize="sm" color="gray.700" lineHeight="short">
                    The expected key of <strong>{demoSample.expectedKey}</strong> and tempo of <strong>{demoSample.expectedBPM} BPM</strong> 
                    are typical for this subgenre, creating the characteristic feel that defines {demoSample.subgenre.replace('-', ' ')} hip-hop.
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  )
}

export default ResultsDisplay