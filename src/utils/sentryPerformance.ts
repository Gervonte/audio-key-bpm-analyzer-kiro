import * as Sentry from '@sentry/react';

/**
 * Track custom performance metrics for audio analysis
 */
export const trackAudioAnalysisPerformance = (
  operation: 'file_upload' | 'bpm_detection' | 'key_detection' | 'waveform_generation',
  startTime: number,
  metadata?: Record<string, string | number | boolean>
) => {
  const duration = performance.now() - startTime;
  
  Sentry.addBreadcrumb({
    category: 'audio.analysis',
    message: `${operation} completed`,
    level: 'info',
    data: {
      duration,
      ...metadata,
    },
  });

  // Note: Custom metrics tracking removed due to Sentry API limitations
  // Consider using Sentry.addBreadcrumb or custom events for tracking
};

/**
 * Track file upload metrics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const trackFileUpload = (_fileSize: number, _fileType: string, _duration: number) => {
  // Note: Custom metrics tracking removed due to Sentry API limitations
  // Consider using Sentry.addBreadcrumb or custom events for tracking
};

/**
 * Track analysis errors
 */
export const trackAnalysisError = (
  errorType: 'timeout' | 'processing_failed' | 'unsupported_format' | 'file_too_large',
  context?: Record<string, string | number | boolean>
) => {
  Sentry.addBreadcrumb({
    category: 'audio.error',
    message: `Analysis error: ${errorType}`,
    level: 'error',
    data: context,
  });

  // Note: Custom metrics tracking removed due to Sentry API limitations
};

/**
 * Track user interactions
 */
export const trackUserInteraction = (
  action: 'file_select' | 'analysis_start' | 'reset' | 'retry' | 'sentry_test',
  metadata?: Record<string, string | number | boolean>
) => {
  Sentry.addBreadcrumb({
    category: 'user.interaction',
    message: `User ${action}`,
    level: 'info',
    data: metadata,
  });

  // Note: Custom metrics tracking removed due to Sentry API limitations
};

/**
 * Track Core Web Vitals manually (in addition to automatic tracking)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const trackWebVital = (_name: string, _value: number, _rating: 'good' | 'needs-improvement' | 'poor') => {
  // Note: Custom metrics tracking removed due to Sentry API limitations
  // Consider using Sentry.addBreadcrumb or custom events for tracking
};

/**
 * Helper function to categorize file sizes
 */
function getFileSizeCategory(sizeInBytes: number): string {
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB < 1) return 'small';
  if (sizeInMB < 5) return 'medium';
  if (sizeInMB < 20) return 'large';
  return 'very_large';
}

/**
 * Create a Sentry transaction for audio analysis workflow
 */
export const createAnalysisTransaction = (fileName: string, fileSize: number) => {
  // Use the newer Sentry.startSpan API instead of startTransaction
  return Sentry.startSpan({
    name: 'Audio Analysis Workflow',
    op: 'audio.analysis',
    attributes: {
      file_name: fileName,
      file_size_category: getFileSizeCategory(fileSize),
    },
  }, (span) => span);
};