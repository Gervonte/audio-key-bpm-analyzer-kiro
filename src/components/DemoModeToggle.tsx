/**
 * Demo Mode Toggle Component
 * 
 * A toggle switch component for enabling/disabling demo mode.
 * Follows the project's minimal design system with red accent colors.
 */

import React from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Button
} from '@chakra-ui/react'

export interface DemoModeToggleProps {
  isDemoMode: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export const DemoModeToggle: React.FC<DemoModeToggleProps> = ({
  isDemoMode,
  onToggle,
  disabled = false,
  size = 'md',
  showDescription = true
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isDemoMode)
    }
  }

  const getSizeProps = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 2,
          fontSize: 'sm',
          switchSize: 'sm' as const
        }
      case 'lg':
        return {
          padding: 4,
          fontSize: 'lg',
          switchSize: 'lg' as const
        }
      default: // md
        return {
          padding: 3,
          fontSize: 'md',
          switchSize: 'md' as const
        }
    }
  }

  const sizeProps = getSizeProps()

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor={isDemoMode ? 'red.500' : 'gray.300'}
      borderRadius="md"
      p={sizeProps.padding}
      transition="all 0.2s ease-in-out"
      opacity={disabled ? 0.6 : 1}
      _hover={!disabled ? {
        borderColor: isDemoMode ? 'red.600' : 'gray.400',
        bg: isDemoMode ? 'red.50' : 'gray.50'
      } : {}}
    >
      <HStack justify="space-between" align="center" gap={3}>
        <VStack align="start" gap={1} flex="1">
          <Text 
            fontWeight="bold" 
            color="black"
            fontSize="sm"
            lineHeight="short"
          >
            {isDemoMode ? '🎵 Try Hip-Hop Samples' : '📁 Upload Your Audio'}
          </Text>
          <HStack align="center" gap={2}>
            <Text 
              fontWeight="medium" 
              color={isDemoMode ? 'red.800' : 'gray.800'}
              fontSize={sizeProps.fontSize}
            >
              {isDemoMode ? 'Sample Tracks Active' : 'Upload Mode'}
            </Text>
            {isDemoMode && (
              <Box
                bg="red.100"
                color="red.800"
                px={2}
                py={1}
                borderRadius="sm"
                fontSize="xs"
                fontWeight="bold"
              >
                SAMPLES
              </Box>
            )}
          </HStack>
          
          {showDescription && (
            <Text 
              fontSize="sm" 
              color={isDemoMode ? 'red.600' : 'gray.600'}
              lineHeight="short"
            >
              {isDemoMode 
                ? 'Test the analyzer with curated hip-hop beats' 
                : 'Analyze your own audio files for key & BPM'
              }
            </Text>
          )}
        </VStack>
        
        <Button
          onClick={handleToggle}
          disabled={disabled}
          colorScheme="red"
          variant={isDemoMode ? 'solid' : 'outline'}
          size={sizeProps.switchSize}
          minW="60px"
          h="32px"
          borderRadius="full"
          position="relative"
          _focus={{
            boxShadow: '0 0 0 3px rgba(255, 0, 0, 0.1)'
          }}
        >
          <Box
            position="absolute"
            left={isDemoMode ? 'auto' : '4px'}
            right={isDemoMode ? '4px' : 'auto'}
            top="50%"
            transform="translateY(-50%)"
            w="24px"
            h="24px"
            bg="white"
            borderRadius="full"
            transition="all 0.2s ease-in-out"
            boxShadow="0 2px 4px rgba(0,0,0,0.1)"
          />
        </Button>
      </HStack>
    </Box>
  )
}

export default DemoModeToggle
