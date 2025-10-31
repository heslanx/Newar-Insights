import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestDeduplicator, cachedFetch } from './request-deduplicator';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Caching', () => {
    it('should cache successful requests', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result1 = await deduplicator.fetch('key1', fetcher);
      const result2 = await deduplicator.fetch('key1', fetcher);
      
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalledTimes(1); // Second call uses cache
    });

    it('should cache different keys separately', async () => {
      const fetcher1 = vi.fn().mockResolvedValue({ data: 'test1' });
      const fetcher2 = vi.fn().mockResolvedValue({ data: 'test2' });
      
      const result1 = await deduplicator.fetch('key1', fetcher1);
      const result2 = await deduplicator.fetch('key2', fetcher2);
      
      expect(result1).toEqual({ data: 'test1' });
      expect(result2).toEqual({ data: 'test2' });
      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });

    it('should respect TTL', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      // First fetch
      const result1 = await deduplicator.fetch('key1', fetcher, { ttl: 1000 });
      expect(result1).toEqual({ data: 'first' });
      
      // Still within TTL
      vi.advanceTimersByTime(500);
      const result2 = await deduplicator.fetch('key1', fetcher);
      expect(result2).toEqual({ data: 'first' }); // Uses cache
      
      // TTL expired
      vi.advanceTimersByTime(600);
      const result3 = await deduplicator.fetch('key1', fetcher);
      
      await vi.runAllTimersAsync();
      
      expect(result3).toEqual({ data: 'second' }); // Fetches new data
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should force refresh when requested', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      await deduplicator.fetch('key1', fetcher);
      const result = await deduplicator.fetch('key1', fetcher, { forceRefresh: true });
      
      expect(result).toEqual({ data: 'second' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      const fetcher = vi.fn().mockReturnValue(promise);
      
      // Start two concurrent requests
      const promise1 = deduplicator.fetch('key1', fetcher);
      const promise2 = deduplicator.fetch('key1', fetcher);
      
      // Resolve the request
      resolvePromise!({ data: 'test' });
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalledTimes(1); // Only one actual fetch
    });

    it('should handle multiple concurrent requests for different keys', async () => {
      const fetcher1 = vi.fn().mockResolvedValue({ data: 'test1' });
      const fetcher2 = vi.fn().mockResolvedValue({ data: 'test2' });
      
      const [result1, result2] = await Promise.all([
        deduplicator.fetch('key1', fetcher1),
        deduplicator.fetch('key2', fetcher2),
      ]);
      
      expect(result1).toEqual({ data: 'test1' });
      expect(result2).toEqual({ data: 'test2' });
      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stale-While-Revalidate', () => {
    it('should return stale data and revalidate in background', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ data: 'fresh' })
        .mockResolvedValueOnce({ data: 'revalidated' });
      
      // First fetch
      await deduplicator.fetch('key1', fetcher, { ttl: 1000 });
      
      // Make data stale
      vi.advanceTimersByTime(1100);
      
      // Fetch with stale-while-revalidate
      const result = await deduplicator.fetch('key1', fetcher, { 
        staleWhileRevalidate: true 
      });
      
      // Should return stale data immediately
      expect(result).toEqual({ data: 'fresh' });
      
      // Background revalidation should have been triggered
      await vi.runAllTimersAsync();
      
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should fetch fresh data when no cache exists', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await deduplicator.fetch('key1', fetcher, { 
        staleWhileRevalidate: true 
      });
      
      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate specific key', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      await deduplicator.fetch('key1', fetcher);
      
      deduplicator.invalidate('key1');
      
      const result = await deduplicator.fetch('key1', fetcher);
      
      expect(result).toEqual({ data: 'second' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should invalidate by pattern', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await deduplicator.fetch('/api/users/1', fetcher);
      await deduplicator.fetch('/api/users/2', fetcher);
      await deduplicator.fetch('/api/bots/1', fetcher);
      
      deduplicator.invalidatePattern(/\/api\/users/);
      
      // Users should be invalidated
      await deduplicator.fetch('/api/users/1', fetcher);
      await deduplicator.fetch('/api/users/2', fetcher);
      
      // Bots should still be cached
      await deduplicator.fetch('/api/bots/1', fetcher);
      
      expect(fetcher).toHaveBeenCalledTimes(5); // 3 initial + 2 revalidated
    });

    it('should clear all cache', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await deduplicator.fetch('key1', fetcher);
      await deduplicator.fetch('key2', fetcher);
      
      deduplicator.clear();
      
      await deduplicator.fetch('key1', fetcher);
      await deduplicator.fetch('key2', fetcher);
      
      expect(fetcher).toHaveBeenCalledTimes(4); // 2 initial + 2 after clear
    });

    it('should respect max cache size', async () => {
      const dedup = new RequestDeduplicator({ maxCacheSize: 2 });
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await dedup.fetch('key1', fetcher);
      await dedup.fetch('key2', fetcher);
      await dedup.fetch('key3', fetcher); // Should evict key1 (LRU)
      
      // key1 should be evicted, so it will fetch again
      await dedup.fetch('key1', fetcher);
      
      // key2 and key3 should still be cached
      await dedup.fetch('key2', fetcher);
      await dedup.fetch('key3', fetcher);
      
      expect(fetcher).toHaveBeenCalledTimes(4); // 3 initial + 1 evicted
    });
  });

  describe('Error Handling', () => {
    it('should not cache errors', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('Fetch error'))
        .mockResolvedValueOnce({ data: 'success' });
      
      await expect(deduplicator.fetch('key1', fetcher)).rejects.toThrow('Fetch error');
      
      const result = await deduplicator.fetch('key1', fetcher);
      
      expect(result).toEqual({ data: 'success' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent request failures', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Fetch error'));
      
      const [result1, result2] = await Promise.allSettled([
        deduplicator.fetch('key1', fetcher),
        deduplicator.fetch('key1', fetcher),
      ]);
      
      expect(result1.status).toBe('rejected');
      expect(result2.status).toBe('rejected');
      expect(fetcher).toHaveBeenCalledTimes(1); // Still deduplicated
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await deduplicator.fetch('key1', fetcher); // Miss
      await deduplicator.fetch('key1', fetcher); // Hit
      await deduplicator.fetch('key2', fetcher); // Miss
      
      const stats = deduplicator.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.333, 2);
    });

    it('should track cache size', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await deduplicator.fetch('key1', fetcher);
      await deduplicator.fetch('key2', fetcher);
      
      const stats = deduplicator.getStats();
      
      expect(stats.size).toBe(2);
    });

    it('should reset statistics', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await deduplicator.fetch('key1', fetcher);
      await deduplicator.fetch('key1', fetcher);
      
      deduplicator.resetStats();
      
      const stats = deduplicator.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Helper Function', () => {
    it('cachedFetch should work as shorthand', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result1 = await cachedFetch('test-key', fetcher);
      const result2 = await cachedFetch('test-key', fetcher);
      
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keys', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await deduplicator.fetch('', fetcher);
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(10000);
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await deduplicator.fetch(longKey, fetcher);
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle null/undefined values', async () => {
      const fetcher = vi.fn().mockResolvedValue(null);
      
      const result = await deduplicator.fetch('key1', fetcher);
      
      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complexData = {
        nested: { array: [1, 2, 3], object: { a: 1 } },
        date: new Date(),
        regex: /test/,
      };
      const fetcher = vi.fn().mockResolvedValue(complexData);
      
      const result = await deduplicator.fetch('key1', fetcher);
      
      expect(result).toEqual(complexData);
    });
  });
});
