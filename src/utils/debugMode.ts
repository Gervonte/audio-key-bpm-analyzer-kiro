// Debug mode utilities for development features

/**
 * Check if debug mode is enabled via URL parameter
 * Usage: Add ?debug=true to the URL to enable debug features
 */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('debug') === 'true'
}

/**
 * Check if performance monitoring should be shown
 * This can be extended to check for specific debug flags like ?perf=true
 */
export function shouldShowPerformanceMonitoring(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  
  // Show if debug=true OR perf=true
  return urlParams.get('debug') === 'true' || urlParams.get('perf') === 'true'
}

/**
 * Check if advanced waveform optimizations should be used
 */
export function shouldUseOptimizedWaveform(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  
  // Use optimized waveform if debug=true OR optimize=true
  return urlParams.get('debug') === 'true' || urlParams.get('optimize') === 'true'
}

/**
 * Get debug configuration from URL parameters
 */
export function getDebugConfig(): {
  isDebugMode: boolean
  showPerformanceMonitoring: boolean
  useOptimizedWaveform: boolean
  enableCaching: boolean
  enableProgressiveLoading: boolean
} {
  if (typeof window === 'undefined') {
    return {
      isDebugMode: false,
      showPerformanceMonitoring: false,
      useOptimizedWaveform: false,
      enableCaching: false,
      enableProgressiveLoading: false
    }
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  const debugMode = urlParams.get('debug') === 'true'
  
  return {
    isDebugMode: debugMode,
    showPerformanceMonitoring: debugMode || urlParams.get('perf') === 'true',
    useOptimizedWaveform: debugMode || urlParams.get('optimize') === 'true',
    enableCaching: debugMode || urlParams.get('cache') === 'true',
    enableProgressiveLoading: debugMode || urlParams.get('progressive') === 'true'
  }
}