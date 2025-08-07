// Memory management utilities for audio processing

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface MemoryStats {
  current: MemoryInfo | null
  peak: MemoryInfo | null
  isLowMemory: boolean
  availableMemory: number
  memoryPressure: 'low' | 'medium' | 'high'
}

export class MemoryManager {
  private memoryCheckInterval: number | null = null
  private memoryStats: MemoryStats = {
    current: null,
    peak: null,
    isLowMemory: false,
    availableMemory: 0,
    memoryPressure: 'low'
  }
  private listeners: Array<(stats: MemoryStats) => void> = []

  constructor() {
    this.startMonitoring()
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.memoryCheckInterval) {
      return
    }

    this.updateMemoryStats()
    this.memoryCheckInterval = window.setInterval(() => {
      this.updateMemoryStats()
    }, 2000) // Check every 2 seconds
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    this.updateMemoryStats()
    return { ...this.memoryStats }
  }

  /**
   * Check if system is under memory pressure
   */
  isMemoryPressureHigh(): boolean {
    return this.memoryStats.memoryPressure === 'high'
  }

  /**
   * Check if we have enough memory for processing
   */
  hasEnoughMemoryForProcessing(estimatedMemoryNeeded: number): boolean {
    const stats = this.getMemoryStats()
    if (!stats.current) {
      return true // Assume we have enough if we can't measure
    }

    const availableMemory = stats.current.jsHeapSizeLimit - stats.current.usedJSHeapSize
    return availableMemory > estimatedMemoryNeeded * 1.5 // 50% safety margin
  }

  /**
   * Estimate memory needed for audio buffer
   */
  estimateAudioBufferMemory(audioBuffer: AudioBuffer): number {
    // Each sample is 4 bytes (Float32), multiply by channels and length
    return audioBuffer.numberOfChannels * audioBuffer.length * 4
  }

  /**
   * Estimate memory needed for waveform data
   */
  estimateWaveformMemory(peakCount: number): number {
    // Each peak is a Float32 (4 bytes) plus some overhead
    return peakCount * 4 + 1000
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    // Try to trigger garbage collection
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error)
      }
    }

    // Alternative: create and release large objects to encourage GC
    try {
      const largeArray = new Array(1000000).fill(0)
      largeArray.length = 0
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Add memory stats listener
   */
  addListener(listener: (stats: MemoryStats) => void): void {
    this.listeners.push(listener)
  }

  /**
   * Remove memory stats listener
   */
  removeListener(listener: (stats: MemoryStats) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    if (!('memory' in performance)) {
      return
    }

    try {
      const memory = (performance as any).memory as MemoryInfo
      const current: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }

      // Update peak memory usage
      if (!this.memoryStats.peak || current.usedJSHeapSize > this.memoryStats.peak.usedJSHeapSize) {
        this.memoryStats.peak = { ...current }
      }

      // Calculate memory pressure
      const usageRatio = current.usedJSHeapSize / current.jsHeapSizeLimit
      let memoryPressure: 'low' | 'medium' | 'high'
      
      if (usageRatio > 0.85) {
        memoryPressure = 'high'
      } else if (usageRatio > 0.7) {
        memoryPressure = 'medium'
      } else {
        memoryPressure = 'low'
      }

      // Update stats
      this.memoryStats = {
        current,
        peak: this.memoryStats.peak,
        isLowMemory: usageRatio > 0.8,
        availableMemory: current.jsHeapSizeLimit - current.usedJSHeapSize,
        memoryPressure
      }

      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.memoryStats)
        } catch (error) {
          console.warn('Memory stats listener error:', error)
        }
      })

      // Auto garbage collection on high memory pressure
      if (memoryPressure === 'high') {
        this.forceGarbageCollection()
      }

    } catch (error) {
      console.warn('Failed to update memory stats:', error)
    }
  }

  /**
   * Format memory size for display
   */
  static formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    if (!this.memoryStats.current) {
      return 0
    }

    return (this.memoryStats.current.usedJSHeapSize / this.memoryStats.current.jsHeapSizeLimit) * 100
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  memoryManager.stopMonitoring()
})