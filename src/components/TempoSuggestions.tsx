import React, { useState } from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Collapsible,
} from '@chakra-ui/react'
import { generateTempoSuggestions } from '../utils/tempoSuggestions'

interface TempoSuggestionsProps {
  detectedBPM: number
  confidence: number
}

export const TempoSuggestions: React.FC<TempoSuggestionsProps> = ({
  detectedBPM,
  confidence,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const suggestions = generateTempoSuggestions(detectedBPM, confidence)
  
  // Don't show suggestions if confidence is very high and BPM is in typical range
  const shouldShowSuggestions = confidence < 0.8 || suggestions.suggestions.length > 1
  
  if (!shouldShowSuggestions) {
    return null
  }
  
  const getConfidenceBadgeColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'green'
      case 'medium': return 'yellow'
      case 'low': return 'red'
      default: return 'gray'
    }
  }
  
  return (
    <Box w="100%" mt={4}>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        size="sm"
        color="gray.600"
        _hover={{ bg: 'gray.50' }}
        w="100%"
        justifyContent="space-between"
      >
        <HStack>
          <Text fontSize="sm">ℹ️</Text>
          <Text fontSize="sm">Tempo Analysis & Suggestions</Text>
        </HStack>
        <Text fontSize="sm">{isExpanded ? '▲' : '▼'}</Text>
      </Button>
      
      {/* Expandable Content */}
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          <Box mt={3} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
          <VStack gap={4} align="stretch">
            
            {/* Genre Context */}
            <Box>
              <Text fontSize="xs" color="gray.600" fontStyle="italic">
                {suggestions.genreContext}
              </Text>
            </Box>
            
            {/* Tempo Suggestions */}
            {suggestions.suggestions.length > 1 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Alternative Tempos:
                </Text>
                <VStack gap={2} align="stretch">
                  {suggestions.suggestions.slice(1).map((suggestion, index) => (
                    <Box
                      key={index}
                      p={3}
                      bg="white"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <HStack justify="space-between" align="start">
                        <VStack align="start" gap={1} flex={1}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="bold" color="black">
                              {suggestion.bpm} BPM
                            </Text>
                            <Badge
                              colorScheme={getConfidenceBadgeColor(suggestion.confidence)}
                              size="sm"
                            >
                              {suggestion.label}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {suggestion.description}
                          </Text>
                          <Text fontSize="xs" color="gray.500" fontStyle="italic">
                            {suggestion.reason}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
            
            {/* Educational Tips */}
            {suggestions.tips.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Tips:
                </Text>
                <VStack gap={1} align="stretch">
                  {suggestions.tips.map((tip, index) => (
                    <Text key={index} fontSize="xs" color="gray.600">
                      • {tip}
                    </Text>
                  ))}
                </VStack>
              </Box>
            )}
            
            {/* Quick Suggestion for Low Confidence */}
            {confidence < 0.6 && (
              <Box p={3} bg="yellow.50" borderRadius="md" border="1px solid" borderColor="yellow.200">
                <HStack>
                  <Text fontSize="sm" color="yellow.600">⚠️</Text>
                  <Text fontSize="xs" color="yellow.800">
                    <strong>Low confidence detected.</strong> Try listening to the track and comparing with the suggested tempos above.
                  </Text>
                </HStack>
              </Box>
            )}
            
          </VStack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}

export default TempoSuggestions