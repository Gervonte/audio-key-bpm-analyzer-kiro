// Type declarations for essentia.js
declare module 'essentia.js' {
  export interface EssentiaWASM {
    // WebAssembly module interface
  }

  export class Essentia {
    constructor(wasmModule: EssentiaWASM)
    
    // Core methods
    shutdown(): void
    delete(): void
    arrayToVector(array: Float32Array | number[]): any
    vectorToArray(vector: any): Float32Array
    audioBufferToMonoSignal(audioBuffer: AudioBuffer): Float32Array
    
    // Beat tracking algorithms
    BeatTrackerMultiFeature(signal: any, maxBPM?: number, minBPM?: number): any
    BeatTrackerDegara(signal: any, maxBPM?: number, minBPM?: number): any
    
    // Key detection algorithms
    KeyExtractor(signal: any): any
    Key(signal: any): any
  }

  export const EssentiaWASM: EssentiaWASM
}