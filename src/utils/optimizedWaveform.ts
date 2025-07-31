// Optimized waveform rendering for large audio files

export interface WaveformRenderOptions {
    width: number
    height: number
    color: string
    backgroundColor?: string
    progress?: number
    maxPeaks?: number
    downsampleRatio?: number
    useWebGL?: boolean
}

export interface OptimizedWaveformData {
    peaks: Float32Array
    duration: number
    sampleRate: number
    channels: number
    downsampleRatio: number
}

export class OptimizedWaveformRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D | null = null
    private webglCtx: WebGLRenderingContext | null = null
    private animationFrameId: number | null = null
    private lastRenderTime: number = 0
    private renderThrottle: number = 16 // ~60fps

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.initializeContext()
    }

    /**
     * Initialize rendering context (prefer WebGL for large datasets)
     */
    private initializeContext(): void {
        // Try WebGL first for better performance with large datasets
        try {
            this.webglCtx = this.canvas.getContext('webgl') as WebGLRenderingContext ||
                this.canvas.getContext('experimental-webgl') as WebGLRenderingContext
        } catch (error) {
            console.warn('WebGL not available, falling back to 2D canvas')
        }

        // Always have 2D context as fallback
        this.ctx = this.canvas.getContext('2d')
        if (!this.ctx) {
            throw new Error('Unable to get 2D rendering context')
        }
    }

    /**
     * Generate optimized waveform data with intelligent downsampling
     */
    generateOptimizedWaveformData(
        audioBuffer: AudioBuffer,
        targetWidth: number = 1000,
        maxPeaks: number = 2000
    ): OptimizedWaveformData {
        const channelData = audioBuffer.getChannelData(0)
        const samples = channelData.length
        const duration = audioBuffer.duration
        const sampleRate = audioBuffer.sampleRate
        const channels = audioBuffer.numberOfChannels

        // Calculate optimal downsampling
        const idealPeaks = Math.min(maxPeaks, targetWidth * 2)
        const downsampleRatio = Math.max(1, Math.floor(samples / idealPeaks))
        const actualPeaks = Math.floor(samples / downsampleRatio)

        // Use Float32Array for better performance
        const peaks = new Float32Array(actualPeaks)

        // Optimized peak extraction with SIMD-like operations where possible
        for (let i = 0; i < actualPeaks; i++) {
            const start = i * downsampleRatio
            const end = Math.min(start + downsampleRatio, samples)

            let peak = 0

            // Unroll loop for better performance on small segments
            if (downsampleRatio <= 8) {
                for (let j = start; j < end; j++) {
                    const abs = Math.abs(channelData[j])
                    if (abs > peak) peak = abs
                }
            } else {
                // For larger segments, use stride optimization
                const stride = Math.max(1, Math.floor(downsampleRatio / 8))
                for (let j = start; j < end; j += stride) {
                    const abs = Math.abs(channelData[j])
                    if (abs > peak) peak = abs
                }
            }

            peaks[i] = peak
        }

        return {
            peaks,
            duration,
            sampleRate,
            channels,
            downsampleRatio
        }
    }

    /**
     * Render waveform with performance optimizations
     */
    renderWaveform(
        waveformData: OptimizedWaveformData,
        options: WaveformRenderOptions
    ): void {
        // Throttle rendering to avoid excessive redraws
        const now = performance.now()
        if (now - this.lastRenderTime < this.renderThrottle) {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId)
            }

            this.animationFrameId = requestAnimationFrame(() => {
                this.renderWaveform(waveformData, options)
            })
            return
        }

        this.lastRenderTime = now

        // Use WebGL for large datasets if available
        if (this.webglCtx && waveformData.peaks.length > 5000 && options.useWebGL !== false) {
            this.renderWithWebGL(waveformData, options)
        } else {
            this.renderWith2D(waveformData, options)
        }
    }

    /**
     * Render using 2D canvas with optimizations
     */
    private renderWith2D(
        waveformData: OptimizedWaveformData,
        options: WaveformRenderOptions
    ): void {
        if (!this.ctx) return

        const { width, height, color, backgroundColor, progress } = options
        const { peaks } = waveformData

        // Set canvas size
        this.canvas.width = width
        this.canvas.height = height

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height)

        if (backgroundColor) {
            this.ctx.fillStyle = backgroundColor
            this.ctx.fillRect(0, 0, width, height)
        }

        if (peaks.length === 0) return

        const barWidth = width / peaks.length
        const centerY = height / 2
        const maxBarHeight = height * 0.8

        // Optimize for different bar widths
        if (barWidth >= 2) {
            // Wide bars - use individual rectangles with gradients
            this.renderWideBars(peaks, barWidth, centerY, maxBarHeight, color, progress)
        } else {
            // Narrow bars - use path-based rendering for better performance
            this.renderNarrowBars(peaks, barWidth, centerY, maxBarHeight, color, progress)
        }
    }

    /**
     * Render wide bars with gradients
     */
    private renderWideBars(
        peaks: Float32Array,
        barWidth: number,
        centerY: number,
        maxBarHeight: number,
        color: string,
        progress?: number
    ): void {
        if (!this.ctx) return

        for (let i = 0; i < peaks.length; i++) {
            const peak = peaks[i]
            const x = i * barWidth
            const barHeight = Math.min(peak * maxBarHeight, maxBarHeight)
            const y = centerY - barHeight / 2

            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight)
            gradient.addColorStop(0, this.lightenColor(color, 0.3))
            gradient.addColorStop(1, this.darkenColor(color, 0.2))

            this.ctx.fillStyle = gradient
            this.ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight)

            // Progress overlay
            if (progress !== undefined && i / peaks.length <= progress) {
                this.ctx.fillStyle = this.darkenColor(color, 0.4)
                this.ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight)
            }
        }
    }

    /**
     * Render narrow bars using path for better performance
     */
    private renderNarrowBars(
        peaks: Float32Array,
        barWidth: number,
        centerY: number,
        maxBarHeight: number,
        color: string,
        progress?: number
    ): void {
        if (!this.ctx) return

        // Create path for all bars at once
        this.ctx.beginPath()
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = Math.max(0.5, barWidth)

        for (let i = 0; i < peaks.length; i++) {
            const peak = peaks[i]
            const x = i * barWidth + barWidth / 2
            const barHeight = Math.min(peak * maxBarHeight, maxBarHeight)

            this.ctx.moveTo(x, centerY - barHeight / 2)
            this.ctx.lineTo(x, centerY + barHeight / 2)
        }

        this.ctx.stroke()

        // Progress overlay
        if (progress !== undefined && progress > 0) {
            const progressWidth = this.canvas.width * progress

            this.ctx.save()
            this.ctx.beginPath()
            this.ctx.rect(0, 0, progressWidth, this.canvas.height)
            this.ctx.clip()

            this.ctx.beginPath()
            this.ctx.strokeStyle = this.darkenColor(color, 0.4)
            this.ctx.lineWidth = Math.max(0.5, barWidth)

            for (let i = 0; i < peaks.length; i++) {
                const peak = peaks[i]
                const x = i * barWidth + barWidth / 2
                const barHeight = Math.min(peak * maxBarHeight, maxBarHeight)

                this.ctx.moveTo(x, centerY - barHeight / 2)
                this.ctx.lineTo(x, centerY + barHeight / 2)
            }

            this.ctx.stroke()
            this.ctx.restore()
        }
    }

    /**
     * Render using WebGL for maximum performance (simplified implementation)
     */
    private renderWithWebGL(
        waveformData: OptimizedWaveformData,
        options: WaveformRenderOptions
    ): void {
        // WebGL implementation would go here for very large datasets
        // For now, fall back to 2D rendering
        console.log('WebGL rendering not yet implemented, falling back to 2D')
        this.renderWith2D(waveformData, options)
    }

    /**
     * Utility function to lighten a color
     */
    private lightenColor(color: string, amount: number): string {
        // Simple color lightening - in production, use a proper color library
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16)
            const r = Math.min(255, Math.floor((num >> 16) + 255 * amount))
            const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + 255 * amount))
            const b = Math.min(255, Math.floor((num & 0x0000FF) + 255 * amount))
            return `rgb(${r}, ${g}, ${b})`
        }
        return color
    }

    /**
     * Utility function to darken a color
     */
    private darkenColor(color: string, amount: number): string {
        // Simple color darkening - in production, use a proper color library
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16)
            const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)))
            const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)))
            const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)))
            return `rgb(${r}, ${g}, ${b})`
        }
        return color
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
    }
}