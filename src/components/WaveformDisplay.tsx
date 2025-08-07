import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Text,
  VStack,
  Spinner
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
  const [containerHeight, setContainerHeight] = useState(232) // Pre-calculate container height

  // Handle responsive canvas sizing with mobile optimization
  useEffect(() => {
    if (!containerRef.current) return
    const updateCanvasSize = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const viewportWidth = window.innerWidth

      // Ensure we have valid dimensions before proceeding
      if (containerWidth <= 0 || viewportWidth <= 0) {
        console.warn('Invalid container or viewport dimensions, skipping canvas resize')
        return
      }

      const isMobile = viewportWidth <= 768
      const isTablet = viewportWidth > 768 && viewportWidth <= 1024

      // Mobile-first responsive sizing
      let width: number
      let height: number

      if (isMobile) {
        // Mobile: Use most of the available width with padding
        const padding = 32 // 16px on each side
        width = Math.max(280, Math.min(containerWidth - padding, viewportWidth - padding))
        height = Math.max(120, Math.min(width * 0.3, 180)) // Shorter on mobile to save space
      } else if (isTablet) {
        // Tablet: Balanced sizing
        const padding = 48
        width = Math.max(400, Math.min(containerWidth - padding, viewportWidth * 0.8))
        height = Math.max(140, Math.min(width * 0.25, 200))
      } else {
        // Desktop: Larger, more impressive sizing
        const padding = 64
        width = Math.max(600, Math.min(containerWidth - padding, 1000))
        height = Math.max(150, Math.min(width * 0.25, 250))
      }

      // Only update if dimensions actually changed to prevent unnecessary re-renders
      setCanvasSize(prevSize => {
        if (prevSize.width !== width || prevSize.height !== height) {
          console.log('Canvas size changed:', { from: prevSize, to: { width, height } })
          return { width, height }
        }
        return prevSize
      })

      // Pre-calculate container height to prevent layout shifts
      const containerPadding = isMobile ? 16 : 32
      setContainerHeight(height + containerPadding)
    }

    // Initial size calculation
    updateCanvasSize()

    // Add event listeners for various resize scenarios
    const handleResize = () => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(updateCanvasSize)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    // Add zoom detection
    window.addEventListener('wheel', handleResize, { passive: true })

    // Use ResizeObserver for more reliable container size detection
    let resizeObserver: ResizeObserver | null = null
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateCanvasSize)
      })
      resizeObserver.observe(containerRef.current)
    }

    // Fallback timeout for cases where events don't fire
    const timeoutId = setTimeout(updateCanvasSize, 100)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('wheel', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [audioBuffer]) // Re-run when audioBuffer changes

  // Generate waveform data when audioBuffer changes
  useEffect(() => {
    if (audioBuffer && !isLoading) {
      try {
        // Generate waveform data (progress is now handled by simulated progress in App component)
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

  // Set canvas size when canvasSize changes (separate from drawing)
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const { width, height } = canvasSize

      // Only update canvas size if it actually changed
      if (canvas.width !== width || canvas.height !== height) {
        console.log('Updating canvas dimensions:', { width, height })
        canvas.width = width
        canvas.height = height
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        // Redraw immediately after size change if we have data
        if (waveformData && !isGenerating) {
          drawWaveform(canvas, waveformData, progress)
        }
      }
    }
  }, [canvasSize, waveformData, isGenerating, drawWaveform, progress])

  // Draw waveform when data or progress changes (but not when canvas size changes)
  useEffect(() => {
    if (canvasRef.current && waveformData && !isGenerating) {
      drawWaveform(canvasRef.current, waveformData, progress)
    }
  }, [waveformData, progress, drawWaveform, isGenerating])

  // Always use consistent VStack layout structure to prevent jarring transitions
  return (
    <Box ref={containerRef} w="100%">
      <VStack gap={3} align="stretch">
        {/* Waveform info section - always present with consistent height */}
        <Box minH="40px" display="flex" alignItems="center" justifyContent="center">
          {waveformData ? (
            <>
              {/* Desktop: Single line */}
              <Text
                fontSize="sm"
                color="gray.600"
                display={{ base: 'none', md: 'block' }}
                textAlign="center"
              >
                Duration: {Math.round(waveformData.duration)}s |
                Sample Rate: {waveformData.sampleRate}Hz |
                Channels: {waveformData.channels}
              </Text>

              {/* Mobile: Stacked layout */}
              <VStack
                gap={1}
                align="center"
                display={{ base: 'flex', md: 'none' }}
              >
                <Text fontSize="xs" color="gray.600">
                  Duration: {Math.round(waveformData.duration)}s
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {waveformData.sampleRate}Hz • {waveformData.channels} channel{waveformData.channels > 1 ? 's' : ''}
                </Text>
              </VStack>
            </>
          ) : (
            /* Placeholder info - maintains same height */
            <Text fontSize="sm" color="gray.400" textAlign="center">
              {isLoading || isGenerating ? 'Loading audio information...' : 'Upload an audio file to see details'}
            </Text>
          )}
        </Box>

        {/* Canvas container - always present with consistent size and structure */}
        <Box
          bg={error ? "red.50" : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"}
          borderRadius={{ base: 'lg', md: 'xl' }}
          border="1px solid"
          borderColor={error ? "red.200" : "gray.300"}
          p={{ base: 2, md: 4 }}
          position="relative"
          overflow="hidden"
          w="100%"
          h={`${containerHeight}px`}
          display="flex"
          justifyContent="center"
          alignItems="center"
          boxShadow={{ base: "0 2px 8px rgba(0, 0, 0, 0.1)", md: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
          _hover={!isLoading && !isGenerating && !error ? {
            boxShadow: { base: "0 4px 12px rgba(0, 0, 0, 0.15)", md: "0 6px 20px rgba(0, 0, 0, 0.15)" },
            transform: "translateY(-1px)"
          } : {}}
          transition="box-shadow 0.2s ease, transform 0.2s ease"
          touchAction="pan-x pan-y"
        >
          {/* Show different content based on state - but maintain same container structure */}
          {error ? (
            <VStack gap={2}>
              <Text color="red.800" fontWeight="bold">
                Waveform Error
              </Text>
              <Text color="red.700" fontSize="sm" textAlign="center">
                {error}
              </Text>
            </VStack>
          ) : isLoading || isGenerating ? (
            <VStack gap={3}>
              <Spinner size="lg" color="red.500" />
              <Text color="gray.600" fontSize="sm">
                {isGenerating ? 'Generating waveform...' : 'Loading audio...'}
              </Text>
            </VStack>
          ) : !audioBuffer || !waveformData ? (
            <Text color="gray.500" fontSize="lg">
              Upload an audio file to see waveform
            </Text>
          ) : (
            <>
              {/* Actual waveform canvas */}
              <canvas
                ref={canvasRef}
                key="waveform-canvas" // Prevent React from recreating the canvas
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
                    top={{ base: 2, md: 4 }}
                    left={{ base: 2, md: 4 }}
                    right={{ base: 2, md: 4 }}
                    bottom={{ base: 2, md: 4 }}
                    pointerEvents="none"
                  >
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      width={`${progress * 100}%`}
                      height="100%"
                      bg="rgba(255, 0, 0, 0.1)"
                      borderRadius={{ base: 'md', md: 'lg' }}
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
                    top={{ base: 1, md: 2 }}
                    right={{ base: 1, md: 2 }}
                    bg="rgba(255, 255, 255, 0.95)"
                    px={{ base: 2, md: 3 }}
                    py={1}
                    borderRadius="md"
                    fontSize={{ base: 'xs', md: 'sm' }}
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
            </>
          )}
        </Box>
      </VStack>
    </Box>
  )
}


export default WaveformDisplay