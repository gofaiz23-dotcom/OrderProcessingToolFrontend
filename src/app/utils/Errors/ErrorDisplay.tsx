'use client';

import { AlertCircle, ExternalLink } from 'lucide-react';
import { extractErrorInfo } from './ApiError';
import { buildApiUrl } from '../../../../BaseUrl';

type ErrorDisplayProps = {
  error: unknown;
  className?: string;
  showAuthLink?: boolean;
};

export const ErrorDisplay = ({ error, className = '', showAuthLink = true }: ErrorDisplayProps) => {
  const { message, isAuthError, isRateLimitError, retryAfter } = extractErrorInfo(error);

  const authUrl = buildApiUrl('/auth/google/start');

  // Format retry after time for display
  const formatRetryAfter = (retryAfter: string | null): string => {
    if (!retryAfter) return '';
    
    try {
      const retryDate = new Date(retryAfter);
      const now = new Date();
      const diffMs = retryDate.getTime() - now.getTime();
      
      if (diffMs <= 0) return '';
      
      const diffSec = Math.ceil(diffMs / 1000);
      if (diffSec < 60) {
        return `in ${diffSec} second${diffSec !== 1 ? 's' : ''}`;
      }
      
      const diffMin = Math.ceil(diffSec / 60);
      if (diffMin < 60) {
        return `in ${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
      }
      
      const diffHour = Math.ceil(diffMin / 60);
      return `in ${diffHour} hour${diffHour !== 1 ? 's' : ''}`;
    } catch {
      return '';
    }
  };

  const retryAfterText = formatRetryAfter(retryAfter);

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        isAuthError
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : isRateLimitError
          ? 'border-orange-200 bg-orange-50 text-orange-800'
          : 'border-red-200 bg-red-50 text-red-700'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {isRateLimitError
              ? 'Too Many Requests - Rate Limit Exceeded'
              : message}
          </p>
          {isRateLimitError && (
            <p className="mt-1.5 text-xs">
              {retryAfterText
                ? `The request will be retried automatically ${retryAfterText}. Please wait...`
                : 'The request is being retried automatically. Please wait a moment...'}
            </p>
          )}
          {isAuthError && showAuthLink && (
            <div className="mt-2">
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2 transition-colors"
              >
                <span>Authorize with Google</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 text-xs text-amber-700">
                This will open in a new window. After authorizing, refresh this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

