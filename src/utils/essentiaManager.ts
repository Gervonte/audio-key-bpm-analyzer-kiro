// Singleton manager for essentia.js to avoid multiple initialization attempts
import { EssentiaWASM, Essentia } from 'essentia.js'

class EssentiaManager {
  private static instance: EssentiaManager
  private essentia: Essentia | null = null
  private initializationPromise: Promise<void> | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): EssentiaManager {
    if (!EssentiaManager.instance) {
      EssentiaManager.instance = new EssentiaManager()
    }
    return EssentiaManager.instance
  }

  async getEssentia(): Promise<Essentia> {
    if (this.essentia && this.isInitialized) {
      return this.essentia
    }

    if (this.initializationPromise) {
      await this.initializationPromise
      if (this.essentia) {
        return this.essentia
      }
    }

    this.initializationPromise = this.initialize()
    await this.initializationPromise

    if (!this.essentia) {
      throw new Error('Failed to initialize essentia.js')
    }

    return this.essentia
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set a timeout for initialization
      const timeout = setTimeout(() => {
        reject(new Error('Essentia.js initialization timed out after 5 seconds'))
      }, 5000)

      try {
        if (EssentiaWASM.calledRun) {
          // WASM is already loaded
          clearTimeout(timeout)
          this.essentia = new Essentia(EssentiaWASM)
          this.isInitialized = true
          resolve()
        } else {
          // Wait for WASM to load
          const originalCallback = EssentiaWASM.onRuntimeInitialized
          EssentiaWASM.onRuntimeInitialized = () => {
            try {
              clearTimeout(timeout)
              this.essentia = new Essentia(EssentiaWASM)
              this.isInitialized = true
              resolve()
              // Restore original callback if it existed
              if (originalCallback) {
                originalCallback()
              }
            } catch (error) {
              clearTimeout(timeout)
              reject(error)
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  reset(): void {
    if (this.essentia) {
      try {
        this.essentia.shutdown()
        ;(this.essentia as any).delete()
      } catch (error) {
        console.warn('Error cleaning up essentia instance:', error)
      }
    }
    this.essentia = null
    this.initializationPromise = null
    this.isInitialized = false
  }
}

export const essentiaManager = EssentiaManager.getInstance()