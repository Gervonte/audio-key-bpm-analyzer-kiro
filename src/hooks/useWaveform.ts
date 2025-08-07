import { useCallback, useRef, useState } from 'react'
import type { WaveformData } from '../types'
import { WaveformOptimizer } from '../utils/waveformOptimizer'
import { memoryManager } from '../utils/memoryManager'

interface UseWaveformReturn {
  generateWaveformData: (audioBuffer: AudioBuffer, options?: { maxPeaks?: number; targetWidth?: number }) => WaveformData
  drawWaveform: (canvas: HTMLCanvasElement, data: WaveformData, progress?: number) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isGenerating: boolean
}

export const useWaveform = (): UseWaveformReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateWaveformData = useCallback((
    audioBuffer: AudioBuffer, 
    options: { maxPeaks?: number; targetWidth?: number } = {}
  ): WaveformData => {
    setIsGenerating(true)

    try {
      // Check memory before generating waveform
      const estimatedMemory = memoryManager.estimateWaveformMemory(options.maxPeaks || 2000)
      if (!memoryManager.hasEnoughMemoryForProcessing(estimatedMemory)) {
        memoryManager.forceGarbageCollection()
      }

      // Use optimized waveform generation
      const qualityLevel = WaveformOptimizer.getOptimalQualityLevel()
      
      return WaveformOptimizer.generateOptimizedWaveform(audioBuffer, {
        maxPeaks: options.maxPeaks,
        targetWidth: options.targetWidth,
        enableDownsampling: true,
        qualityLevel
      })
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const drawWaveform = useCallback((
    canvas: HTMLCanvasElement,
    data: WaveformData,
    progress?: number
  ) => {
    // Use the optimized renderer
    const qualityLevel = WaveformOptimizer.getOptimalQualityLevel()
    const isMobile = window.innerWidth <= 768
    
    WaveformOptimizer.renderOptimizedWaveform(canvas, data as any, progress, {
      enableAntiAliasing: qualityLevel === 'high',
      enableShadows: qualityLevel !== 'low' && !isMobile,
      colorScheme: 'default'
    })
  }, [])

  return {
    generateWaveformData,
    drawWaveform,
    canvasRef,
    isGenerating
  }
}

export default useWaveform