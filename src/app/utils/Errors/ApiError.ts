/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
  status: number;
  isAuthError: boolean;
  isValidationError: boolean;
  isServerError: boolean;
  isRateLimitError: boolean;
  retryAfter: string | null;

  constructor(message: string, status: number = 500, retryAfter?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isAuthError = status === 401 || status === 403;
    this.isValidationError = status === 400;
    this.isServerError = status >= 500;
    this.isRateLimitError = status === 429;
    this.retryAfter = retryAfter || null;
  }
}

/**
 * Handles API response errors and throws structured ApiError
 */
export const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `Request failed with status ${response.status}`;
  let errorBody: { message?: string; retryAfter?: string } = {};
  let retryAfter: string | null = null;

  // Check for Retry-After header (can be seconds or HTTP-date)
  const retryAfterHeader = response.headers.get('Retry-After');
  if (retryAfterHeader) {
    // If it's a number (seconds), convert to date
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      const retryDate = new Date(Date.now() + seconds * 1000);
      retryAfter = retryDate.toISOString();
    } else {
      // It's an HTTP-date, use as-is
      retryAfter = retryAfterHeader;
    }
  }

  try {
    errorBody = await response.json();
    errorMessage = errorBody.message || errorMessage;
    // Use retryAfter from body if header wasn't present
    if (!retryAfter && errorBody.retryAfter) {
      retryAfter = errorBody.retryAfter;
    }
  } catch {
    // If JSON parsing fails, use default message
  }

  throw new ApiError(errorMessage, response.status, retryAfter);
};

/**
 * Extracts error message and status from an error
 */
export const extractErrorInfo = (error: unknown): { 
  message: string; 
  status?: number; 
  isAuthError: boolean;
  isRateLimitError: boolean;
  retryAfter: string | null;
} => {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      isAuthError: error.isAuthError,
      isRateLimitError: error.isRateLimitError,
      retryAfter: error.retryAfter,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      isAuthError: false,
      isRateLimitError: false,
      retryAfter: null,
    };
  }

  return {
    message: 'An unexpected error occurred',
    isAuthError: false,
    isRateLimitError: false,
    retryAfter: null,
  };
};

/**
 * Calculates the delay in milliseconds until the retry-after time
 */
const calculateRetryDelay = (retryAfter: string | null): number => {
  if (!retryAfter) {
    return 0;
  }

  try {
    const retryDate = new Date(retryAfter);
    const now = new Date();
    const diff = retryDate.getTime() - now.getTime();
    return Math.max(0, diff);
  } catch {
    return 0;
  }
};

/**
 * Sleeps for the specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retries an async function with automatic rate limit handling
 * 
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export const retryWithRateLimit = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    onRetry?: (error: ApiError, attempt: number, retryAfter: string | null) => void;
  } = {}
): Promise<T> => {
  const { maxRetries = 3, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Only retry on rate limit errors
      if (error instanceof ApiError && error.isRateLimitError) {
        if (attempt < maxRetries) {
          const delay = calculateRetryDelay(error.retryAfter);
          
          if (onRetry) {
            onRetry(error, attempt + 1, error.retryAfter);
          }

          // Wait for the retry-after time, or a minimum delay
          if (delay > 0) {
            await sleep(delay);
          } else {
            // If no retry-after time, use exponential backoff
            await sleep(Math.min(1000 * Math.pow(2, attempt), 30000));
          }

          continue;
        }
      }

      // For non-rate-limit errors or if we've exhausted retries, throw immediately
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
};

