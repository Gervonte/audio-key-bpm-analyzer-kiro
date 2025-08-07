// Progressive loading utilities for large audio files

import { memoryManager } from './memoryManager'

interface ProgressiveLoadOptions {
  chunkSize?: number
  maxConcurrentChunks?: number
  onProgress?: (progress: number) => void
  onChunkLoaded?: (chunkIndex: number, chunk: ArrayBuffer) => void
}

interface FileChunk {
  index: number
  start: number
  end: number
  size: number
  data?: ArrayBuffer
  loaded: boolean
}

export class ProgressiveLoader {
  private file: File
  private chunks: FileChunk[] = []
  private loadedChunks = new Map<number, ArrayBuffer>()
  private chunkSize: number
  private maxConcurrentChunks: number
  private onProgress?: (progress: number) => void
  private onChunkLoaded?: (chunkIndex: number, chunk: ArrayBuffer) => void
  private abortController?: AbortController

  constructor(file: File, options: ProgressiveLoadOptions = {}) {
    this.file = file
    this.chunkSize = options.chunkSize || this.calculateOptimalChunkSize(file.size)
    this.maxConcurrentChunks = options.maxConcurrentChunks || 3
    this.onProgress = options.onProgress
    this.onChunkLoaded = options.onChunkLoaded
    
    this.initializeChunks()
  }

  /**
   * Calculate optimal chunk size based on file size and available memory
   */
  private calculateOptimalChunkSize(fileSize: number): number {
    const memoryStats = memoryManager.getMemoryStats()
    const availableMemory = memoryStats.current?.jsHeapSizeLimit || 1024 * 1024 * 1024 // 1GB default
    
    // Use 1/20th of available memory or 16MB, whichever is smaller
    const maxChunkSize = Math.min(availableMemory / 20, 16 * 1024 * 1024)
    
    // For small files, use the entire file as one chunk
    if (fileSize <= maxChunkSize / 4) {
      return fileSize
    }
    
    // For large files, calculate chunk size to have reasonable number of chunks
    const targetChunks = Math.ceil(fileSize / maxChunkSize)
    return Math.ceil(fileSize / targetChunks)
  }

  /**
   * Initialize file chunks
   */
  private initializeChunks(): void {
    this.chunks = []
    const totalChunks = Math.ceil(this.file.size / this.chunkSize)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize
      const end = Math.min(start + this.chunkSize, this.file.size)
      
      this.chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        loaded: false
      })
    }
  }

  /**
   * Load all chunks progressively
   */
  async loadAll(): Promise<ArrayBuffer> {
    this.abortController = new AbortController()
    
    try {
      // Load chunks in batches to avoid memory pressure
      const batchSize = this.maxConcurrentChunks
      const totalChunks = this.chunks.length
      
      for (let i = 0; i < totalChunks; i += batchSize) {
        const batch = this.chunks.slice(i, Math.min(i + batchSize, totalChunks))
        
        // Check memory before loading batch
        if (memoryManager.isMemoryPressureHigh()) {
          // Force garbage collection and wait a bit
          memoryManager.forceGarbageCollection()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Load batch concurrently
        await Promise.all(batch.map(chunk => this.loadChunk(chunk)))
        
        // Update progress
        const progress = Math.min(100, ((i + batchSize) / totalChunks) * 100)
        this.onProgress?.(progress)
      }
      
      // Combine all chunks into single ArrayBuffer
      return this.combineChunks()
      
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Load specific chunks (useful for seeking)
   */
  async loadChunks(chunkIndices: number[]): Promise<Map<number, ArrayBuffer>> {
    this.abortController = new AbortController()
    
    const results = new Map<number, ArrayBuffer>()
    
    try {
      const chunksToLoad = chunkIndices
        .filter(index => index >= 0 && index < this.chunks.length)
        .map(index => this.chunks[index])
      
      await Promise.all(chunksToLoad.map(async chunk => {
        const data = await this.loadChunk(chunk)
        results.set(chunk.index, data)
      }))
      
      return results
      
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Load a single chunk
   */
  private async loadChunk(chunk: FileChunk): Promise<ArrayBuffer> {
    if (this.abortController?.signal.aborted) {
      throw new Error('Loading was cancelled')
    }
    
    // Return cached chunk if already loaded
    if (chunk.loaded && this.loadedChunks.has(chunk.index)) {
      return this.loadedChunks.get(chunk.index)!
    }
    
    try {
      const blob = this.file.slice(chunk.start, chunk.end)
      const arrayBuffer = await blob.arrayBuffer()
      
      if (this.abortController?.signal.aborted) {
        throw new Error('Loading was cancelled')
      }
      
      // Store chunk data
      chunk.data = arrayBuffer
      chunk.loaded = true
      this.loadedChunks.set(chunk.index, arrayBuffer)
      
      // Notify chunk loaded
      this.onChunkLoaded?.(chunk.index, arrayBuffer)
      
      return arrayBuffer
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw error
      }
      throw new Error(`Failed to load chunk ${chunk.index}: ${error}`)
    }
  }

  /**
   * Combine all loaded chunks into single ArrayBuffer
   */
  private combineChunks(): ArrayBuffer {
    const totalSize = this.chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const combined = new ArrayBuffer(totalSize)
    const combinedView = new Uint8Array(combined)
    
    let offset = 0
    for (const chunk of this.chunks) {
      if (!chunk.data) {
        throw new Error(`Chunk ${chunk.index} not loaded`)
      }
      
      const chunkView = new Uint8Array(chunk.data)
      combinedView.set(chunkView, offset)
      offset += chunk.size
    }
    
    return combined
  }

  /**
   * Get loading progress
   */
  getProgress(): number {
    const loadedChunks = this.chunks.filter(chunk => chunk.loaded).length
    return this.chunks.length > 0 ? (loadedChunks / this.chunks.length) * 100 : 0
  }

  /**
   * Cancel loading
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.cleanup()
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.loadedChunks.clear()
    this.chunks.forEach(chunk => {
      chunk.data = undefined
      chunk.loaded = false
    })
  }

  /**
   * Get chunk information
   */
  getChunkInfo(): { totalChunks: number; chunkSize: number; loadedChunks: number } {
    return {
      totalChunks: this.chunks.length,
      chunkSize: this.chunkSize,
      loadedChunks: this.chunks.filter(chunk => chunk.loaded).length
    }
  }
}

/**
 * Utility function to load large files progressively
 */
export async function loadLargeFile(
  file: File,
  options: ProgressiveLoadOptions = {}
): Promise<ArrayBuffer> {
  // For small files, use regular loading
  const smallFileThreshold = 50 * 1024 * 1024 // 50MB
  
  if (file.size <= smallFileThreshold) {
    return await file.arrayBuffer()
  }
  
  // Use progressive loading for large files
  const loader = new ProgressiveLoader(file, options)
  
  try {
    return await loader.loadAll()
  } finally {
    loader.cleanup()
  }
}