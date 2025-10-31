/**
 * Request Deduplication
 *
 * Prevents duplicate in-flight requests and provides caching
 */

import { logDebug, logInfo } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduplicator {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, InFlightRequest<any>>();
  private maxCacheSize = 100;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute a request with deduplication and caching
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number; // Cache TTL in milliseconds
      forceRefresh?: boolean; // Skip cache
      staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
    } = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, forceRefresh = false, staleWhileRevalidate = false } = options;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        logDebug(`Cache hit: ${key}`);

        // If using stale-while-revalidate, trigger background refresh
        if (staleWhileRevalidate && this.isStale(key)) {
          logDebug(`Stale data detected, refreshing in background: ${key}`);
          this.fetchInBackground(key, fetcher, ttl);
        }

        return cached;
      }
    }

    // Check if request is already in flight
    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      logDebug(`Request already in flight, waiting: ${key}`);
      return inFlight.promise;
    }

    // Execute new request
    logDebug(`Executing new request: ${key}`);
    const promise = this.executeRequest(key, fetcher, ttl);
    this.inFlight.set(key, { promise, timestamp: Date.now() });

    try {
      const result = await promise;
      return result;
    } finally {
      // Remove from in-flight after completion
      this.inFlight.delete(key);
    }
  }

  /**
   * Execute request and cache result
   */
  private async executeRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const data = await fetcher();
      this.setCache(key, data, ttl);
      logInfo(`Request completed and cached: ${key}`);
      return data;
    } catch (error) {
      logInfo(`Request failed: ${key}`);
      throw error;
    }
  }

  /**
   * Fetch in background without waiting
   */
  private fetchInBackground<T>(key: string, fetcher: () => Promise<T>, ttl: number) {
    this.executeRequest(key, fetcher, ttl).catch(() => {
      // Silently fail background refresh
    });
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache entry is stale (but not expired)
   */
  private isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Consider stale if older than 50% of TTL
    const age = Date.now() - entry.timestamp;
    const ttl = entry.expiresAt - entry.timestamp;
    return age > ttl * 0.5;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, data: T, ttl: number) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Evict oldest cache entry (LRU)
   */
  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logDebug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key);
    logDebug(`Cache invalidated: ${key}`);
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: RegExp) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    logInfo(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    logInfo('Cache cleared');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      inFlightRequests: this.inFlight.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper function for API requests
 */
export async function cachedFetch<T>(
  url: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
    staleWhileRevalidate?: boolean;
  }
): Promise<T> {
  return requestDeduplicator.fetch(url, fetcher, options);
}

/**
 * Invalidate cache for specific URL
 */
export function invalidateCache(url: string) {
  requestDeduplicator.invalidate(url);
}

/**
 * Invalidate all recordings cache
 */
export function invalidateRecordingsCache() {
  requestDeduplicator.invalidatePattern(/\/recordings/);
}

/**
 * Invalidate all bots cache
 */
export function invalidateBotsCache() {
  requestDeduplicator.invalidatePattern(/\/bots/);
}
