import { describe, it, expect, beforeEach, vi } from 'vitest';
import { retry, retryApiCall, retryStorageOperation, CircuitBreaker } from './retry';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('retry()', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValueOnce('success');
      
      const promise = retry(fn, { maxAttempts: 3 });
      
      // Fast-forward through delays
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxAttempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const promise = retry(fn, { maxAttempts: 3 });
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      const promise = retry(fn, { onRetry });
      
      await vi.runAllTimersAsync();
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
    });

    it('should respect shouldRetry predicate', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Non-retryable'));
      
      const shouldRetry = (error: any) => error.message === 'Retryable';
      
      const promise = retry(fn, { shouldRetry, maxAttempts: 3 });
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Non-retryable');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');
      
      const delays: number[] = [];
      const onRetry = vi.fn((attempt) => {
        delays.push(Date.now());
      });
      
      const promise = retry(fn, {
        initialDelayMs: 100,
        backoffMultiplier: 2,
        onRetry,
      });
      
      await vi.runAllTimersAsync();
      await promise;
      
      // Delays should increase exponentially
      // First retry: ~100ms, Second retry: ~200ms
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelayMs', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');
      
      const promise = retry(fn, {
        initialDelayMs: 5000,
        maxDelayMs: 1000,
      });
      
      await vi.runAllTimersAsync();
      await promise;
      
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryApiCall()', () => {
    it('should retry network errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });
      
      const promise = retryApiCall(fn);
      
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry 4xx errors', async () => {
      const error: any = new Error('Bad request');
      error.status = 400;
      
      const fn = vi.fn().mockRejectedValue(error);
      
      const promise = retryApiCall(fn);
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry 5xx errors', async () => {
      const error: any = new Error('Server error');
      error.status = 500;
      
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: 'success' });
      
      const promise = retryApiCall(fn);
      
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry 429 (rate limit) errors', async () => {
      const error: any = new Error('Rate limited');
      error.status = 429;
      
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: 'success' });
      
      const promise = retryApiCall(fn);
      
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryStorageOperation()', () => {
    it('should retry storage operations', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce({ data: 'saved' });
      
      const promise = retryStorageOperation(fn);
      
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toEqual({ data: 'saved' });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute function when circuit is closed', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const breaker = new CircuitBreaker(fn, { threshold: 3, timeout: 5000 });
      
      const result = await breaker.execute();
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after threshold failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failure'));
      const breaker = new CircuitBreaker(fn, { threshold: 3, timeout: 5000 });
      
      // Fail 3 times to open circuit
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      
      // Circuit should be open now
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should transition to half-open after timeout', async () => {
      const fn = vi.fn()
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockResolvedValue('success');
      
      const breaker = new CircuitBreaker(fn, { threshold: 3, timeout: 1000 });
      
      // Open the circuit
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      
      // Circuit is open
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is OPEN');
      
      // Wait for timeout
      vi.advanceTimersByTime(1100);
      
      // Should allow one request (half-open)
      const result = await breaker.execute();
      expect(result).toBe('success');
      
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should close circuit after successful execution in half-open', async () => {
      const fn = vi.fn()
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockResolvedValue('success')
        .mockResolvedValue('success again');
      
      const breaker = new CircuitBreaker(fn, { threshold: 3, timeout: 1000 });
      
      // Open the circuit
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      
      // Wait for half-open
      vi.advanceTimersByTime(1100);
      
      // Execute successfully (closes circuit)
      await breaker.execute();
      
      // Circuit should be closed now, can execute again
      const result = await breaker.execute();
      expect(result).toBe('success again');
      
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should reopen circuit if half-open execution fails', async () => {
      const fn = vi.fn()
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Failure'))
        .mockRejectedValue(new Error('Still failing'));
      
      const breaker = new CircuitBreaker(fn, { threshold: 3, timeout: 1000 });
      
      // Open the circuit
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      
      // Wait for half-open
      vi.advanceTimersByTime(1100);
      
      // Fail again (reopens circuit)
      await expect(breaker.execute()).rejects.toThrow('Still failing');
      
      // Circuit should be open again
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero maxAttempts', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      await expect(retry(fn, { maxAttempts: 0 })).rejects.toThrow();
      expect(fn).not.toHaveBeenCalled();
    });

    it('should handle negative delays', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');
      
      const promise = retry(fn, { initialDelayMs: -100 });
      
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
    });

    it('should handle function that throws synchronously', async () => {
      const fn = vi.fn(() => {
        throw new Error('Sync error');
      });
      
      const promise = retry(fn, { maxAttempts: 2 });
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Sync error');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
