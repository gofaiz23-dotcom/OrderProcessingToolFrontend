import API_BASE_URL, { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

export type SentEmailQueryOptions = {
  limit?: number;
};

export type RawSentEmail = {
  id: string;
  threadId: string;
  snippet: string;
  internalDate?: string;
  headers?: Record<string, string>;
  textBody?: string | null;
  htmlBody?: string | null;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size?: number;
    contentBase64?: string;
  }>;
};

export type SentEmailApiResponse = {
  count: number;
  messages: RawSentEmail[];
};

const clampLimit = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.min(Math.max(Math.floor(value), 1), 100);
};

export const fetchSentEmails = async (
  query: SentEmailQueryOptions = {},
): Promise<SentEmailApiResponse> => {
  const limit = clampLimit(query.limit);
  const endpoint = new URL(buildApiUrl('/emails/sent'));

  if (limit) {
    endpoint.searchParams.set('limit', String(limit));
  }

  const response = await fetch(endpoint.toString(), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

export { API_BASE_URL };

