// Audio analysis caching system for performance optimization

import type { AnalysisResult } from '../types'

interface CacheEntry {
  result: AnalysisResult
  timestamp: number
  fileHash: string
  fileSize: number
  lastModified: number
}

interface CacheStats {
  hits: number
  misses: number
  totalEntries: number
  memoryUsage: number
}

export class AudioCache {
  private cache = new Map<string, CacheEntry>()
  private maxEntries: number
  private maxAge: number // in milliseconds
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalEntries: 0,
    memoryUsage: 0
  }

  constructor(maxEntries = 50, maxAgeHours = 24) {
    this.maxEntries = maxEntries
    this.maxAge = maxAgeHours * 60 * 60 * 1000
  }

  /**
   * Generate a cache key from file properties
   */
  private generateCacheKey(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`
  }

  /**
   * Generate a simple hash from file content (first and last chunks)
   */
  private async generateFileHash(file: File): Promise<string> {
    const chunkSize = 8192 // 8KB chunks
    const chunks: ArrayBuffer[] = []

    // Read first chunk
    if (file.size > 0) {
      const firstChunk = file.slice(0, Math.min(chunkSize, file.size))
      chunks.push(await firstChunk.arrayBuffer())
    }

    // Read last chunk if file is large enough
    if (file.size > chunkSize) {
      const lastChunk = file.slice(Math.max(0, file.size - chunkSize))
      chunks.push(await lastChunk.arrayBuffer())
    }

    // Create simple hash from chunks
    let hash = 0
    for (const chunk of chunks) {
      const view = new Uint8Array(chunk)
      for (let i = 0; i < view.length; i++) {
        hash = ((hash << 5) - hash + view[i]) & 0xffffffff
      }
    }

    return hash.toString(36)
  }

  /**
   * Check if a cached result exists for the file
   */
  async has(file: File): Promise<boolean> {
    const key = this.generateCacheKey(file)
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      this.updateStats()
      return false
    }

    // Verify file hasn't changed by comparing hash
    try {
      const currentHash = await this.generateFileHash(file)
      if (currentHash !== entry.fileHash) {
        this.cache.delete(key)
        this.updateStats()
        return false
      }
    } catch (error) {
      // If we can't generate hash, assume file changed
      this.cache.delete(key)
      this.updateStats()
      return false
    }

    return true
  }

  /**
   * Get cached analysis result
   */
  async get(file: File): Promise<AnalysisResult | null> {
    const key = this.generateCacheKey(file)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      this.updateStats()
      this.stats.misses++
      return null
    }

    // Verify file hasn't changed
    try {
      const currentHash = await this.generateFileHash(file)
      if (currentHash !== entry.fileHash) {
        this.cache.delete(key)
        this.updateStats()
        this.stats.misses++
        return null
      }
    } catch (error) {
      this.cache.delete(key)
      this.updateStats()
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.result
  }

  /**
   * Store analysis result in cache
   */
  async set(file: File, result: AnalysisResult): Promise<void> {
    const key = this.generateCacheKey(file)

    try {
      const fileHash = await this.generateFileHash(file)
      
      const entry: CacheEntry = {
        result,
        timestamp: Date.now(),
        fileHash,
        fileSize: file.size,
        lastModified: file.lastModified
      }

      // Remove oldest entries if cache is full
      if (this.cache.size >= this.maxEntries) {
        this.evictOldest()
      }

      this.cache.set(key, entry)
      this.updateStats()
    } catch (error) {
      console.warn('Failed to cache analysis result:', error)
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
    this.updateStats()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
    this.updateStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0
    for (const entry of this.cache.values()) {
      // Rough estimate: result object + metadata
      memoryUsage += JSON.stringify(entry.result).length * 2 + 200
    }
    this.stats.memoryUsage = memoryUsage
  }
}

// Global cache instance
export const audioCache = new AudioCache()

// Cleanup expired entries periodically
setInterval(() => {
  audioCache.cleanup()
}, 5 * 60 * 1000) // Every 5 minutes