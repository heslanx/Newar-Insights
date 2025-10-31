/**
 * Retry Logic
 *
 * Automatic retry with exponential backoff and jitter
 */

import { logWarn, logError } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, rate limits
    if (error.name === 'NetworkError') return true;
    if (error.status >= 500) return true;
    if (error.status === 429) return true; // Rate limit
    if (error.status === 408) return true; // Request timeout
    return false;
  },
  onRetry: () => {}
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (±25%) to avoid thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const data = await retry(() => fetchData(), {
 *   maxAttempts: 5,
 *   onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
 * });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!opts.shouldRetry(error)) {
        logError('Error not retryable', error as Error, { attempt });
        throw error;
      }

      // Check if we've exhausted attempts
      if (attempt >= opts.maxAttempts) {
        logError('Max retry attempts reached', error as Error, {
          attempt,
          maxAttempts: opts.maxAttempts
        });
        throw error;
      }

      // Calculate delay and log
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      logWarn(`Retrying after ${delay}ms`, {
        attempt,
        maxAttempts: opts.maxAttempts,
        error: error instanceof Error ? error.message : String(error)
      });

      // Call retry callback
      opts.onRetry(attempt, error);

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry with specific retry strategy for API calls
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return retry(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    shouldRetry: (error) => {
      // Retry on network errors and server errors
      if (error.name === 'NetworkError') return true;
      if (error.name === 'AbortError') return false; // Don't retry aborted requests
      if (error.status >= 500) return true;
      if (error.status === 429) return true; // Rate limit
      if (error.status === 408) return true; // Timeout
      return false;
    },
    ...options
  });
}

/**
 * Retry with specific strategy for storage operations
 */
export async function retryStorageOperation<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return retry(fn, {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 1.5,
    shouldRetry: (error) => {
      // Always retry storage errors (they're usually transient)
      return true;
    },
    ...options
  });
}

/**
 * Circuit Breaker pattern (prevent cascading failures)
 */
export class CircuitBreaker<T> {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private fn: () => Promise<T>,
    private options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      onStateChange?: (state: 'closed' | 'open' | 'half-open') => void;
    } = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      ...options
    };
  }

  async execute(): Promise<T> {
    // If circuit is open, check if we should try again
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceLastFailure < (this.options.resetTimeoutMs || 60000)) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try half-open
      this.setState('half-open');
    }

    try {
      const result = await this.fn();

      // Success - reset circuit
      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= (this.options.failureThreshold || 5)) {
      this.setState('open');
      logError('Circuit breaker opened', undefined, {
        failureCount: this.failureCount
      });
    }
  }

  private reset() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.setState('closed');
  }

  private setState(state: 'closed' | 'open' | 'half-open') {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  getState() {
    return this.state;
  }
}
