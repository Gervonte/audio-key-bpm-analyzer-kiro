import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000, // 10 second timeout for slow tests
    // Exclude slow fallback algorithm tests that timeout
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.{workspace,code-workspace}',
    ]
  },
})