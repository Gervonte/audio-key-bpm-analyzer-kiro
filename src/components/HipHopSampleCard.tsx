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
  const getSubgenreColor = (subgenre: string) => {
    const colors = {
      'classic': 'red',
      'trap': 'purple',
      'boom-bap': 'orange',
      'modern': 'blue'
    }
    return colors[subgenre as keyof typeof colors] || 'gray'
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
          minHeight: '120px'
        }
      case 'lg':
        return {
          padding: 6,
          titleSize: 'lg',
          descriptionSize: 'md',
          metadataSize: 'sm',
          buttonSize: 'lg' as const,
          minHeight: '200px'
        }
      default: // md
        return {
          padding: 4,
          titleSize: 'md',
          descriptionSize: 'sm',
          metadataSize: 'xs',
          buttonSize: 'md' as const,
          minHeight: '160px'
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

      <VStack align="stretch" gap={3} h="full">
        {/* Header with title and badge */}
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1} flex="1">
            <Text 
              fontWeight="bold" 
              fontSize={sizeProps.titleSize} 
              color="black"
              lineHeight="short"
            >
              {sample.name}
            </Text>
            <Badge 
              colorScheme={getSubgenreColor(sample.subgenre)} 
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
          lineHeight="short"
          overflow="hidden"
          textOverflow="ellipsis"
          maxH="4.5em"
        >
          {sample.description}
        </Text>
        
        {/* Metadata */}
        <VStack align="stretch" gap={2} fontSize={sizeProps.metadataSize} color="gray.500">
          <HStack justify="space-between">
            <Text fontWeight="medium">Expected:</Text>
            <Text>{sample.expectedKey}, {sample.expectedBPM} BPM</Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Duration:</Text>
            <Text>{sample.duration}s</Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Era:</Text>
            <Text>{sample.hipHopCharacteristics.productionEra}</Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="medium">Style:</Text>
            <Text>{sample.hipHopCharacteristics.tempoStyle}</Text>
          </HStack>
        </VStack>
        
        {/* Action button */}
        <Box mt="auto">
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
