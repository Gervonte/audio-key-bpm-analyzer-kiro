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
  const getAccuracyStatus = () => {
    if (sample.name.includes('Corrupted')) {
      return { text: 'Error', bg: 'white', color: 'red', border: '1px solid red' }
    } else if (sample.name.includes('Accurate')) {
      return { text: 'Accurate', bg: 'white', color: 'red', border: '1px solid red' }
    } else if (sample.name.includes('Inaccurate')) {
      return { text: 'Inaccurate', bg: 'white', color: 'red', border: '1px solid red' }
    } else {
      return { text: 'Unknown', bg: 'white', color: 'red', border: '1px solid red' }
    }
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
              >
                {sample.name}
              </Text>
              <Badge 
                bg={getAccuracyStatus().bg}
                color={getAccuracyStatus().color}
                border={getAccuracyStatus().border}
                size="sm"
                textTransform="uppercase"
                fontWeight="bold"
                borderRadius="md"
              >
                {getAccuracyStatus().text}
              </Badge>
            </VStack>
          </HStack>
          
          {/* Description */}
          <Text
            fontSize={sizeProps.descriptionSize} 
            color="gray.600"
            lineHeight="1.4"
          >
            {sample.description}
          </Text>
          
          {/* Metadata */}
          <VStack align="stretch" gap={1.5} fontSize={sizeProps.metadataSize} color="gray.500">
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="medium" minW="fit-content">Expected:</Text>
              <Text textAlign="right" flex="1">{sample.expectedKey}, {sample.expectedBPM} BPM</Text>
            </HStack>
          </VStack>
        </VStack>
        
        {/* Action button */}
        <Box>
          <button
            onClick={!disabled && !isLoading ? onSelect : undefined}
            disabled={disabled || isLoading}
            style={{
              width: '100%',
              padding: sizeProps.buttonSize === 'sm' ? '8px 12px' : sizeProps.buttonSize === 'lg' ? '12px 20px' : '10px 16px',
              fontSize: sizeProps.buttonSize === 'sm' ? '14px' : sizeProps.buttonSize === 'lg' ? '18px' : '16px',
              fontWeight: isSelected ? 'bold' : 'normal',
              backgroundColor: isSelected ? '#dc2626' : 'white',
              color: isSelected ? 'white' : 'black',
              border: isSelected ? '2px solid #dc2626' : '2px solid black',
              borderRadius: '6px',
              cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
              opacity: disabled || isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              if (!disabled && !isLoading) {
                e.currentTarget.style.backgroundColor = isSelected ? '#b91c1c' : 'black';
                e.currentTarget.style.color = isSelected ? 'white' : 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !isLoading) {
                e.currentTarget.style.backgroundColor = isSelected ? '#dc2626' : 'white';
                e.currentTarget.style.color = isSelected ? 'white' : 'black';
              }
            }}
          >
            {isLoading ? 'Loading...' : (isSelected ? '✓ Selected' : 'Try This Beat')}
          </button>
        </Box>
      </VStack>
    </Box>
  )
}

export default HipHopSampleCard
