'use client';

import { memo } from 'react';
import { InboxEmail } from '@/app/utils/Emails/Inbox';
import { SentEmail } from '@/app/utils/Emails/Sent';

type EmailListItemProps = {
  email: InboxEmail | SentEmail;
  isSelected: boolean;
  onSelect: (email: InboxEmail | SentEmail) => void;
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date);
  } else if (days < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  } else {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
};

export const EmailListItem = memo(({ email, isSelected, onSelect }: EmailListItemProps) => {
  const handleClick = () => onSelect(email);
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Star/unstar functionality can be added here
  };

  // Determine if it's inbox or sent email
  const isInboxEmail = 'receivedAt' in email;
  const emailDate = isInboxEmail ? email.receivedAt : email.sentAt;
  
  // For inbox: show sender (from), for sent: show recipient (to)
  const displayName = isInboxEmail 
    ? email.from.split('<')[0].trim() || email.from
    : email.to.split('<')[0].trim() || email.to;

  return (
    <div
      onClick={handleClick}
      className={`flex cursor-pointer items-center gap-2 border-b border-slate-100 px-4 py-2 transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
    >
      {/* Star icon */}
      <button
        onClick={handleStarClick}
        className="flex-shrink-0 text-slate-400 hover:text-yellow-500"
        aria-label="Star email"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>

      {/* Sender/Recipient */}
      <div className="min-w-[120px] flex-shrink-0">
        <p className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'}`}>
          {displayName}
        </p>
      </div>

      {/* Subject and snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-sm ${isSelected ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'}`}
          >
            {email.subject || '(No subject)'}
          </p>
          {email.hasAttachments && (
            <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{email.snippet || email.preview || ''}</p>
      </div>

      {/* Time */}
      <div className="min-w-[80px] flex-shrink-0 text-right">
        <p className="text-xs text-slate-600">{formatTime(emailDate)}</p>
      </div>
    </div>
  );
});

EmailListItem.displayName = 'EmailListItem';

