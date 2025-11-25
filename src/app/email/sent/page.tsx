'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttachmentPreviewModal, ReadingPane, ResizableSplitView } from '@/app/email/_components/shared';
import { SentEmailList, SentFilters } from '@/app/email/_components/sent';
import { EmailAttachment } from '@/app/types/email';
import { loadSentEmails, SentEmail } from '@/app/utils/Emails/Sent';

export const SentEmailsView = () => {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);

  const [emails, setEmails] = useState<SentEmail[]>([]);
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

  const fetchSentEmailsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadSentEmails(filters);
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
      const message = err instanceof Error ? err.message : 'Failed to load sent emails';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedEmailId]);

  useEffect(() => {
    fetchSentEmailsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSentEmailsData]);

  const handleApply = useCallback(() => {
    setSelectedEmailId(null);
    fetchSentEmailsData();
  }, [fetchSentEmailsData]);

  const handleEmailSelect = useCallback((email: SentEmail) => {
    setSelectedEmailId(email.id);
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Filters in single line at top */}
      <SentFilters
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
        onRefresh={fetchSentEmailsData}
      />

      {/* Main content area - resizable split view */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplitView
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={80}
          left={
            <div className="h-full border-r border-slate-200">
              <SentEmailList
                emails={emails}
                selectedEmailId={selectedEmail?.id ?? null}
                loading={loading}
                error={error}
                onEmailSelect={handleEmailSelect}
              />
            </div>
          }
          right={
            <div className="h-full bg-white overflow-auto">
              <ReadingPane email={selectedEmail ?? null} onAttachmentPreview={setPreviewAttachment} />
            </div>
          }
        />
      </div>

      {/* Attachment preview modal */}
      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </div>
  );
};

export default function SentEmailsPage() {
  return <SentEmailsView />;
}
