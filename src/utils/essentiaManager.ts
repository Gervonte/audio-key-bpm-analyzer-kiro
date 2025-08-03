// Singleton manager for essentia.js to avoid multiple initialization attempts
import { EssentiaWASM, Essentia } from 'essentia.js'

class EssentiaManager {
  private static instance: EssentiaManager
  private essentia: Essentia | null = null
  private initializationPromise: Promise<void> | null = null
  private isInitialized = false

  private constructor() { }

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
        console.log('Attempting essentia.js initialization...')
        
        // Use the working method: nested EssentiaWASM.EssentiaWASM with Essentia constructor
        const wasmAny = EssentiaWASM as any
        if (wasmAny.EssentiaWASM && typeof Essentia !== 'undefined') {
          console.log('Using nested EssentiaWASM.EssentiaWASM with Essentia constructor')
          clearTimeout(timeout)
          this.essentia = new (Essentia as any)(wasmAny.EssentiaWASM, false)
          this.isInitialized = true
          console.log('Essentia instance created successfully!')
          resolve()
          return
        }

        // Fallback: Wait for runtime initialization if not ready
        if (!EssentiaWASM.calledRun) {
          console.log('Waiting for WASM runtime initialization...')
          const originalCallback = EssentiaWASM.onRuntimeInitialized
          EssentiaWASM.onRuntimeInitialized = () => {
            try {
              console.log('Runtime initialized, creating Essentia instance...')
              this.essentia = new (Essentia as any)((EssentiaWASM as any).EssentiaWASM, false)
              clearTimeout(timeout)
              this.isInitialized = true
              console.log('Essentia instance created successfully after runtime init!')
              resolve()

              // Restore original callback if it existed
              if (originalCallback && typeof originalCallback === 'function') {
                originalCallback()
              }
            } catch (error) {
              clearTimeout(timeout)
              console.error('Error during runtime initialization:', error)
              reject(error)
            }
          }
        } else {
          clearTimeout(timeout)
          reject(new Error('EssentiaWASM.EssentiaWASM not available and runtime already initialized'))
        }

      } catch (error) {
        clearTimeout(timeout)
        console.error('Error during essentia.js initialization:', error)
        reject(error)
      }
    })
  }

  reset(): void {
    if (this.essentia) {
      try {
        this.essentia.shutdown()
          ; (this.essentia as any).delete()
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