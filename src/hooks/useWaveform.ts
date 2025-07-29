import { useCallback, useRef, useState } from 'react'
import type { WaveformData } from '../types'

interface UseWaveformReturn {
  generateWaveformData: (audioBuffer: AudioBuffer) => WaveformData
  drawWaveform: (canvas: HTMLCanvasElement, data: WaveformData, progress?: number) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isGenerating: boolean
}

export const useWaveform = (): UseWaveformReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateWaveformData = useCallback((audioBuffer: AudioBuffer): WaveformData => {
    setIsGenerating(true)

    try {
      const channelData = audioBuffer.getChannelData(0) // Use first channel
      const samples = channelData.length
      const duration = audioBuffer.duration
      const sampleRate = audioBuffer.sampleRate
      const channels = audioBuffer.numberOfChannels

      // Calculate how many samples per pixel for waveform visualization
      // Target around 1000-2000 peaks for good visual representation
      const targetPeaks = Math.min(2000, Math.max(1000, Math.floor(samples / 100)))
      const samplesPerPeak = Math.floor(samples / targetPeaks)

      const peaks: number[] = []

      // Generate peaks by finding the maximum absolute value in each segment
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

      return {
        peaks,
        duration,
        sampleRate,
        channels
      }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const drawWaveform = useCallback((
    canvas: HTMLCanvasElement,
    data: WaveformData,
    progress?: number
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const { peaks } = data

    console.log('Drawing waveform:', {
      canvasWidth: width,
      canvasHeight: height,
      peaksCount: peaks.length,
      cssWidth: canvas.style.width,
      cssHeight: canvas.style.height
    })

    // Clear canvas with subtle background
    ctx.clearRect(0, 0, width, height)

    if (peaks.length === 0) return

    // Calculate dimensions
    const barWidth = width / peaks.length
    const centerY = height / 2
    const maxBarHeight = height * 0.7 // Slightly more height for better visuals

    // Apply smoothing to peaks for prettier waveform
    const smoothedPeaks = peaks.map((peak, index) => {
      if (index === 0 || index === peaks.length - 1) return peak

      // Simple 3-point smoothing
      const prev = peaks[index - 1] || peak
      const next = peaks[index + 1] || peak
      return (prev + peak * 2 + next) / 4
    })

    // First, draw a subtle filled underlay for depth
    ctx.globalAlpha = 0.15
    ctx.fillStyle = 'rgba(255, 100, 150, 0.2)'
    ctx.beginPath()
    ctx.moveTo(0, centerY)

    // Create smooth curve through all peaks for underlay
    for (let i = 0; i < smoothedPeaks.length; i++) {
      const x = i * barWidth + barWidth / 2
      const peak = smoothedPeaks[i]
      const barHeight = Math.min(peak * maxBarHeight, height * 0.7)
      const topY = centerY - barHeight / 2

      if (i === 0) {
        ctx.lineTo(x, topY)
      } else {
        // Use quadratic curves for smooth interpolation
        const prevX = (i - 1) * barWidth + barWidth / 2
        const controlX = (prevX + x) / 2
        const prevPeak = smoothedPeaks[i - 1]
        const prevBarHeight = Math.min(prevPeak * maxBarHeight, height * 0.7)
        const prevTopY = centerY - prevBarHeight / 2
        const controlY = (prevTopY + topY) / 2
        ctx.quadraticCurveTo(controlX, controlY, x, topY)
      }
    }

    // Complete the underlay shape
    for (let i = smoothedPeaks.length - 1; i >= 0; i--) {
      const x = i * barWidth + barWidth / 2
      const peak = smoothedPeaks[i]
      const barHeight = Math.min(peak * maxBarHeight, height * 0.7)
      const bottomY = centerY + barHeight / 2

      if (i === smoothedPeaks.length - 1) {
        ctx.lineTo(x, bottomY)
      } else {
        const nextX = (i + 1) * barWidth + barWidth / 2
        const controlX = (nextX + x) / 2
        const nextPeak = smoothedPeaks[i + 1]
        const nextBarHeight = Math.min(nextPeak * maxBarHeight, height * 0.7)
        const nextBottomY = centerY + nextBarHeight / 2
        const controlY = (nextBottomY + bottomY) / 2
        ctx.quadraticCurveTo(controlX, controlY, x, bottomY)
      }
    }
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1.0

    // First pass: Draw shadows only (behind the bars)
    smoothedPeaks.forEach((peak, index) => {
      if (peak > 0.15) { // Lower threshold so more bars get shadows
        const x = index * barWidth
        const barHeight = Math.min(peak * maxBarHeight, height * 0.7)
        const y = Math.max(0, centerY - barHeight / 2)
        const barWidthAdjusted = Math.max(1.2, barWidth - 0.2)

        const shadowOpacity = Math.min(0.5, (peak - 0.15) * 0.6) // Higher opacity for visibility

        // Create shadow shape (slightly offset)
        const shadowOffsetX = 1.5
        const shadowOffsetY = 2.5
        const radius = Math.min(barWidthAdjusted / 2, 3.0)

        // Draw shadow as a filled shape (not using shadowBlur to avoid affecting main bars)
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`
        ctx.beginPath()
        const x1 = x + shadowOffsetX
        const y1 = y + shadowOffsetY
        const x2 = x + barWidthAdjusted + shadowOffsetX
        const y2 = y + barHeight + shadowOffsetY

        ctx.moveTo(x1 + radius, y1)
        ctx.arcTo(x2, y1, x2, y1 + radius, radius)
        ctx.arcTo(x2, y2, x2 - radius, y2, radius)
        ctx.arcTo(x1, y2, x1, y2 - radius, radius)
        ctx.arcTo(x1, y1, x1 + radius, y1, radius)
        ctx.closePath()
        ctx.fill()
      }
    })

    // Second pass: Draw the clean, bright waveform bars on top
    smoothedPeaks.forEach((peak, index) => {
      const x = index * barWidth
      const barHeight = Math.min(peak * maxBarHeight, height * 0.7)
      const y = Math.max(0, centerY - barHeight / 2)
      const barWidthAdjusted = Math.max(1.2, barWidth - 0.2) // Slightly wider for smoother appearance

      // Dynamic red & pink color mapping based on amplitude
      let baseColor: string
      let opacity: number

      if (peak < 0.2) {
        // Quiet parts - soft pink with high transparency
        baseColor = `rgba(255, 182, 193, ${0.4 + peak * 0.4})` // Light pink
        opacity = 0.6
      } else if (peak < 0.5) {
        // Medium parts - pink to coral transition
        const pinkToCoral = (peak - 0.2) * 3.33 // 0 to 1
        const red = 255
        const green = Math.floor(182 - pinkToCoral * 82) // 182 to 100 (pink to coral)
        const blue = Math.floor(193 - pinkToCoral * 113) // 193 to 80 (pink to coral)
        baseColor = `rgba(${red}, ${green}, ${blue}, ${0.7 + peak * 0.2})`
        opacity = 0.8
      } else if (peak < 0.8) {
        // Loud parts - coral to red transition
        const coralToRed = (peak - 0.5) * 3.33 // 0 to 1
        const red = 255
        const green = Math.floor(100 - coralToRed * 100) // 100 to 0 (coral to red)
        const blue = Math.floor(80 - coralToRed * 80) // 80 to 0 (coral to red)
        baseColor = `rgba(${red}, ${green}, ${blue}, ${0.8 + peak * 0.15})`
        opacity = 0.9
      } else {
        // Very loud parts - deep red to bright red-pink
        const intensity = (peak - 0.8) * 5 // 0 to 1
        const red = 255
        const green = Math.floor(intensity * 69) // 0 to 69 (deep red to hot pink)
        const blue = Math.floor(intensity * 100) // 0 to 100 (deep red to hot pink)
        baseColor = `rgba(${red}, ${green}, ${blue}, ${0.9 + peak * 0.1})`
        opacity = 1.0
      }

      // Create dynamic gradient for each bar based on its amplitude
      const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight)

      // Lighter at top, darker at bottom with opacity
      const topColor = baseColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
        (_, r, g, b) => `rgba(${Math.min(255, parseInt(r) + 30)}, ${Math.min(255, parseInt(g) + 20)}, ${Math.min(255, parseInt(b) + 20)}, ${opacity})`)
      const bottomColor = baseColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
        (_, r, g, b) => `rgba(${Math.max(0, parseInt(r) - 30)}, ${Math.max(0, parseInt(g) - 20)}, ${Math.max(0, parseInt(b) - 20)}, ${opacity * 0.9})`)

      barGradient.addColorStop(0, topColor)
      barGradient.addColorStop(1, bottomColor)

      ctx.fillStyle = barGradient

      // Draw main bar with enhanced rounded corners and smooth edges (NO SHADOW)
      ctx.beginPath()
      const radius = Math.min(barWidthAdjusted / 2, 3.0) // Larger radius for smoother appearance

      // Create custom rounded rectangle with extra smooth curves
      const x1 = x
      const y1 = y
      const x2 = x + barWidthAdjusted
      const y2 = y + barHeight

      ctx.moveTo(x1 + radius, y1)
      ctx.arcTo(x2, y1, x2, y1 + radius, radius)
      ctx.arcTo(x2, y2, x2 - radius, y2, radius)
      ctx.arcTo(x1, y2, x1, y2 - radius, radius)
      ctx.arcTo(x1, y1, x1 + radius, y1, radius)
      ctx.closePath()
      ctx.fill()
    })

    // Add progress overlay with enhanced dynamic styling
    if (progress !== undefined && progress > 0) {
      const progressPosition = progress * smoothedPeaks.length

      smoothedPeaks.forEach((peak, index) => {
        if (index <= progressPosition) {
          const x = index * barWidth
          const barHeight = Math.min(peak * maxBarHeight, height * 0.7)
          const y = Math.max(0, centerY - barHeight / 2)
          const barWidthAdjusted = Math.max(0.8, barWidth - 0.3)

          // Processed bars get darker, richer red-burgundy tones
          let processedColor: string

          if (peak < 0.2) {
            // Soft rose for quiet processed parts
            processedColor = `rgba(219, 112, 147, ${0.6 + peak * 0.3})` // Pale violet red
          } else if (peak < 0.5) {
            // Rose to burgundy transition for medium processed parts
            const roseToBurgundy = (peak - 0.2) * 3.33 // 0 to 1
            const red = Math.floor(219 - roseToBurgundy * 89) // 219 to 130
            const green = Math.floor(112 - roseToBurgundy * 82) // 112 to 30
            const blue = Math.floor(147 - roseToBurgundy * 117) // 147 to 30
            processedColor = `rgba(${red}, ${green}, ${blue}, ${0.8 + peak * 0.15})`
          } else if (peak < 0.8) {
            // Deep burgundy for loud processed parts
            processedColor = `rgba(128, 0, 32, ${0.85 + peak * 0.1})` // Maroon
          } else {
            // Rich crimson for very loud processed parts
            const intensity = (peak - 0.8) * 5
            const red = Math.floor(128 + intensity * 92) // 128 to 220
            const green = Math.floor(intensity * 20) // 0 to 20
            const blue = Math.floor(32 + intensity * 28) // 32 to 60
            processedColor = `rgba(${red}, ${green}, ${blue}, ${0.9 + peak * 0.1})`
          }

          // Create processed bar gradient
          const processedGradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
          const topProcessed = processedColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
            (_, r, g, b) => `rgba(${Math.min(255, parseInt(r) + 20)}, ${Math.min(255, parseInt(g) + 10)}, ${Math.min(255, parseInt(b) + 20)}, 0.9)`)
          const bottomProcessed = processedColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
            (_, r, g, b) => `rgba(${Math.max(0, parseInt(r) - 20)}, ${Math.max(0, parseInt(g) - 10)}, ${Math.max(0, parseInt(b) - 20)}, 0.8)`)

          processedGradient.addColorStop(0, topProcessed)
          processedGradient.addColorStop(1, bottomProcessed)

          ctx.fillStyle = processedGradient

          // Draw processed bar
          ctx.beginPath()
          const radius = Math.min(barWidthAdjusted / 2, 1)
          ctx.roundRect(x, y, barWidthAdjusted, barHeight, radius)
          ctx.fill()

          // Draw shadow for processed bars (separate from main bar)
          if (peak > 0.15) {
            const shadowOpacity = Math.min(0.5, (peak - 0.15) * 0.6)
            const shadowOffsetX = 1.5
            const shadowOffsetY = 2.5

            // Draw shadow as separate shape
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`
            ctx.beginPath()
            ctx.roundRect(x + shadowOffsetX, y + shadowOffsetY, barWidthAdjusted, barHeight, radius)
            ctx.fill()

            // Reset fill style for main bar
            ctx.fillStyle = processedGradient
          }
        }
      })
    }

    // Draw progress overlay if provided
    if (progress !== undefined && progress > 0) {
      const progressWidth = width * progress

      // Semi-transparent overlay for processed area
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
      ctx.fillRect(0, 0, progressWidth, height)

      // Progress line
      ctx.strokeStyle = '#FF0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressWidth, 0)
      ctx.lineTo(progressWidth, height)
      ctx.stroke()
    }
  }, [])

  return {
    generateWaveformData,
    drawWaveform,
    canvasRef,
    isGenerating
  }
}

export default useWaveform