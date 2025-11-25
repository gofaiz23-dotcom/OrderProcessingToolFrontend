'use client';

import { memo } from 'react';
import { EmailListItem } from '../shared/EmailListItem';
import { SentEmail } from '@/app/utils/Emails/Sent';

type SentEmailListProps = {
  emails: SentEmail[];
  selectedEmailId: string | null;
  loading: boolean;
  error: string | null;
  onEmailSelect: (email: SentEmail) => void;
};

export const SentEmailList = memo(({ emails, selectedEmailId, loading, error, onEmailSelect }: SentEmailListProps) => {
  if (loading && emails.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading messages…</div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  if (emails.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-600">No messages</div>;
  }

  return (
    <div className="h-full">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isSelected={selectedEmailId === email.id}
          onSelect={(e) => onEmailSelect(e as SentEmail)}
        />
      ))}
    </div>
  );
});

SentEmailList.displayName = 'SentEmailList';

