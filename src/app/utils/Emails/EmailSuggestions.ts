import { fetchInboxEmails } from '@/app/api/EmailApi/Inbox';
import { fetchSentEmails } from '@/app/api/EmailApi/Sent';
import { ApiError, extractErrorInfo } from '@/app/utils/Errors/ApiError';

/**
 * Extracts email addresses from a header string (From/To field)
 * Handles formats like:
 * - "user@example.com"
 * - "Name <user@example.com>"
 * - "user@example.com, another@example.com"
 */
const extractEmailsFromHeader = (header: string): string[] => {
  if (!header || header === 'Unknown sender' || header === 'Unknown recipient') {
    return [];
  }

  const emails: string[] = [];
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
  const matches = header.match(emailRegex);
  
  if (matches) {
    emails.push(...matches.map(email => email.toLowerCase()));
  }

  return emails;
};

// Cache for email suggestions with TTL (5 minutes)
const CACHE_KEY = 'email_suggestions_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetches unique email addresses from inbox and sent emails
 * Gracefully handles errors - if one source fails, still returns results from the other
 * Uses caching to avoid refetching on every compose page load
 */

interface CachedSuggestions {
  suggestions: string[];
  timestamp: number;
}

const getCachedSuggestions = (): string[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedSuggestions = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_TTL) {
      return parsed.suggestions;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const setCachedSuggestions = (suggestions: string[]): void => {
  try {
    const cache: CachedSuggestions = {
      suggestions,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

export const fetchEmailSuggestions = async (): Promise<string[]> => {
  // Check cache first
  const cached = getCachedSuggestions();
  if (cached) {
    return cached;
  }

  const emailSet = new Set<string>();

  // Use Promise.allSettled to handle partial failures gracefully
  // Reduced fetch size from 100 to 15 per folder for better performance
  const [inboxResult, sentResult] = await Promise.allSettled([
    fetchInboxEmails({ limit: 15 }),
    fetchSentEmails({ limit: 15 }),
  ]);

  // Process inbox emails if successful
  if (inboxResult.status === 'fulfilled') {
    inboxResult.value.messages.forEach((message) => {
      const from = message.headers?.From || '';
      const to = message.headers?.To || '';
      extractEmailsFromHeader(from).forEach(email => emailSet.add(email));
      extractEmailsFromHeader(to).forEach(email => emailSet.add(email));
    });
  } else {
    // Only log non-auth errors (auth errors are expected and handled elsewhere)
    const error = inboxResult.reason;
    const { isAuthError } = extractErrorInfo(error);
    if (!isAuthError) {
      console.warn('Failed to fetch inbox emails for suggestions:', error);
    }
  }

  // Process sent emails if successful
  if (sentResult.status === 'fulfilled') {
    sentResult.value.messages.forEach((message) => {
      const to = message.headers?.To || '';
      const from = message.headers?.From || '';
      extractEmailsFromHeader(to).forEach(email => emailSet.add(email));
      extractEmailsFromHeader(from).forEach(email => emailSet.add(email));
    });
  } else {
    // Only log non-auth errors (auth errors are expected and handled elsewhere)
    const error = sentResult.reason;
    const { isAuthError } = extractErrorInfo(error);
    if (!isAuthError) {
      console.warn('Failed to fetch sent emails for suggestions:', error);
    }
  }

  const suggestions = Array.from(emailSet).sort();
  
  // Cache the results
  setCachedSuggestions(suggestions);
  
  return suggestions;
};

/**
 * Filters email suggestions based on user input
 */
export const filterEmailSuggestions = (
  suggestions: string[],
  query: string,
  excludeEmails: string[] = []
): string[] => {
  if (!query.trim()) {
    return suggestions.filter(email => !excludeEmails.includes(email)).slice(0, 10);
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  return suggestions
    .filter(email => {
      // Exclude already added emails
      if (excludeEmails.includes(email)) {
        return false;
      }
      // Filter by query
      return email.toLowerCase().includes(normalizedQuery);
    })
    .slice(0, 10); // Limit to 10 suggestions
};

