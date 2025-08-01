// Type declarations for essentia.js
declare module 'essentia.js' {
  export interface VectorFloat {
    // Vector float type from essentia.js
  }

  export interface EssentiaWASM {
    // WASM module interface
  }

  export class Essentia {
    constructor(wasmModule: any, isDebug?: boolean)
    
    // Core methods
    audioBufferToMonoSignal(buffer: AudioBuffer): Float32Array
    arrayToVector(array: Float32Array): VectorFloat
    vectorToArray(vector: VectorFloat): Float32Array
    shutdown(): void
    
    // Key detection algorithms
    Key(signal: VectorFloat): {
      key: string
      scale: string
      strength: number
      firstToSecondRelativeStrength: number
    }
    
    KeyExtractor(signal: VectorFloat): {
      key: string
      scale: string
      strength: number
    }
    
    // Beat tracking algorithms
    BeatTrackerDegara(signal: VectorFloat, maxTempo?: number, minTempo?: number): {
      ticks: VectorFloat
    }
    
    BeatTrackerMultiFeature(signal: VectorFloat, maxTempo?: number, minTempo?: number): {
      ticks: VectorFloat
      confidence: number
    }
    
    // Tempo algorithms
    TempoTap(signal: VectorFloat): {
      periods: VectorFloat
      phases: VectorFloat
    }
  }

  export const EssentiaWASM: any
}