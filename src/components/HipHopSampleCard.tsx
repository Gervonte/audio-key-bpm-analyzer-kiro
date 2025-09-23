/**
 * Hip-Hop Sample Card Component
 * 
 * A card component for displaying hip-hop instrumental demo samples.
 * Shows sample information, metadata, and provides selection functionality.
 * Follows the project's minimal design system with red accent colors.
 */

import React from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner
} from '@chakra-ui/react'
import type { DemoSample } from '../types'

export interface HipHopSampleCardProps {
  sample: DemoSample
  isSelected: boolean
  onSelect: () => void
  isLoading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const HipHopSampleCard: React.FC<HipHopSampleCardProps> = ({
  sample,
  isSelected,
  onSelect,
  isLoading = false,
  disabled = false,
  size = 'md'
}) => {
  const getSubgenreColor = () => {
    // All subgenres use red shades to match design system
    return 'red'
  }

  const getSizeProps = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 3,
          titleSize: 'sm',
          descriptionSize: 'xs',
          metadataSize: 'xs',
          buttonSize: 'sm' as const,
          minHeight: '140px'
        }
      case 'lg':
        return {
          padding: 6,
          titleSize: 'lg',
          descriptionSize: 'md',
          metadataSize: 'sm',
          buttonSize: 'lg' as const,
          minHeight: '240px'
        }
      default: // md
        return {
          padding: 4,
          titleSize: 'md',
          descriptionSize: 'sm',
          metadataSize: 'xs',
          buttonSize: 'md' as const,
          minHeight: '180px'
        }
    }
  }

  const sizeProps = getSizeProps()

  return (
    <Box
      border="2px solid"
      borderColor={isSelected ? 'red.500' : 'gray.200'}
      borderRadius="lg"
      p={sizeProps.padding}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      bg={isSelected ? 'red.50' : 'white'}
      minH={sizeProps.minHeight}
      transition="all 0.2s ease-in-out"
      opacity={disabled || isLoading ? 0.6 : 1}
      _hover={!disabled && !isLoading ? {
        borderColor: isSelected ? 'red.600' : 'red.300',
        bg: isSelected ? 'red.100' : 'red.25',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      } : {}}
      _active={!disabled && !isLoading ? {
        transform: 'translateY(0px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      } : {}}
      onClick={!disabled && !isLoading ? onSelect : undefined}
      position="relative"
    >
      {/* Selection indicator */}
      {isSelected && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="red.500"
          color="white"
          borderRadius="full"
          p={1}
        >
          <Text fontSize="xs" fontWeight="bold">✓</Text>
        </Box>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="white"
          opacity={0.8}
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1}
        >
          <VStack gap={2}>
            <Spinner size="sm" color="red.500" />
            <Text fontSize="xs" color="gray.600">
              Loading...
            </Text>
          </VStack>
        </Box>
      )}

      <VStack align="stretch" gap={3} h="full" justify="space-between">
        {/* Content section */}
        <VStack align="stretch" gap={3} flex="1">
          {/* Header with title and badge */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1} flex="1">
              <Text 
                fontWeight="bold" 
                fontSize={sizeProps.titleSize} 
                color="black"
                lineHeight="1.3"
                overflow="hidden"
                textOverflow="ellipsis"
                maxH="2.6em"
              >
                {sample.name}
              </Text>
              <Badge 
                colorScheme={getSubgenreColor()} 
                size="sm"
                textTransform="uppercase"
                fontWeight="bold"
              >
                {sample.subgenre.replace('-', ' ')}
              </Badge>
            </VStack>
          </HStack>
          
          {/* Description */}
          <Text
            fontSize={sizeProps.descriptionSize} 
            color="gray.600"
            lineHeight="1.4"
            overflow="hidden"
            textOverflow="ellipsis"
            maxH="5.6em"
          >
            {sample.description}
          </Text>
          
          {/* Metadata */}
          <VStack align="stretch" gap={1.5} fontSize={sizeProps.metadataSize} color="gray.500">
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="medium" minW="fit-content">Expected:</Text>
              <Text textAlign="right" flex="1">{sample.expectedKey}, {sample.expectedBPM} BPM</Text>
            </HStack>
            
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="medium" minW="fit-content">Duration:</Text>
              <Text textAlign="right" flex="1">{sample.duration}s</Text>
            </HStack>
            
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="medium" minW="fit-content">Era:</Text>
              <Text textAlign="right" flex="1">{sample.hipHopCharacteristics.productionEra}</Text>
            </HStack>
            
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="medium" minW="fit-content">Style:</Text>
              <Text textAlign="right" flex="1">{sample.hipHopCharacteristics.tempoStyle}</Text>
            </HStack>
          </VStack>
        </VStack>
        
        {/* Action button */}
        <Box>
          <Button
            size={sizeProps.buttonSize}
            colorScheme="red"
            variant={isSelected ? 'solid' : 'outline'}
            onClick={!disabled && !isLoading ? onSelect : undefined}
            disabled={disabled || isLoading}
            loading={isLoading}
            loadingText="Loading..."
            width="full"
            _hover={!disabled && !isLoading ? {
              bg: isSelected ? 'red.600' : 'red.50',
              borderColor: 'red.500'
            } : {}}
          >
            {isSelected ? 'Selected' : 'Try This Beat'}
          </Button>
        </Box>
      </VStack>
    </Box>
  )
}

export default HipHopSampleCard
