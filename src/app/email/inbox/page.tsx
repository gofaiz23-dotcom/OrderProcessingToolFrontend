'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttachmentPreviewModal, EmailFilters, ReadingPane, ResizableSplitView } from '@/app/email/_components/shared';
import { EmailList } from '@/app/email/_components/inbox';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail, loadInboxEmails } from '@/app/utils/Emails/Inbox';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

export const InboxEmailsView = () => {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const getDateRange = useCallback((filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today': {
        const start = new Date(today);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'thisWeek': {
        const start = new Date(today);
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek;
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'specificDate': {
        if (customStart) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customStart);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return undefined;
      }
      case 'custom': {
        if (customStart && customEnd) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }, []);

  const filters = useMemo(() => {
    const dateRange = getDateRange(dateFilter, startDate, endDate);
    return {
      limit,
      search: search.trim() || undefined,
      hasAttachments: attachmentsOnly ? true : undefined,
      dateRange: dateRange
        ? {
            start: dateRange.start,
            end: dateRange.end,
          }
        : undefined,
    };
  }, [attachmentsOnly, limit, search, dateFilter, startDate, endDate, getDateRange]);

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

  const handleClear = useCallback(() => {
    setSearch('');
    setLimit(20);
    setAttachmentsOnly(false);
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setSelectedEmailId(null);
  }, []);

  const handleDateFilterChange = useCallback((option: DateFilterOption) => {
    setDateFilter(option);
    if (option !== 'custom' && option !== 'specificDate') {
      setStartDate('');
      setEndDate('');
    } else if (option === 'specificDate') {
      setEndDate('');
    }
  }, []);

  const handleEmailSelect = useCallback((email: InboxEmail) => {
    setSelectedEmailId(email.id);
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Filters in single line at top */}
      <EmailFilters
        search={search}
        limit={limit}
        attachmentsOnly={attachmentsOnly}
        dateFilter={dateFilter}
        startDate={startDate}
        endDate={endDate}
        loading={loading}
        onSearchChange={setSearch}
        onLimitChange={setLimit}
        onAttachmentsOnlyToggle={setAttachmentsOnly}
        onDateFilterChange={handleDateFilterChange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={handleClear}
      />

      {/* Main content area - resizable split view */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplitView
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={80}
          left={
            <div className="h-full border-r border-slate-200">
              <EmailList
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
              <ReadingPane email={selectedEmail ?? null} loading={loading} onAttachmentPreview={setPreviewAttachment} />
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

export default function InboxEmailsPage() {
  return <InboxEmailsView />;
}
