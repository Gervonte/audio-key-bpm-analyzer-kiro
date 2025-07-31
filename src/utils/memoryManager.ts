// Memory management utilities for audio processing

export interface MemoryStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  memoryUsagePercent: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  size: number
  accessCount: number
  lastAccessed: number
}

export class MemoryManager {
  private static instance: MemoryManager
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxCacheSize: number = 100 * 1024 * 1024 // 100MB default
  private currentCacheSize: number = 0
  private gcThreshold: number = 0.8 // Trigger GC at 80% memory usage
  private cleanupInterval: number | null = null

  private constructor() {
    this.startMemoryMonitoring()
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
    return null
  }

  /**
   * Check if memory usage is high
   */
  isMemoryHigh(): boolean {
    const stats = this.getMemoryStats()
    if (!stats) return false
    return stats.memoryUsagePercent > this.gcThreshold * 100
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
        console.log('Manual garbage collection triggered')
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error)
      }
    }
  }

  /**
   * Clean up AudioBuffer objects
   */
  cleanupAudioBuffer(audioBuffer: AudioBuffer | null): void {
    if (!audioBuffer) return

    try {
      // Clear channel data references
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channelData = audioBuffer.getChannelData(i)
        if (channelData) {
          // Clear the array data
          channelData.fill(0)
        }
      }
    } catch (error) {
      console.warn('Error cleaning up AudioBuffer:', error)
    }
  }

  /**
   * Cache analysis results with size tracking
   */
  cacheResult<T>(key: string, data: T, estimatedSize: number = 0): void {
    // Remove existing entry if it exists
    this.removeCacheEntry(key)

    // Check if we need to free up space
    if (this.currentCacheSize + estimatedSize > this.maxCacheSize) {
      this.evictLeastRecentlyUsed(estimatedSize)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size: estimatedSize,
      accessCount: 1,
      lastAccessed: Date.now()
    }

    this.cache.set(key, entry)
    this.currentCacheSize += estimatedSize
  }

  /**
   * Get cached result
   */
  getCachedResult<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    return entry.data
  }

  /**
   * Remove cache entry
   */
  removeCacheEntry(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentCacheSize -= entry.size
      this.cache.delete(key)
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
    this.currentCacheSize = 0
  }

  /**
   * Evict least recently used entries to free up space
   */
  private evictLeastRecentlyUsed(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    let freedSpace = 0
    for (const [key, entry] of entries) {
      this.removeCacheEntry(key)
      freedSpace += entry.size

      if (freedSpace >= requiredSpace) {
        break
      }
    }
  }

  /**
   * Generate cache key for audio file
   */
  generateCacheKey(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`
  }

  /**
   * Estimate size of analysis result
   */
  estimateResultSize(result: any): number {
    try {
      return JSON.stringify(result).length * 2 // Rough estimate
    } catch {
      return 1024 // Default 1KB if can't estimate
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      const stats = this.getMemoryStats()
      if (stats && stats.memoryUsagePercent > this.gcThreshold * 100) {
        console.log(`High memory usage detected: ${stats.memoryUsagePercent.toFixed(1)}%`)
        
        // Clear old cache entries
        this.evictOldEntries()
        
        // Force GC if available
        this.forceGarbageCollection()
      }
    }, 10000) // Check every 10 seconds
  }

  /**
   * Evict entries older than 5 minutes
   */
  private evictOldEntries(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const keysToRemove: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < fiveMinutesAgo) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => this.removeCacheEntry(key))
    
    if (keysToRemove.length > 0) {
      console.log(`Evicted ${keysToRemove.length} old cache entries`)
    }
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      usagePercent: (this.currentCacheSize / this.maxCacheSize) * 100
    }
  }
}

// Global memory manager instance
export const memoryManager = MemoryManager.getInstance()