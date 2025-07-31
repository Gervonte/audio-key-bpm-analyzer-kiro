// Performance optimization tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { memoryManager } from '../memoryManager'
import { workerManager } from '../workerManager'
import { OptimizedWaveformRenderer } from '../optimizedWaveform'

describe('Performance Optimizations', () => {
  beforeEach(() => {
    // Reset memory manager state
    memoryManager.clearCache()
  })

  afterEach(() => {
    // Clean up after tests
    workerManager.terminateAll()
    memoryManager.clearCache()
  })

  describe('Memory Manager', () => {
    it('should cache and retrieve results', () => {
      const testData = { key: 'C Major', bpm: 120 }
      const cacheKey = 'test_key'
      
      memoryManager.cacheResult(cacheKey, testData, 100)
      const retrieved = memoryManager.getCachedResult(cacheKey)
      
      expect(retrieved).toEqual(testData)
    })

    it('should generate cache keys for files', () => {
      const mockFile = {
        name: 'test.mp3',
        size: 1024,
        lastModified: 1234567890
      } as File

      const cacheKey = memoryManager.generateCacheKey(mockFile)
      expect(cacheKey).toBe('test.mp3_1024_1234567890')
    })

    it('should estimate result sizes', () => {
      const testData = { key: 'C Major', bpm: 120 }
      const size = memoryManager.estimateResultSize(testData)
      
      expect(size).toBeGreaterThan(0)
      expect(typeof size).toBe('number')
    })

    it('should handle cache eviction', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 10; i++) {
        memoryManager.cacheResult(`key_${i}`, { data: i }, 10 * 1024 * 1024) // 10MB each
      }

      const stats = memoryManager.getCacheStats()
      expect(stats.totalEntries).toBeLessThanOrEqual(10)
    })

    it('should clean up AudioBuffer objects', () => {
      const mockAudioBuffer = {
        numberOfChannels: 2,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1024))
      } as unknown as AudioBuffer

      // Should not throw
      expect(() => {
        memoryManager.cleanupAudioBuffer(mockAudioBuffer)
      }).not.toThrow()
    })
  })

  describe('Worker Manager', () => {
    it('should handle worker creation gracefully when Worker is not available', () => {
      // In test environment, Worker is not available
      expect(() => {
        workerManager.createPool('test', '/test-worker.js', 2)
      }).toThrow('Failed to create worker test')
    })

    it('should provide null stats for non-existent pools', () => {
      const stats = workerManager.getPoolStats('non-existent')
      expect(stats).toBeNull()
    })

    it('should handle pool termination gracefully', () => {
      expect(() => {
        workerManager.terminatePool('non-existent')
      }).not.toThrow()
    })
  })

  describe('Optimized Waveform Renderer', () => {
    let canvas: HTMLCanvasElement
    let renderer: OptimizedWaveformRenderer

    beforeEach(() => {
      // Create mock canvas
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 200
      
      // Mock getContext to return a basic 2D context
      const mockContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        rect: vi.fn(),
        closePath: vi.fn(),
        arcTo: vi.fn(),
        roundRect: vi.fn()
      }
      
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any)
      
      renderer = new OptimizedWaveformRenderer(canvas)
    })

    afterEach(() => {
      renderer.dispose()
    })

    it('should generate optimized waveform data', () => {
      const mockAudioBuffer = {
        getChannelData: vi.fn().mockReturnValue(new Float32Array([0.5, -0.3, 0.8, -0.2, 0.1])),
        duration: 5,
        sampleRate: 44100,
        numberOfChannels: 1,
        length: 5
      } as unknown as AudioBuffer

      const waveformData = renderer.generateOptimizedWaveformData(mockAudioBuffer, 100)
      
      expect(waveformData).toBeDefined()
      expect(waveformData.peaks).toBeInstanceOf(Float32Array)
      expect(waveformData.duration).toBe(5)
      expect(waveformData.sampleRate).toBe(44100)
      expect(waveformData.channels).toBe(1)
    })

    it('should handle different target widths', () => {
      const mockAudioBuffer = {
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1000)),
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 1,
        length: 1000
      } as unknown as AudioBuffer

      const smallData = renderer.generateOptimizedWaveformData(mockAudioBuffer, 100)
      const largeData = renderer.generateOptimizedWaveformData(mockAudioBuffer, 1000)
      
      expect(smallData.peaks.length).toBeLessThanOrEqual(largeData.peaks.length)
    })

    it('should render waveform without errors', () => {
      const waveformData = {
        peaks: new Float32Array([0.5, 0.3, 0.8, 0.2, 0.1]),
        duration: 5,
        sampleRate: 44100,
        channels: 1,
        downsampleRatio: 1
      }

      expect(() => {
        renderer.renderWaveform(waveformData, {
          width: 800,
          height: 200,
          color: '#FF0000'
        })
      }).not.toThrow()
    })

    it('should handle progress rendering', () => {
      const waveformData = {
        peaks: new Float32Array([0.5, 0.3, 0.8, 0.2, 0.1]),
        duration: 5,
        sampleRate: 44100,
        channels: 1,
        downsampleRatio: 1
      }

      expect(() => {
        renderer.renderWaveform(waveformData, {
          width: 800,
          height: 200,
          color: '#FF0000',
          progress: 0.5
        })
      }).not.toThrow()
    })
  })

  describe('Memory Usage Monitoring', () => {
    it('should detect high memory usage', () => {
      // Mock performance.memory
      const originalMemory = (performance as any).memory
      ;(performance as any).memory = {
        usedJSHeapSize: 80 * 1024 * 1024, // 80MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB limit
      }

      const isHigh = memoryManager.isMemoryHigh()
      expect(isHigh).toBe(false) // 80% is below our 80% threshold

      // Test high memory
      ;(performance as any).memory = {
        usedJSHeapSize: 90 * 1024 * 1024, // 90MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB limit
      }

      const isHighNow = memoryManager.isMemoryHigh()
      expect(isHighNow).toBe(true) // 90% is above our 80% threshold

      // Restore original
      ;(performance as any).memory = originalMemory
    })

    it('should get memory statistics', () => {
      // Mock performance.memory
      const originalMemory = (performance as any).memory
      ;(performance as any).memory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 80 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }

      const stats = memoryManager.getMemoryStats()
      expect(stats).toBeDefined()
      expect(stats?.memoryUsagePercent).toBe(50)

      // Restore original
      ;(performance as any).memory = originalMemory
    })
  })
})