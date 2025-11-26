import { fetchSentEmails, RawSentEmail, SentEmailQueryOptions } from '@/app/api/EmailApi/Sent';
import { EmailAttachment } from '@/app/types/email';
import { getCachedEmailList, setCachedEmailList } from '@/app/utils/cache/emailCache';
import { 
  getCachedEmails, 
  setCachedEmails, 
  checkCachedEmailIds,
  getCachedEmail 
} from '@/app/utils/cache/emailStorageCache';

export type SentEmailFilters = SentEmailQueryOptions & {
  search?: string;
  recipient?: string;
  from?: string;
  hasAttachments?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
};

export type SentEmail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  sentAt: Date;
  preview: string;
  snippet: string;
  attachmentsCount: number;
  hasAttachments: boolean;
  attachments: EmailAttachment[];
  htmlBody?: string | null;
  textBody?: string | null;
};

const normalizeDate = (message: RawSentEmail) => {
  if (message.internalDate) {
    const millis = Number(message.internalDate);
    if (!Number.isNaN(millis)) {
      return new Date(millis);
    }
  }

  const fallback = message.headers?.Date;
  if (fallback) {
    const parsed = new Date(fallback);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  return new Date();
};

// In-memory store for full email details (keyed by email ID)
const fullEmailStore = new Map<string, SentEmail>();

/**
 * Store full email details in memory for later retrieval
 */
const storeFullEmail = (email: SentEmail): void => {
  fullEmailStore.set(email.id, email);
};

/**
 * Get full email details from memory if available
 */
export const getFullSentEmail = (emailId: string): SentEmail | null => {
  return fullEmailStore.get(emailId) ?? null;
};

/**
 * Creates a lightweight email object for list views (metadata-only)
 * Strips heavy fields like textBody, htmlBody, and attachment contentBase64
 */
const toReadableSentEmail = (message: RawSentEmail, lightweight: boolean = false): SentEmail => {
  const headers = message.headers ?? {};
  const attachmentsCount = (message.attachments ?? []).length;
  
  // For lightweight version, only include attachment metadata (no contentBase64)
  // For full version, include all attachment data
  const attachments: EmailAttachment[] = lightweight
    ? (message.attachments ?? []).map((attachment) => ({
        filename: attachment.filename ?? 'attachment',
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        size: attachment.size,
        // Don't include contentBase64 in lightweight mode - lazy load when email is opened
        contentBase64: undefined,
      }))
    : (message.attachments ?? []).map((attachment) => ({
        filename: attachment.filename ?? 'attachment',
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        size: attachment.size,
        contentBase64: attachment.contentBase64,
      }));

  return {
    id: message.id,
    threadId: message.threadId,
    subject: headers.Subject ?? 'No subject',
    from: headers.From ?? 'Unknown sender',
    to: headers.To ?? 'Unknown recipient',
    cc: headers.Cc,
    bcc: headers.Bcc,
    sentAt: normalizeDate(message),
    preview: message.textBody ?? message.htmlBody ?? message.snippet ?? '',
    snippet: message.snippet ?? '',
    attachmentsCount,
    hasAttachments: attachmentsCount > 0,
    attachments,
    // For lightweight version, don't store full body content - lazy load when opened
    htmlBody: lightweight ? null : (message.htmlBody ?? null),
    textBody: lightweight ? null : (message.textBody ?? null),
  };
};

/**
 * Enriches a lightweight email with full content from cache (for when email is opened)
 * Checks both memory store and emailStorageCache
 */
export const enrichSentEmail = (email: SentEmail): SentEmail => {
  // Check if email already has full content
  if (email.textBody !== null || email.htmlBody !== null || 
      (email.attachments.length > 0 && email.attachments[0]?.contentBase64)) {
    return email;
  }

  // Try to get full email from memory store first (fastest)
  const fullEmail = fullEmailStore.get(email.id);
  if (fullEmail) {
    return fullEmail;
  }

  // Try to get from emailStorageCache (persistent cache)
  const cachedFullEmail = getCachedEmail<SentEmail>(email.id);
  if (cachedFullEmail && (cachedFullEmail.textBody !== null || cachedFullEmail.htmlBody !== null)) {
    // Restore date - ensure it's a Date object
    const restored = {
      ...cachedFullEmail,
      sentAt: cachedFullEmail.sentAt instanceof Date 
        ? cachedFullEmail.sentAt 
        : new Date(cachedFullEmail.sentAt),
    };
    // Store in memory for faster access next time
    storeFullEmail(restored);
    return restored;
  }

  // If not found in store, return lightweight version as-is
  // (This should rarely happen, but we handle it gracefully)
  return email;
};

const matchesSearch = (value: string, query?: string) => {
  if (!query) return true;
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedValue.includes(normalizedQuery);
};

const withinDateRange = (date: Date, range?: SentEmailFilters['dateRange']) => {
  if (!range) return true;
  const timestamp = date.valueOf();
  if (range.start && timestamp < range.start.valueOf()) return false;
  if (range.end && timestamp > range.end.valueOf()) return false;
  return true;
};

const applyFilters = (emails: SentEmail[], filters: SentEmailFilters): SentEmail[] =>
  emails.filter((email) => {
    if (!matchesSearch(
      [email.subject, email.from, email.to, email.preview, email.snippet].join(' '),
      filters.search,
    )) {
      return false;
    }

    if (filters.recipient && !matchesSearch(email.to, filters.recipient)) {
      return false;
    }

    if (filters.from && !matchesSearch(email.from, filters.from)) {
      return false;
    }

    if (
      typeof filters.hasAttachments === 'boolean' &&
      email.hasAttachments !== filters.hasAttachments
    ) {
      return false;
    }

    if (!withinDateRange(email.sentAt, filters.dateRange)) {
      return false;
    }

    return true;
  });

/**
 * Load sent emails with smart caching - CHECK CACHE FIRST, only call API if needed
 * 
 * Strategy:
 * 1. Check cache FIRST - if we have emails, use them (NO API CALL)
 * 2. Only fetch from API if we don't have enough cached emails
 * 3. Store all fetched emails in cache for future use
 * 
 * @param filters - Filter options
 * @param useCache - Whether to use cache (default: true)
 * @param lightweight - Whether to create lightweight emails without heavy content (default: true)
 * @param requiredCount - How many emails we need (for progressive loading)
 */
export const loadSentEmails = async (
  filters: SentEmailFilters = {},
  useCache: boolean = true,
  lightweight: boolean = true,
  requiredCount?: number
): Promise<SentEmail[]> => {
  const limit = filters.limit || 10;
  const neededCount = requiredCount || limit;
  
  // STEP 1: Check cache FIRST - try to get emails from cache
  if (useCache) {
    // Check old list cache first (faster for exact filter matches)
    // Use neededCount in the cache check, not filters.limit
    const cacheFilters = { ...filters, limit: neededCount };
    const cachedList = getCachedEmailList<any>('sent', cacheFilters);
    if (cachedList && cachedList.length >= neededCount) {
      // We have enough cached emails - return immediately (NO API CALL)
      const restored = cachedList.slice(0, neededCount).map((email: any) => ({
        ...email,
        // Ensure sentAt is always a Date object (handle string from cache)
        sentAt: email.sentAt instanceof Date ? email.sentAt : new Date(email.sentAt),
        attachments: email.attachments || [],
      })) as SentEmail[];
      
      return restored;
    }
  }

  // STEP 2: We don't have enough in cache, fetch from API
  const response = await fetchSentEmails({ limit: neededCount });
  
  // STEP 3: Check which emails we already have in emailStorageCache
  const fetchedEmailIds = response.messages.map(msg => msg.id);
  const { cached: cachedIds, missing: missingIds } = useCache 
    ? checkCachedEmailIds(fetchedEmailIds)
    : { cached: [], missing: fetchedEmailIds };
  
  // STEP 4: Get cached emails from emailStorageCache
  let cachedEmails: SentEmail[] = [];
  if (useCache && cachedIds.length > 0) {
    const cached = getCachedEmails<SentEmail>(cachedIds);
    cachedEmails = cached.map((email: any) => ({
      ...email,
      // Ensure sentAt is always a Date object (handle string from cache)
      sentAt: email.sentAt instanceof Date ? email.sentAt : new Date(email.sentAt),
      attachments: email.attachments || [],
    }));
  }
  
  // STEP 5: Process only NEW emails (not in cache)
  const newMessages = response.messages.filter(msg => missingIds.includes(msg.id));
  
  // Process new emails
  const newFullEmails = newMessages.map((msg) => toReadableSentEmail(msg, false));
  newFullEmails.forEach(storeFullEmail);
  
  // Also store full emails in emailStorageCache for email reading
  if (useCache && newFullEmails.length > 0) {
    const fullEmailsToCache = newFullEmails.map(email => ({
      ...email,
      sentAt: email.sentAt.toISOString(),
    }));
    setCachedEmails(fullEmailsToCache, 'sent');
  }
  
  // Create lightweight versions for new emails
  const newLightweightEmails = lightweight
    ? newMessages.map((msg) => toReadableSentEmail(msg, true))
    : newFullEmails;
  
  // STEP 6: Merge cached + new emails, maintaining order
  const allEmails: SentEmail[] = [];
  const emailMap = new Map<string, SentEmail>();
  
  // Add cached emails to map
  cachedEmails.forEach(email => emailMap.set(email.id, email));
  
  // Add new emails to map
  newLightweightEmails.forEach(email => emailMap.set(email.id, email));
  
  // Maintain order from API response
  fetchedEmailIds.forEach(id => {
    const email = emailMap.get(id);
    if (email) {
      allEmails.push(email);
    }
  });
  
  // STEP 7: Store all emails in emailStorageCache for future use
  if (useCache && newLightweightEmails.length > 0) {
    const emailsToCache = newLightweightEmails.map(email => ({
      ...email,
      sentAt: email.sentAt.toISOString(),
    }));
    setCachedEmails(emailsToCache, 'sent');
  }
  
  // STEP 8: Apply filters
  const filtered = applyFilters(allEmails, filters);
  
  // STEP 9: Update the list cache for future quick access
  // Cache with the actual limit used (neededCount), not filters.limit
  if (useCache) {
    try {
      const cacheData = filtered.map(email => ({
        ...email,
        sentAt: email.sentAt instanceof Date 
          ? email.sentAt.toISOString() 
          : email.sentAt,
      }));
      const cacheFilters = { ...filters, limit: neededCount };
      setCachedEmailList('sent', cacheFilters, cacheData);
    } catch {
      // Ignore cache errors
    }
  }
  
  return filtered;
};

