import * as Sentry from '@sentry/react';

/**
 * Track custom performance metrics for audio analysis
 */
export const trackAudioAnalysisPerformance = (
  operation: 'file_upload' | 'bpm_detection' | 'key_detection' | 'waveform_generation',
  startTime: number,
  metadata?: Record<string, any>
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

  // Track as custom metric (if metrics API is available)
  try {
    const metrics = (Sentry as any).metrics;
    if (metrics && typeof metrics.distribution === 'function') {
      metrics.distribution('audio.analysis.duration', duration, {
        tags: {
          operation,
          ...metadata,
        },
      });
    }
  } catch (e) {
    // Metrics API not available
  }
};

/**
 * Track file upload metrics
 */
export const trackFileUpload = (fileSize: number, fileType: string, duration: number) => {
  try {
    const metrics = (Sentry as any).metrics;
    if (metrics) {
      if (typeof metrics.distribution === 'function') {
        metrics.distribution('file.upload.duration', duration, {
          tags: {
            file_type: fileType,
            size_category: getFileSizeCategory(fileSize),
          },
        });
      }

      if (typeof metrics.increment === 'function') {
        metrics.increment('file.upload.count', 1, {
          tags: {
            file_type: fileType,
          },
        });
      }
    }
  } catch (e) {
    // Metrics API not available
  }
};

/**
 * Track analysis errors
 */
export const trackAnalysisError = (
  errorType: 'timeout' | 'processing_failed' | 'unsupported_format' | 'file_too_large',
  context?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'audio.error',
    message: `Analysis error: ${errorType}`,
    level: 'error',
    data: context,
  });

  try {
    const metrics = (Sentry as any).metrics;
    if (metrics && typeof metrics.increment === 'function') {
      metrics.increment('audio.analysis.error', 1, {
        tags: {
          error_type: errorType,
        },
      });
    }
  } catch (e) {
    // Metrics API not available
  }
};

/**
 * Track user interactions
 */
export const trackUserInteraction = (
  action: 'file_select' | 'analysis_start' | 'reset' | 'retry' | 'sentry_test',
  metadata?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'user.interaction',
    message: `User ${action}`,
    level: 'info',
    data: metadata,
  });

  try {
    const metrics = (Sentry as any).metrics;
    if (metrics && typeof metrics.increment === 'function') {
      metrics.increment('user.interaction', 1, {
        tags: {
          action,
        },
      });
    }
  } catch (e) {
    // Metrics API not available
  }
};

/**
 * Track Core Web Vitals manually (in addition to automatic tracking)
 */
export const trackWebVital = (name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') => {
  try {
    const metrics = (Sentry as any).metrics;
    if (metrics && typeof metrics.distribution === 'function') {
      metrics.distribution(`web_vital.${name}`, value, {
        tags: {
          rating,
        },
      });
    }
  } catch (e) {
    // Metrics API not available
  }
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