import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { trackWebVital } from '../utils/sentryPerformance';

/**
 * Hook to track Core Web Vitals and performance metrics
 */
export const useSentryPerformance = () => {
  useEffect(() => {
    // Track Core Web Vitals using the web-vitals library if available
    if ('web-vitals' in window || typeof window !== 'undefined') {
      // Manual Core Web Vitals tracking using Performance Observer
      if ('PerformanceObserver' in window) {
        // Track Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            const value = lastEntry.startTime;
            const rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
            trackWebVital('lcp', value, rating);
          }
        });
        
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // Track First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const value = entry.processingStart - entry.startTime;
            const rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
            trackWebVital('fid', value, rating);
          });
        });

        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID not supported
        }

        // Track Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
        });

        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }

        // Report CLS on page unload
        const reportCLS = () => {
          const rating = clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor';
          trackWebVital('cls', clsValue, rating);
        };

        window.addEventListener('beforeunload', reportCLS);
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            reportCLS();
          }
        });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          window.removeEventListener('beforeunload', reportCLS);
        };
      }
    }
  }, []);

  // Return utility functions for manual performance tracking
  return {
    startSpan: Sentry.startSpan,
    addBreadcrumb: Sentry.addBreadcrumb,
    captureException: Sentry.captureException,
    captureMessage: Sentry.captureMessage,
    setTag: Sentry.setTag,
    setUser: Sentry.setUser,
    setContext: Sentry.setContext,
  };
};