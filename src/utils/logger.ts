/**
 * Production-safe logger utility
 * Only logs in development mode to avoid exposing sensitive information in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, but in production, you might want to send to error tracking service
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, you could send errors to a logging service like Sentry, LogRocket, etc.
      // For now, we'll still log but without sensitive data
      console.error('[Error]', args[0]);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

