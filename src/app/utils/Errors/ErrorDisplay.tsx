'use client';

import { AlertCircle, ExternalLink, Clock } from 'lucide-react';
import { extractErrorInfo } from './ApiError';
import { buildApiUrl } from '../../../../BaseUrl';
import { useEffect, useState } from 'react';

type ErrorDisplayProps = {
  error: unknown;
  className?: string;
  showAuthLink?: boolean;
};

const RateLimitCountdown = ({ retryAfter }: { retryAfter: string }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      try {
        const retryDate = new Date(retryAfter);
        const now = new Date();
        const diff = Math.max(0, retryDate.getTime() - now.getTime());

        if (diff === 0) {
          setTimeRemaining('You can retry now');
          return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }
      } catch {
        setTimeRemaining('Calculating...');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
      <Clock className="h-3.5 w-3.5" />
      <span>Retry after: {timeRemaining}</span>
    </div>
  );
};

export const ErrorDisplay = ({ error, className = '', showAuthLink = true }: ErrorDisplayProps) => {
  const { message, isAuthError, isRateLimitError, retryAfter } = extractErrorInfo(error);

  const authUrl = buildApiUrl('/auth/google/start');

  // Determine styling based on error type
  const isWarning = isAuthError || isRateLimitError;
  const borderColor = isWarning ? 'border-amber-200' : 'border-red-200';
  const bgColor = isWarning ? 'bg-amber-50' : 'bg-red-50';
  const textColor = isWarning ? 'text-amber-800' : 'text-red-700';

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${borderColor} ${bgColor} ${textColor} ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{message}</p>
          {isRateLimitError && retryAfter && (
            <RateLimitCountdown retryAfter={retryAfter} />
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

