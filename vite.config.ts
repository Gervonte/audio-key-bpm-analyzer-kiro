import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Only include Sentry plugin in production builds with auth token
    ...(process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              assets: './dist/**',
            },
          }),
        ]
      : []),
  ],
  build: {
    sourcemap: true, // Enable source maps for Sentry
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings from Chakra UI
        if (warning.code === 'SOURCEMAP_ERROR' && 
            warning.message.includes('@chakra-ui/react/dist/esm/styled-system/factory.js')) {
          return
        }
        warn(warning)
      },
    },
  },
  optimizeDeps: {
    include: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
  },
  esbuild: {
    // Suppress sourcemap warnings for node_modules
    logOverride: { 
      'this-is-undefined-in-esm': 'silent'
    },
  },
})
