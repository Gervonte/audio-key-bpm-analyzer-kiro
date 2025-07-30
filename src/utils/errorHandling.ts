// Comprehensive error handling utilities for the audio analyzer

export interface ErrorInfo {
  type: ErrorType
  message: string
  suggestion?: string
  canRetry: boolean
  severity: 'error' | 'warning' | 'info'
}

export type ErrorType = 
  | 'file_validation'
  | 'file_loading'
  | 'browser_compatibility'
  | 'audio_processing'
  | 'key_detection'
  | 'bpm_detection'
  | 'timeout'
  | 'memory'
  | 'network'
  | 'unknown'

/**
 * Categorizes and provides detailed information about errors
 */
export function categorizeError(error: Error | string): ErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerMessage = errorMessage.toLowerCase()

  // File validation errors
  if (lowerMessage.includes('file size') || lowerMessage.includes('exceeds maximum')) {
    return {
      type: 'file_validation',
      message: errorMessage,
      suggestion: 'Try compressing your audio file or use a shorter clip. Maximum file size is 50MB.',
      canRetry: false,
      severity: 'error'
    }
  }

  if (lowerMessage.includes('unsupported file format') || lowerMessage.includes('supported formats')) {
    return {
      type: 'file_validation',
      message: errorMessage,
      suggestion: 'Please convert your file to MP3, WAV, FLAC, or M4A format.',
      canRetry: false,
      severity: 'error'
    }
  }

  if (lowerMessage.includes('file is empty')) {
    return {
      type: 'file_validation',
      message: errorMessage,
      suggestion: 'Please select a valid audio file that contains audio data.',
      canRetry: false,
      severity: 'error'
    }
  }

  // Browser compatibility errors
  if (lowerMessage.includes('web audio api') || lowerMessage.includes('not supported')) {
    return {
      type: 'browser_compatibility',
      message: 'Your browser doesn\'t support Web Audio API',
      suggestion: 'Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
      canRetry: false,
      severity: 'error'
    }
  }

  if (lowerMessage.includes('audio context')) {
    return {
      type: 'browser_compatibility',
      message: 'Failed to initialize audio processing',
      suggestion: 'Try refreshing the page or using a different browser.',
      canRetry: true,
      severity: 'error'
    }
  }

  // File loading errors
  if (lowerMessage.includes('corrupted') || lowerMessage.includes('unable to decode')) {
    return {
      type: 'file_loading',
      message: 'Audio file appears to be corrupted or in an unsupported codec',
      suggestion: 'Try re-exporting your audio file or use a different file.',
      canRetry: false,
      severity: 'error'
    }
  }

  if (lowerMessage.includes('file reading timeout')) {
    return {
      type: 'file_loading',
      message: 'File took too long to load',
      suggestion: 'Check your internet connection and try again with a smaller file.',
      canRetry: true,
      severity: 'error'
    }
  }

  if (lowerMessage.includes('only silence') || lowerMessage.includes('invalid data')) {
    return {
      type: 'file_loading',
      message: 'Audio file contains no detectable audio content',
      suggestion: 'Please use an audio file with audible content.',
      canRetry: false,
      severity: 'error'
    }
  }

  // Processing timeout errors
  if (lowerMessage.includes('timed out') || lowerMessage.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Audio analysis took too long to complete',
      suggestion: 'Try using a shorter audio file (under 5 minutes) or a simpler audio track.',
      canRetry: true,
      severity: 'error'
    }
  }

  // Key detection errors
  if (lowerMessage.includes('key detection failed') || lowerMessage.includes('unable to detect') && lowerMessage.includes('key')) {
    return {
      type: 'key_detection',
      message: 'Unable to detect the musical key',
      suggestion: 'The audio may not contain clear musical content. Try using an instrumental track with distinct harmonic content.',
      canRetry: true,
      severity: 'error'
    }
  }

  // BPM detection errors
  if (lowerMessage.includes('bpm detection failed') || lowerMessage.includes('unable to detect') && lowerMessage.includes('bpm')) {
    return {
      type: 'bpm_detection',
      message: 'Unable to detect the BPM',
      suggestion: 'The audio may not have a clear rhythmic pattern. Try using a track with a steady beat.',
      canRetry: true,
      severity: 'error'
    }
  }

  // Memory errors
  if (lowerMessage.includes('memory') || lowerMessage.includes('out of memory')) {
    return {
      type: 'memory',
      message: 'Not enough memory to process this audio file',
      suggestion: 'Try closing other browser tabs, using a smaller file, or refreshing the page.',
      canRetry: true,
      severity: 'error'
    }
  }

  // Processing cancelled
  if (lowerMessage.includes('cancelled') || lowerMessage.includes('aborted')) {
    return {
      type: 'audio_processing',
      message: 'Audio processing was cancelled',
      suggestion: 'You can try uploading the file again.',
      canRetry: true,
      severity: 'info'
    }
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network error occurred',
      suggestion: 'Check your internet connection and try again.',
      canRetry: true,
      severity: 'error'
    }
  }

  // Generic processing errors
  if (lowerMessage.includes('processing failed') || lowerMessage.includes('analysis failed')) {
    return {
      type: 'audio_processing',
      message: 'Audio analysis failed',
      suggestion: 'Try again with a different audio file or refresh the page.',
      canRetry: true,
      severity: 'error'
    }
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred',
    suggestion: 'Please try again. If the problem persists, try refreshing the page or using a different audio file.',
    canRetry: true,
    severity: 'error'
  }
}

/**
 * Browser compatibility detection
 */
export interface BrowserCompatibility {
  isSupported: boolean
  warnings: string[]
  errors: string[]
  suggestions: string[]
}

export function checkBrowserCompatibility(): BrowserCompatibility {
  const warnings: string[] = []
  const errors: string[] = []
  const suggestions: string[] = []

  // Check Web Audio API support
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    errors.push('Web Audio API is not supported')
    suggestions.push('Please use a modern browser like Chrome, Firefox, Safari, or Edge')
  }

  // Check File API support
  if (!window.File || !window.FileReader) {
    errors.push('File API is not supported')
    suggestions.push('Please update your browser to a more recent version')
  }

  // Check for older browsers
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('msie') || userAgent.includes('trident')) {
    warnings.push('Internet Explorer is not fully supported')
    suggestions.push('For the best experience, please use Chrome, Firefox, Safari, or Edge')
  }

  // Check for mobile limitations
  if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    warnings.push('Mobile browsers may have limited audio processing capabilities')
    suggestions.push('For complex audio analysis, consider using a desktop browser')
  }

  // Check available memory (rough estimate)
  if ('deviceMemory' in navigator && (navigator as any).deviceMemory && (navigator as any).deviceMemory < 2) {
    warnings.push('Low device memory detected')
    suggestions.push('Large audio files may not process correctly on this device')
  }

  return {
    isSupported: errors.length === 0,
    warnings,
    errors,
    suggestions
  }
}

/**
 * Generates user-friendly error messages with context
 */
export function generateErrorMessage(error: Error | string, context?: string): string {
  const errorInfo = categorizeError(error)
  
  let message = errorInfo.message
  
  if (context) {
    message = `${context}: ${message}`
  }
  
  if (errorInfo.suggestion) {
    message += `\n\nSuggestion: ${errorInfo.suggestion}`
  }
  
  return message
}

/**
 * Determines if an error is recoverable
 */
export function isRecoverableError(error: Error | string): boolean {
  const errorInfo = categorizeError(error)
  return errorInfo.canRetry
}

/**
 * Gets appropriate retry delay based on error type
 */
export function getRetryDelay(errorType: ErrorType): number {
  switch (errorType) {
    case 'network':
      return 2000 // 2 seconds for network errors
    case 'memory':
      return 5000 // 5 seconds for memory errors
    case 'timeout':
      return 1000 // 1 second for timeout errors
    case 'audio_processing':
      return 1500 // 1.5 seconds for processing errors
    default:
      return 1000 // 1 second default
  }
}

/**
 * Error severity levels for UI styling
 */
export function getErrorSeverityColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return 'red'
    case 'warning':
      return 'orange'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}