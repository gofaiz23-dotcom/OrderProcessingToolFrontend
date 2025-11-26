'use client';

import { memo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { EmailListItem } from '../shared/EmailListItem';
import { EmailListItemSkeleton } from '../shared/EmailListItemSkeleton';
import { InboxEmail } from '@/app/utils/Emails/Inbox';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

type EmailListProps = {
  emails: InboxEmail[];
  selectedEmailId: string | null;
  loading: boolean;
  loadingMore?: boolean;
  error: unknown;
  onEmailSelect: (email: InboxEmail) => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  canNavigateNext?: boolean;
  canNavigatePrevious?: boolean;
  currentPage?: number;
  totalPages?: number;
};

export const EmailList = memo(({ 
  emails, 
  selectedEmailId, 
  loading, 
  loadingMore = false,
  error, 
  onEmailSelect,
  onNavigateNext,
  onNavigatePrevious,
  canNavigateNext = false,
  canNavigatePrevious = false,
  currentPage = 1,
  totalPages = 1,
}: EmailListProps) => {
  if (loading && emails.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {Array.from({ length: 10 }).map((_, index) => (
            <EmailListItemSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <ErrorDisplay error={error} />
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center text-sm text-slate-600">
          No messages
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onSelect={(e) => onEmailSelect(e as InboxEmail)}
          />
        ))}
        {(loading || loadingMore) && (
          <>
            {Array.from({ length: emails.length > 0 ? 3 : 10 }).map((_, index) => (
              <EmailListItemSkeleton key={`skeleton-${index}`} />
            ))}
          </>
        )}
      </div>
      
      {/* Navigation Buttons - Always show if we have pages or are loading */}
      {(totalPages > 1 || loading || loadingMore) && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onNavigatePrevious}
            disabled={!canNavigatePrevious || loading || loadingMore}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              canNavigatePrevious && !loading && !loadingMore
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Previous page"
          >
            <ChevronUp className="h-4 w-4" />
            <span>Previous</span>
          </button>
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages || 1}
          </div>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={!canNavigateNext || loadingMore || loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              canNavigateNext && !loadingMore && !loading
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title={loadingMore || loading ? "Loading..." : "Next page"}
          >
            <span>Next</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
});

EmailList.displayName = 'EmailList';

