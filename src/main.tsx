import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || '1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // Capture 10% of transactions in production
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    
    // Additional configuration
    beforeSend(event) {
      // Filter out development errors or add custom logic
      if (import.meta.env.DEV && event.exception) {
        console.error('Sentry captured error:', event.exception);
      }
      return event;
    },
  });
}

const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, resetError }) => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>We've been notified of this error and are working to fix it.</p>
      <details style={{ marginTop: '10px' }}>
        <summary>Error details</summary>
        <pre style={{ textAlign: 'left', marginTop: '10px' }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </details>
      <button onClick={resetError} style={{ marginTop: '10px', padding: '8px 16px' }}>
        Try again
      </button>
    </div>
  ),
  showDialog: false,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <SentryApp />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
)