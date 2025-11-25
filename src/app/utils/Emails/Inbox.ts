import { fetchInboxEmails, InboxEmailQueryOptions, RawInboxEmail } from '@/app/api/EmailApi/Inbox';
import { EmailAttachment } from '@/app/types/email';

export type InboxEmailFilters = InboxEmailQueryOptions & {
  search?: string;
  from?: string;
  to?: string;
  hasAttachments?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
};

export type InboxEmail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: Date;
  preview: string;
  snippet: string;
  textBody?: string | null;
  htmlBody?: string | null;
  attachmentsCount: number;
  hasAttachments: boolean;
  attachments: EmailAttachment[];
};

const normalizeDate = (message: RawInboxEmail) => {
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

const toReadableInboxEmail = (message: RawInboxEmail): InboxEmail => {
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
    receivedAt: normalizeDate(message),
    preview: message.textBody ?? message.htmlBody ?? message.snippet ?? '',
    snippet: message.snippet ?? '',
    textBody: message.textBody ?? null,
    htmlBody: message.htmlBody ?? null,
    attachmentsCount: attachments.length,
    hasAttachments: attachments.length > 0,
    attachments,
  };
};

const matchesSearch = (value: string, query?: string) => {
  if (!query) return true;
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedValue.includes(normalizedQuery);
};

const withinDateRange = (date: Date, range?: InboxEmailFilters['dateRange']) => {
  if (!range) return true;
  const timestamp = date.valueOf();
  if (range.start && timestamp < range.start.valueOf()) return false;
  if (range.end && timestamp > range.end.valueOf()) return false;
  return true;
};

const applyFilters = (emails: InboxEmail[], filters: InboxEmailFilters) =>
  emails.filter((email) => {
    if (
      !matchesSearch(
        [email.subject, email.from, email.to, email.preview, email.snippet].join(' '),
        filters.search,
      )
    ) {
      return false;
    }

    if (filters.from && !matchesSearch(email.from, filters.from)) {
      return false;
    }

    if (filters.to && !matchesSearch(email.to, filters.to)) {
      return false;
    }

    if (
      typeof filters.hasAttachments === 'boolean' &&
      email.hasAttachments !== filters.hasAttachments
    ) {
      return false;
    }

    if (!withinDateRange(email.receivedAt, filters.dateRange)) {
      return false;
    }

    return true;
  });

export const loadInboxEmails = async (filters: InboxEmailFilters = {}): Promise<InboxEmail[]> => {
  const response = await fetchInboxEmails({ limit: filters.limit });
  const readableEmails = response.messages.map(toReadableInboxEmail);
  return applyFilters(readableEmails, filters);
};

