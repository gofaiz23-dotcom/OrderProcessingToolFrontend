import { fetchSentEmails, RawSentEmail, SentEmailQueryOptions } from '@/app/api/EmailApi/Sent';
import { EmailAttachment } from '@/app/types/email';

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

const toReadableSentEmail = (message: RawSentEmail): SentEmail => {
  const headers = message.headers ?? {};
  const attachments: EmailAttachment[] = (message.attachments ?? []).map((attachment) => ({
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
    sentAt: normalizeDate(message),
    preview: message.textBody ?? message.htmlBody ?? message.snippet ?? '',
    snippet: message.snippet ?? '',
    attachmentsCount: attachments.length,
    hasAttachments: attachments.length > 0,
    attachments,
    htmlBody: message.htmlBody,
    textBody: message.textBody,
  };
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

export const loadSentEmails = async (filters: SentEmailFilters = {}): Promise<SentEmail[]> => {
  const response = await fetchSentEmails({ limit: filters.limit });
  const readableEmails = response.messages.map(toReadableSentEmail);
  return applyFilters(readableEmails, filters);
};

