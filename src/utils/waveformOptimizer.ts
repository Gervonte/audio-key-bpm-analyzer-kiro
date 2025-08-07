// Optimized waveform rendering with downsampling for large audio files

import { memoryManager } from './memoryManager'
import type { WaveformData } from '../types'

interface OptimizedWaveformData extends WaveformData {
  originalLength: number
  downsampleRatio: number
  isDownsampled: boolean
}

interface WaveformOptimizationOptions {
  maxPeaks?: number
  targetWidth?: number
  enableDownsampling?: boolean
  qualityLevel?: 'low' | 'medium' | 'high'
}

export class WaveformOptimizer {
  private static readonly DEFAULT_MAX_PEAKS = 2000
  private static readonly QUALITY_SETTINGS = {
    low: { maxPeaks: 1000, smoothing: false, antiAliasing: false },
    medium: { maxPeaks: 2000, smoothing: true, antiAliasing: false },
    high: { maxPeaks: 4000, smoothing: true, antiAliasing: true }
  }

  /**
   * Generate optimized waveform data with automatic downsampling
   */
  static generateOptimizedWaveform(
    audioBuffer: AudioBuffer,
    options: WaveformOptimizationOptions = {}
  ): OptimizedWaveformData {
    const {
      maxPeaks = this.DEFAULT_MAX_PEAKS,
      targetWidth,
      enableDownsampling = true,
      qualityLevel = 'medium'
    } = options

    const qualitySettings = this.QUALITY_SETTINGS[qualityLevel]
    const effectiveMaxPeaks = Math.min(maxPeaks, qualitySettings.maxPeaks)

    // Use target width if provided, otherwise use quality-based max peaks
    const targetPeaks = targetWidth || effectiveMaxPeaks

    const channelData = audioBuffer.getChannelData(0)
    const samples = channelData.length
    const originalLength = samples

    // Check if downsampling is needed
    const needsDownsampling = enableDownsampling && samples > targetPeaks * 10
    
    let peaks: number[]
    let downsampleRatio = 1
    let isDownsampled = false

    if (needsDownsampling) {
      // Calculate optimal downsampling ratio
      downsampleRatio = Math.ceil(samples / targetPeaks)
      isDownsampled = true
      
      peaks = this.generateDownsampledPeaks(channelData, targetPeaks, downsampleRatio)
    } else {
      // Generate peaks without downsampling
      const samplesPerPeak = Math.max(1, Math.floor(samples / targetPeaks))
      peaks = this.generatePeaks(channelData, samplesPerPeak)
    }

    // Apply smoothing if enabled
    if (qualitySettings.smoothing && peaks.length > 3) {
      peaks = this.smoothPeaks(peaks)
    }

    return {
      peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      originalLength,
      downsampleRatio,
      isDownsampled
    }
  }

  /**
   * Generate peaks with downsampling for very large files
   */
  private static generateDownsampledPeaks(
    channelData: Float32Array,
    targetPeaks: number,
    downsampleRatio: number
  ): number[] {
    const peaks: number[] = []
    const samples = channelData.length
    const samplesPerPeak = Math.floor(samples / targetPeaks)

    for (let i = 0; i < targetPeaks && i * samplesPerPeak < samples; i++) {
      const start = i * samplesPerPeak
      const end = Math.min(start + samplesPerPeak, samples)
      
      let peak = 0
      
      // Sample every nth sample based on downsample ratio
      for (let j = start; j < end; j += downsampleRatio) {
        const sample = Math.abs(channelData[j])
        if (sample > peak) {
          peak = sample
        }
      }
      
      peaks.push(peak)
    }

    return peaks
  }

  /**
   * Generate peaks without downsampling
   */
  private static generatePeaks(channelData: Float32Array, samplesPerPeak: number): number[] {
    const peaks: number[] = []
    const samples = channelData.length

    for (let i = 0; i < samples; i += samplesPerPeak) {
      let peak = 0
      const end = Math.min(i + samplesPerPeak, samples)

      for (let j = i; j < end; j++) {
        const sample = Math.abs(channelData[j])
        if (sample > peak) {
          peak = sample
        }
      }

      peaks.push(peak)
    }

    return peaks
  }

  /**
   * Apply smoothing to peaks for better visual appearance
   */
  private static smoothPeaks(peaks: number[]): number[] {
    const smoothed = [...peaks]
    
    // Apply simple 3-point smoothing
    for (let i = 1; i < peaks.length - 1; i++) {
      const prev = peaks[i - 1]
      const current = peaks[i]
      const next = peaks[i + 1]
      
      // Weighted average with emphasis on current value
      smoothed[i] = (prev * 0.25 + current * 0.5 + next * 0.25)
    }

    return smoothed
  }

  /**
   * Render optimized waveform to canvas with performance optimizations
   */
  static renderOptimizedWaveform(
    canvas: HTMLCanvasElement,
    data: OptimizedWaveformData,
    progress?: number,
    options: {
      enableAntiAliasing?: boolean
      enableShadows?: boolean
      colorScheme?: 'default' | 'minimal' | 'vibrant'
    } = {}
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const { peaks } = data
    const {
      enableAntiAliasing = false,
      enableShadows = true,
      colorScheme = 'default'
    } = options

    // Performance optimizations based on memory pressure
    const memoryStats = memoryManager.getMemoryStats()
    const isLowMemory = memoryStats.memoryPressure === 'high'
    const isMobile = window.innerWidth <= 768

    // Disable expensive features on low memory or mobile
    const useAntiAliasing = enableAntiAliasing && !isLowMemory && !isMobile
    const useShadows = enableShadows && !isLowMemory && !isMobile

    // Set canvas rendering options
    if (useAntiAliasing) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    } else {
      ctx.imageSmoothingEnabled = false
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (peaks.length === 0) return

    // Calculate dimensions
    const barWidth = width / peaks.length
    const centerY = height / 2
    const maxBarHeight = height * 0.8

    // Color schemes
    const colorSchemes = {
      default: {
        base: 'rgba(255, 100, 150, 0.8)',
        processed: 'rgba(128, 0, 32, 0.9)',
        gradient: true
      },
      minimal: {
        base: 'rgba(100, 100, 100, 0.6)',
        processed: 'rgba(50, 50, 50, 0.8)',
        gradient: false
      },
      vibrant: {
        base: 'rgba(255, 50, 100, 0.9)',
        processed: 'rgba(200, 0, 50, 1.0)',
        gradient: true
      }
    }

    const colors = colorSchemes[colorScheme]

    // Render waveform bars
    peaks.forEach((peak, index) => {
      const x = index * barWidth
      const barHeight = Math.min(peak * maxBarHeight, maxBarHeight)
      const y = centerY - barHeight / 2
      const adjustedBarWidth = Math.max(1, barWidth - 0.5)

      // Determine if this bar is processed
      const isProcessed = progress !== undefined && index <= progress * peaks.length

      // Set color
      let fillStyle: string | CanvasGradient
      
      if (colors.gradient && !isLowMemory) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        const baseColor = isProcessed ? colors.processed : colors.base
        
        gradient.addColorStop(0, baseColor.replace(/[\d.]+\)$/, '1.0)'))
        gradient.addColorStop(1, baseColor.replace(/[\d.]+\)$/, '0.6)'))
        fillStyle = gradient
      } else {
        fillStyle = isProcessed ? colors.processed : colors.base
      }

      ctx.fillStyle = fillStyle

      // Draw bar with optional shadows
      if (useShadows && peak > 0.1) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 2
        ctx.shadowOffsetY = 1
      }

      // Use rounded rectangles for better appearance
      if (barHeight > 2) {
        const radius = Math.min(adjustedBarWidth / 2, 2)
        ctx.beginPath()
        ctx.roundRect(x, y, adjustedBarWidth, barHeight, radius)
        ctx.fill()
      } else {
        // For very small bars, use simple rectangles
        ctx.fillRect(x, y, adjustedBarWidth, barHeight)
      }

      // Reset shadow
      if (useShadows) {
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }
    })

    // Draw progress indicator
    if (progress !== undefined && progress > 0) {
      const progressX = width * progress
      
      ctx.strokeStyle = '#FF0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }
  }

  /**
   * Calculate optimal quality level based on system resources
   */
  static getOptimalQualityLevel(): 'low' | 'medium' | 'high' {
    const memoryStats = memoryManager.getMemoryStats()
    const isMobile = window.innerWidth <= 768
    
    if (isMobile || memoryStats.memoryPressure === 'high') {
      return 'low'
    } else if (memoryStats.memoryPressure === 'medium') {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * Estimate memory usage for waveform generation
   */
  static estimateMemoryUsage(audioBuffer: AudioBuffer, targetPeaks: number): number {
    const baseMemory = audioBuffer.numberOfChannels * audioBuffer.length * 4 // Float32Array
    const peakMemory = targetPeaks * 8 // peaks array (Float64)
    const canvasMemory = 1920 * 1080 * 4 // Assume max canvas size
    
    return baseMemory + peakMemory + canvasMemory
  }
}