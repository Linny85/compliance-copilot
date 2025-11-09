import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      release: import.meta.env.VITE_APP_VERSION || 'development',
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // PII Protection
      beforeSend(event) {
        // Redact sensitive data
        if (event.user?.email) {
          event.user.email = event.user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        }
        
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        
        // Filter out chunk load errors (usually not actionable)
        if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
          return null;
        }
        
        return event;
      },
    });

    // Global error handlers for unhandled rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason || event);
      console.error('[Unhandled Rejection]', event.reason);
    });

    console.log('[Sentry] Initialized for production with global error handlers');
  } else if (import.meta.env.DEV) {
    // In development, still capture unhandled errors for debugging
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Rejection]', event.reason);
    });
    console.log('[Sentry] Skipped in development mode');
  }
}

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export function setSentryUser(userId: string, email?: string, tenantId?: string) {
  if (import.meta.env.PROD) {
    Sentry.setUser({
      id: userId,
      email: email,
    });
    
    if (tenantId) {
      Sentry.setContext('tenant', {
        tenant_id: tenantId,
      });
    }
  }
}

/**
 * Clear user context from Sentry
 * Call this on logout
 */
export function clearSentryUser() {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
    Sentry.setContext('tenant', null as any);
  }
}
