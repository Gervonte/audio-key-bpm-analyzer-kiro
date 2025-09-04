import { useState, useEffect } from 'react'

/**
 * Debug mode utilities for development features
 * Supports multiple ways to enable debug mode:
 * 1. URL parameter: ?debug=true
 * 2. localStorage: localStorage.setItem('debug', 'true')
 * 3. Environment variable: VITE_DEBUG_MODE=true
 */

export const DEBUG_STORAGE_KEY = 'audio-analyzer-debug-mode'

/**
 * Check if debug mode is enabled through any method
 */
export const isDebugMode = (): boolean => {
  // Check URL parameter first (highest priority)
  const urlParams = new URLSearchParams(window.location.search)
  const urlDebug = urlParams.get('debug')
  if (urlDebug === 'true') {
    return true
  }
  if (urlDebug === 'false') {
    return false
  }

  // Check localStorage (medium priority)
  try {
    const storedDebug = localStorage.getItem(DEBUG_STORAGE_KEY)
    if (storedDebug === 'true') {
      return true
    }
    if (storedDebug === 'false') {
      return false
    }
  } catch (error) {
    // localStorage might not be available
    console.warn('localStorage not available for debug mode')
  }

  // Check environment variable (lowest priority)
  return import.meta.env.VITE_DEBUG_MODE === 'true'
}

/**
 * Enable debug mode and persist to localStorage
 */
export const enableDebugMode = (): void => {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, 'true')
    console.log('Debug mode enabled. Refresh the page to see debug features.')
  } catch (error) {
    console.warn('Could not persist debug mode to localStorage')
  }
}

/**
 * Disable debug mode and remove from localStorage
 */
export const disableDebugMode = (): void => {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, 'false')
    console.log('Debug mode disabled. Refresh the page to hide debug features.')
  } catch (error) {
    console.warn('Could not persist debug mode to localStorage')
  }
}

/**
 * Toggle debug mode
 */
export const toggleDebugMode = (): boolean => {
  const currentMode = isDebugMode()
  if (currentMode) {
    disableDebugMode()
    return false
  } else {
    enableDebugMode()
    return true
  }
}

/**
 * Add debug mode controls to window for console access
 */
if (typeof window !== 'undefined') {
  // Make debug functions available globally for console access
  ; (window as any).debugMode = {
    isEnabled: isDebugMode,
    enable: enableDebugMode,
    disable: disableDebugMode,
    toggle: toggleDebugMode,
  }
}

/**
 * React hook for debug mode state
 */

export const useDebugMode = () => {
  const [debugMode, setDebugMode] = useState(isDebugMode())

  useEffect(() => {
    const handleStorageChange = () => {
      setDebugMode(isDebugMode())
    }

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange)

    // Also check for URL parameter changes
    const handlePopState = () => {
      setDebugMode(isDebugMode())
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return {
    isDebugMode: debugMode,
    enableDebugMode: () => {
      enableDebugMode()
      setDebugMode(true)
    },
    disableDebugMode: () => {
      disableDebugMode()
      setDebugMode(false)
    },
    toggleDebugMode: () => {
      const newMode = toggleDebugMode()
      setDebugMode(newMode)
      return newMode
    },
  }
}

/**
 * Get debug configuration from URL parameters
 */
export interface DebugConfig {
  isDebugMode: boolean
  showPerformanceMonitoring: boolean
  enableCaching: boolean
  showEvaluation: boolean
  enableProgressiveLoading: boolean
}

export const getDebugConfig = (): DebugConfig => {
  const urlParams = new URLSearchParams(window.location.search)

  const isDebugMode = urlParams.get('debug') === 'true' ||
    urlParams.get('perf') === 'true' ||
    urlParams.get('cache') === 'true' ||
    urlParams.get('eval') === 'true'

  return {
    isDebugMode,
    showPerformanceMonitoring: urlParams.get('debug') === 'true' || urlParams.get('perf') === 'true',
    enableCaching: urlParams.get('debug') === 'true' || urlParams.get('cache') === 'true',
    showEvaluation: urlParams.get('debug') === 'true' || urlParams.get('eval') === 'true',
    enableProgressiveLoading: urlParams.get('debug') === 'true' || urlParams.get('progressive') === 'true',
  }
}