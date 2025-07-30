/// <reference types="vite/client" />

// Extend Window interface for optional garbage collection
declare global {
  interface Window {
    gc?: () => void
  }
}
