import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Text,
  VStack,
  Spinner,
  Center
} from '@chakra-ui/react'
import { useWaveform } from '../hooks/useWaveform'
import type { WaveformData } from '../types'

interface WaveformDisplayProps {
  audioBuffer?: AudioBuffer
  isLoading?: boolean
  progress?: number
  error?: string
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioBuffer,
  isLoading = false,
  progress,
  error
}) => {
  const { generateWaveformData, drawWaveform, isGenerating } = useWaveform()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 200 })

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const viewportWidth = window.innerWidth
        
        // Make waveform very small to guarantee it fits
        const maxViewportWidth = Math.max(200, viewportWidth * 0.4) // Only 40% of viewport
        const availableWidth = containerWidth > 0 ? containerWidth - 150 : maxViewportWidth // Lots of padding
        
        const width = Math.max(600, Math.min(availableWidth, 1000)) // Even larger for stunning visibility
        const height = Math.max(150, Math.min(width * 0.25, 250)) // Much taller for impressive appearance
        
        console.log('Canvas sizing:', { 
          containerWidth, 
          viewportWidth, 
          availableWidth, 
          width, 
          height 
        })
        setCanvasSize({ width, height })
      }
    }

    // Use a small delay to ensure the container is properly rendered
    const timeoutId = setTimeout(updateCanvasSize, 100)
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [audioBuffer]) // Re-run when audioBuffer changes

  // Generate waveform data when audioBuffer changes
  useEffect(() => {
    if (audioBuffer && !isLoading) {
      try {
        const data = generateWaveformData(audioBuffer)
        setWaveformData(data)
      } catch (err) {
        console.error('Failed to generate waveform data:', err)
        setWaveformData(null)
      }
    } else {
      setWaveformData(null)
    }
  }, [audioBuffer, isLoading, generateWaveformData])

  // Draw waveform when data or progress changes
  useEffect(() => {
    if (canvasRef.current && waveformData && !isGenerating) {
      // Set canvas size
      const canvas = canvasRef.current
      const { width, height } = canvasSize
      
      // Set canvas size directly without DPI scaling to fix the 2x size issue
      canvas.width = width
      canvas.height = height
      
      // Set CSS size to match canvas size
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      
      drawWaveform(canvas, waveformData, progress)
    }
  }, [waveformData, progress, canvasSize, drawWaveform, isGenerating])

  // Show loading state
  if (isLoading || isGenerating) {
    return (
      <Box
        ref={containerRef}
        bg="gray.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        p={6}
        minH="200px"
      >
        <Center h="full">
          <VStack gap={3}>
            <Spinner size="lg" color="red.500" />
            <Text color="gray.600" fontSize="sm">
              {isGenerating ? 'Generating waveform...' : 'Loading audio...'}
            </Text>
          </VStack>
        </Center>
      </Box>
    )
  }

  // Show error state
  if (error) {
    return (
      <Box
        ref={containerRef}
        bg="red.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="red.200"
        p={6}
        minH="200px"
      >
        <Center h="full">
          <VStack gap={2}>
            <Text color="red.800" fontWeight="bold">
              Waveform Error
            </Text>
            <Text color="red.700" fontSize="sm" textAlign="center">
              {error}
            </Text>
          </VStack>
        </Center>
      </Box>
    )
  }

  // Show empty state
  if (!audioBuffer || !waveformData) {
    return (
      <Box
        ref={containerRef}
        bg="gray.50"
        borderRadius="lg"
        border="2px dashed"
        borderColor="gray.300"
        p={6}
        minH="200px"
      >
        <Center h="full">
          <Text color="gray.500" fontSize="lg">
            Upload an audio file to see waveform
          </Text>
        </Center>
      </Box>
    )
  }

  // Show waveform
  return (
    <Box ref={containerRef} w="100%">
      <VStack gap={3} align="stretch">
        {/* Waveform info */}
        <Box>
          <Text fontSize="sm" color="gray.600">
            Duration: {Math.round(waveformData.duration)}s | 
            Sample Rate: {waveformData.sampleRate}Hz | 
            Channels: {waveformData.channels}
          </Text>
        </Box>

        {/* Canvas container with enhanced styling */}
        <Box
          bg="linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.300"
          p={4}
          position="relative"
          overflow="hidden"
          w="100%"
          minH={`${canvasSize.height + 32}px`}
          display="flex"
          justifyContent="center"
          alignItems="center"
          boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
          _hover={{
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
            transform: "translateY(-1px)"
          }}
          transition="all 0.2s ease"
        >
          <canvas
            ref={canvasRef}
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              display: 'block',
              background: 'transparent'
            }}
          />
          
          {/* Progress overlay */}
          {progress !== undefined && progress > 0 && (
            <>
              {/* Progress bar overlay on waveform */}
              <Box
                position="absolute"
                top={4}
                left={4}
                right={4}
                bottom={4}
                pointerEvents="none"
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  width={`${progress * 100}%`}
                  height="100%"
                  bg="rgba(255, 0, 0, 0.1)"
                  borderRadius="lg"
                  transition="width 0.3s ease"
                />
                <Box
                  position="absolute"
                  top={0}
                  left={`${progress * 100}%`}
                  width="2px"
                  height="100%"
                  bg="red.500"
                  transition="left 0.3s ease"
                />
              </Box>
              
              {/* Progress text overlay */}
              <Box
                position="absolute"
                top={2}
                right={2}
                bg="rgba(255, 255, 255, 0.95)"
                px={3}
                py={1}
                borderRadius="md"
                fontSize="sm"
                color="gray.700"
                fontWeight="medium"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                {Math.round(progress * 100)}% analyzed
              </Box>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  )
}

export default WaveformDisplay