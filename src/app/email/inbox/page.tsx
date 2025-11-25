'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttachmentPreviewModal } from '@/app/email/_components/shared';
import { EmailList, InboxFilters, ReadingPane } from '@/app/email/_components/inbox';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail, loadInboxEmails } from '@/app/utils/Emails/Inbox';

export const InboxEmailsView = () => {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);

  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedEmailId) ?? (emails[0] ?? null),
    [emails, selectedEmailId],
  );

  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);

  const filters = useMemo(
    () => ({
      limit,
      search: search.trim() || undefined,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
      hasAttachments: attachmentsOnly ? true : undefined,
      dateRange: {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined,
      },
    }),
    [attachmentsOnly, endDate, from, limit, search, startDate, to],
  );

  const fetchInboxEmailsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadInboxEmails(filters);
      setEmails(data);
      // keep current selection if possible
      if (data.length && !selectedEmailId) {
        setSelectedEmailId(data[0].id);
      } else if (selectedEmailId) {
        const stillExists = data.find((d) => d.id === selectedEmailId);
        if (!stillExists) setSelectedEmailId(data[0]?.id ?? null);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inbox emails';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedEmailId]);

  useEffect(() => {
    fetchInboxEmailsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInboxEmailsData]);

  const handleApply = useCallback(() => {
    setSelectedEmailId(null);
    fetchInboxEmailsData();
  }, [fetchInboxEmailsData]);

  const handleEmailSelect = useCallback((email: InboxEmail) => {
    setSelectedEmailId(email.id);
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Filters in single line at top */}
      <InboxFilters
        search={search}
        limit={limit}
        from={from}
        to={to}
        startDate={startDate}
        endDate={endDate}
        attachmentsOnly={attachmentsOnly}
        onSearchChange={setSearch}
        onLimitChange={setLimit}
        onFromChange={setFrom}
        onToChange={setTo}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAttachmentsOnlyToggle={setAttachmentsOnly}
        onApply={handleApply}
        onRefresh={fetchInboxEmailsData}
      />

      {/* Main content area - split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Email list - Gmail style */}
        <div className="w-2/5 flex-shrink-0 overflow-auto border-r border-slate-200">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmail?.id ?? null}
            loading={loading}
            error={error}
            onEmailSelect={handleEmailSelect}
          />
        </div>

        {/* Right reading pane */}
        <aside className="flex-1 overflow-auto bg-white">
          <ReadingPane email={selectedEmail ?? null} onAttachmentPreview={setPreviewAttachment} />
        </aside>
      </div>

      {/* Attachment preview modal */}
      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </div>
  );
};

export default function InboxEmailsPage() {
  return <InboxEmailsView />;
}
