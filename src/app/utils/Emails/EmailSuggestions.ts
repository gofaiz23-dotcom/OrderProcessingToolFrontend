import { fetchInboxEmails } from '@/app/api/EmailApi/Inbox';
import { fetchSentEmails } from '@/app/api/EmailApi/Sent';

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

/**
 * Fetches unique email addresses from inbox and sent emails
 */
export const fetchEmailSuggestions = async (): Promise<string[]> => {
  try {
    // Fetch both inbox and sent emails (limit to reasonable number for performance)
    const [inboxResponse, sentResponse] = await Promise.all([
      fetchInboxEmails({ limit: 100 }),
      fetchSentEmails({ limit: 100 }),
    ]);

    const emailSet = new Set<string>();

    // Extract emails from inbox (From field)
    inboxResponse.messages.forEach((message) => {
      const from = message.headers?.From || '';
      const to = message.headers?.To || '';
      extractEmailsFromHeader(from).forEach(email => emailSet.add(email));
      extractEmailsFromHeader(to).forEach(email => emailSet.add(email));
    });

    // Extract emails from sent (To field)
    sentResponse.messages.forEach((message) => {
      const to = message.headers?.To || '';
      const from = message.headers?.From || '';
      extractEmailsFromHeader(to).forEach(email => emailSet.add(email));
      extractEmailsFromHeader(from).forEach(email => emailSet.add(email));
    });

    return Array.from(emailSet).sort();
  } catch (error) {
    console.error('Error fetching email suggestions:', error);
    return [];
  }
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

