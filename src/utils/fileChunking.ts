// File chunking utilities for very large audio files

import { memoryManager } from './memoryManager'

interface ChunkingOptions {
  maxChunkSize?: number
  onProgress?: (progress: number) => void
  onChunkProcessed?: (chunkIndex: number, result: any) => void
}

interface FileChunk {
  index: number
  start: number
  end: number
  size: number
  blob: Blob
}

export class FileChunker {
  private file: File
  private chunks: FileChunk[] = []
  private maxChunkSize: number

  constructor(file: File, maxChunkSize?: number) {
    this.file = file
    this.maxChunkSize = maxChunkSize || this.calculateOptimalChunkSize()
    this.initializeChunks()
  }

  /**
   * Calculate optimal chunk size based on available memory and file size
   */
  private calculateOptimalChunkSize(): number {
    const memoryStats = memoryManager.getMemoryStats()
    const availableMemory = memoryStats.current?.jsHeapSizeLimit || 1024 * 1024 * 1024 // 1GB default
    
    // Use 1/10th of available memory or 32MB, whichever is smaller
    const maxSafeChunkSize = Math.min(availableMemory / 10, 32 * 1024 * 1024)
    
    // For very large files (>500MB), use smaller chunks
    if (this.file.size > 500 * 1024 * 1024) {
      return Math.min(maxSafeChunkSize, 16 * 1024 * 1024) // 16MB max for very large files
    }
    
    // For medium files (100-500MB), use medium chunks
    if (this.file.size > 100 * 1024 * 1024) {
      return Math.min(maxSafeChunkSize, 24 * 1024 * 1024) // 24MB max for medium files
    }
    
    // For smaller files, use the full safe chunk size
    return maxSafeChunkSize
  }

  /**
   * Initialize file chunks
   */
  private initializeChunks(): void {
    this.chunks = []
    const totalChunks = Math.ceil(this.file.size / this.maxChunkSize)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.maxChunkSize
      const end = Math.min(start + this.maxChunkSize, this.file.size)
      const size = end - start
      const blob = this.file.slice(start, end)
      
      this.chunks.push({
        index: i,
        start,
        end,
        size,
        blob
      })
    }
  }

  /**
   * Process file in chunks with a processing function
   */
  async processInChunks<T>(
    processingFunction: (chunk: ArrayBuffer, chunkIndex: number) => Promise<T>,
    options: ChunkingOptions = {}
  ): Promise<T[]> {
    const { onProgress, onChunkProcessed } = options
    const results: T[] = []
    
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]
      
      // Check memory before processing each chunk
      if (memoryManager.isMemoryPressureHigh()) {
        memoryManager.forceGarbageCollection()
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      try {
        // Convert chunk to ArrayBuffer
        const arrayBuffer = await chunk.blob.arrayBuffer()
        
        // Process the chunk
        const result = await processingFunction(arrayBuffer, i)
        results.push(result)
        
        // Notify chunk processed
        onChunkProcessed?.(i, result)
        
        // Update progress
        const progress = ((i + 1) / this.chunks.length) * 100
        onProgress?.(progress)
        
      } catch (error) {
        console.error(`Failed to process chunk ${i}:`, error)
        throw new Error(`Chunk processing failed at chunk ${i}: ${error}`)
      }
    }
    
    return results
  }

  /**
   * Combine chunks back into a single ArrayBuffer
   */
  async combineChunks(): Promise<ArrayBuffer> {
    const totalSize = this.file.size
    const combined = new ArrayBuffer(totalSize)
    const combinedView = new Uint8Array(combined)
    
    let offset = 0
    
    for (const chunk of this.chunks) {
      const chunkBuffer = await chunk.blob.arrayBuffer()
      const chunkView = new Uint8Array(chunkBuffer)
      
      combinedView.set(chunkView, offset)
      offset += chunk.size
    }
    
    return combined
  }

  /**
   * Get chunk information
   */
  getChunkInfo(): {
    totalChunks: number
    chunkSize: number
    totalSize: number
    estimatedMemoryUsage: number
  } {
    return {
      totalChunks: this.chunks.length,
      chunkSize: this.maxChunkSize,
      totalSize: this.file.size,
      estimatedMemoryUsage: this.maxChunkSize * 2 // Rough estimate for processing overhead
    }
  }

  /**
   * Check if file should be processed in chunks
   */
  static shouldUseChunking(file: File): boolean {
    const memoryStats = memoryManager.getMemoryStats()
    const availableMemory = memoryStats.current?.jsHeapSizeLimit || 1024 * 1024 * 1024
    
    // Use chunking if file is larger than 1/4 of available memory or 100MB
    const chunkingThreshold = Math.min(availableMemory / 4, 100 * 1024 * 1024)
    
    return file.size > chunkingThreshold
  }

  /**
   * Estimate processing time based on file size and system performance
   */
  static estimateProcessingTime(file: File): number {
    // Base processing time: ~1 second per 10MB
    const baseTimePerMB = 0.1 // seconds
    const fileSizeMB = file.size / (1024 * 1024)
    
    // Adjust based on memory pressure
    const memoryStats = memoryManager.getMemoryStats()
    let memoryMultiplier = 1
    
    if (memoryStats.memoryPressure === 'high') {
      memoryMultiplier = 2.5
    } else if (memoryStats.memoryPressure === 'medium') {
      memoryMultiplier = 1.5
    }
    
    // Adjust based on file size (larger files take proportionally longer)
    let sizeMultiplier = 1
    if (fileSizeMB > 500) {
      sizeMultiplier = 1.8
    } else if (fileSizeMB > 200) {
      sizeMultiplier = 1.4
    } else if (fileSizeMB > 100) {
      sizeMultiplier = 1.2
    }
    
    return Math.ceil(fileSizeMB * baseTimePerMB * memoryMultiplier * sizeMultiplier)
  }
}

/**
 * Utility function to process large files with automatic chunking
 */
export async function processLargeFile<T>(
  file: File,
  processingFunction: (chunk: ArrayBuffer, chunkIndex: number) => Promise<T>,
  options: ChunkingOptions = {}
): Promise<T[]> {
  if (!FileChunker.shouldUseChunking(file)) {
    // Process as single chunk
    const arrayBuffer = await file.arrayBuffer()
    const result = await processingFunction(arrayBuffer, 0)
    return [result]
  }
  
  // Use chunking for large files
  const chunker = new FileChunker(file)
  return await chunker.processInChunks(processingFunction, options)
}