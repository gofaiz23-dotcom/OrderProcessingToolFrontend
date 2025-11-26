/**
 * Client-side cache for email list results
 * Cache TTL: 3 minutes
 */

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes in milliseconds
const CACHE_PREFIX = 'email_list_cache_';

interface CachedEmailList<T> {
  data: T[];
  timestamp: number;
  filters: string; // Serialized filter key
}

/**
 * Generate a cache key from filters
 */
const generateCacheKey = (type: 'inbox' | 'sent', filters: Record<string, unknown>): string => {
  // Create a stable key from filter object
  const filterKey = JSON.stringify(
    Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>)
  );
  return `${CACHE_PREFIX}${type}_${filterKey}`;
};

/**
 * Get cached email list
 */
export const getCachedEmailList = <T>(type: 'inbox' | 'sent', filters: Record<string, unknown>): T[] | null => {
  try {
    const cacheKey = generateCacheKey(type, filters);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed: CachedEmailList<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch {
    return null;
  }
};

/**
 * Set cached email list
 */
export const setCachedEmailList = <T>(type: 'inbox' | 'sent', filters: Record<string, unknown>, data: T[]): void => {
  try {
    const cacheKey = generateCacheKey(type, filters);
    const cache: CachedEmailList<T> = {
      data,
      timestamp: Date.now(),
      filters: JSON.stringify(filters),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

/**
 * Clear all email list caches
 */
export const clearEmailListCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore errors
  }
};

