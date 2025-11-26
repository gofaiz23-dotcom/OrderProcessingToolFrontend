/**
 * Email Storage Cache
 * 
 * This cache stores individual emails by their ID so we can:
 * 1. Check if an email is already fetched before calling API
 * 2. Reuse emails across different pages/filters
 * 3. Avoid redundant API calls
 * 
 * Cache TTL: 5 minutes (emails don't change frequently)
 * 
 * Easy to explain: "We store each email once it's fetched, 
 * so we don't need to fetch it again from the API"
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_PREFIX = 'email_storage_'; // Individual email storage
const STORAGE_INDEX_KEY = 'email_storage_index'; // Index of all cached email IDs

interface CachedEmail {
  email: unknown; // The email data
  timestamp: number; // When it was cached
  emailId: string; // Email ID for reference
}

interface EmailStorageIndex {
  inbox: string[]; // Array of email IDs in cache
  sent: string[]; // Array of email IDs in cache
  lastUpdated: number; // Last time index was updated
}

/**
 * Get the storage index (list of all cached email IDs)
 */
const getStorageIndex = (): EmailStorageIndex => {
  try {
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    if (!index) {
      return { inbox: [], sent: [], lastUpdated: Date.now() };
    }
    return JSON.parse(index);
  } catch {
    return { inbox: [], sent: [], lastUpdated: Date.now() };
  }
};

/**
 * Update the storage index
 */
const updateStorageIndex = (type: 'inbox' | 'sent', emailIds: string[]): void => {
  try {
    const index = getStorageIndex();
    index[type] = emailIds;
    index.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Ignore errors
  }
};

/**
 * Get storage key for an individual email
 */
const getEmailStorageKey = (emailId: string): string => {
  return `${STORAGE_PREFIX}${emailId}`;
};

/**
 * Check if an email is already cached and still valid
 * 
 * @param emailId - The email ID to check
 * @returns The cached email if found and valid, null otherwise
 */
export const getCachedEmail = <T>(emailId: string): T | null => {
  try {
    const storageKey = getEmailStorageKey(emailId);
    const cached = localStorage.getItem(storageKey);
    
    if (!cached) return null;
    
    const parsed: CachedEmail = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_TTL) {
      return parsed.email as T;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(storageKey);
    return null;
  } catch {
    return null;
  }
};

/**
 * Store an email in cache
 * 
 * @param emailId - The email ID
 * @param email - The email data to cache
 * @param type - Whether it's inbox or sent email
 */
export const setCachedEmail = <T>(emailId: string, email: T, type: 'inbox' | 'sent'): void => {
  try {
    const storageKey = getEmailStorageKey(emailId);
    const cached: CachedEmail = {
      email,
      timestamp: Date.now(),
      emailId,
    };
    
    localStorage.setItem(storageKey, JSON.stringify(cached));
    
    // Update index
    const index = getStorageIndex();
    if (!index[type].includes(emailId)) {
      index[type].push(emailId);
      updateStorageIndex(type, index[type]);
    }
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

/**
 * Get multiple emails from cache by their IDs
 * 
 * @param emailIds - Array of email IDs to retrieve
 * @returns Array of cached emails (only valid ones)
 */
export const getCachedEmails = <T>(emailIds: string[]): T[] => {
  const cachedEmails: T[] = [];
  
  for (const emailId of emailIds) {
    const cached = getCachedEmail<T>(emailId);
    if (cached) {
      cachedEmails.push(cached);
    }
  }
  
  return cachedEmails;
};

/**
 * Store multiple emails in cache
 * 
 * @param emails - Array of emails with their IDs
 * @param type - Whether they're inbox or sent emails
 */
export const setCachedEmails = <T extends { id: string }>(
  emails: T[],
  type: 'inbox' | 'sent'
): void => {
  for (const email of emails) {
    setCachedEmail(email.id, email, type);
  }
};

/**
 * Check which email IDs are already cached
 * 
 * @param emailIds - Array of email IDs to check
 * @returns Object with cached and missing email IDs
 */
export const checkCachedEmailIds = (emailIds: string[]): {
  cached: string[];
  missing: string[];
} => {
  const cached: string[] = [];
  const missing: string[] = [];
  
  for (const emailId of emailIds) {
    const cachedEmail = getCachedEmail(emailId);
    if (cachedEmail) {
      cached.push(emailId);
    } else {
      missing.push(emailId);
    }
  }
  
  return { cached, missing };
};

/**
 * Clear all cached emails
 */
export const clearEmailStorageCache = (): void => {
  try {
    const index = getStorageIndex();
    const allEmailIds = [...index.inbox, ...index.sent];
    
    // Remove all email storage entries
    for (const emailId of allEmailIds) {
      localStorage.removeItem(getEmailStorageKey(emailId));
    }
    
    // Clear index
    localStorage.removeItem(STORAGE_INDEX_KEY);
  } catch {
    // Ignore errors
  }
};

/**
 * Clear cached emails for a specific type (inbox or sent)
 */
export const clearEmailStorageCacheByType = (type: 'inbox' | 'sent'): void => {
  try {
    const index = getStorageIndex();
    const emailIds = index[type];
    
    // Remove email storage entries for this type
    for (const emailId of emailIds) {
      localStorage.removeItem(getEmailStorageKey(emailId));
    }
    
    // Update index
    index[type] = [];
    updateStorageIndex(type, []);
  } catch {
    // Ignore errors
  }
};

/**
 * Get cache statistics (useful for debugging)
 */
export const getEmailStorageCacheStats = (): {
  inboxCount: number;
  sentCount: number;
  totalCount: number;
  lastUpdated: number;
} => {
  const index = getStorageIndex();
  return {
    inboxCount: index.inbox.length,
    sentCount: index.sent.length,
    totalCount: index.inbox.length + index.sent.length,
    lastUpdated: index.lastUpdated,
  };
};

