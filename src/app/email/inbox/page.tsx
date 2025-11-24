'use client';

import { AttachmentBadge, AttachmentPreviewModal } from '@/app/email/components/AttachmentPreview';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail, loadInboxEmails } from '@/app/utils/Emails/Inbox';
import { useCallback, useEffect, useMemo, useState } from 'react';

const LIMIT_OPTIONS = [10, 20, 50, 100];

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

const EmptyState = () => (
  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center text-slate-500">
    <p>No inbox emails match the current filters.</p>
  </div>
);

const InboxEmailsTable = ({
  emails,
  onAttachmentSelect,
}: {
  emails: InboxEmail[];
  onAttachmentSelect: (attachment: EmailAttachment) => void;
}) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th className="px-4 py-3">Subject</th>
          <th className="px-4 py-3">From</th>
          <th className="px-4 py-3">Received at</th>
          <th className="px-4 py-3">Attachments</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {emails.map((email) => (
          <tr key={email.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-4">
              <p className="font-medium text-slate-900">{email.subject}</p>
              <p className="text-xs text-slate-500">{email.preview || email.snippet}</p>
            </td>
            <td className="px-4 py-4">
              <p className="text-sm text-slate-900">{email.from}</p>
              <p className="text-xs text-slate-500">To: {email.to}</p>
            </td>
            <td className="px-4 py-4 text-slate-700">{formatDate(email.receivedAt)}</td>
            <td className="px-4 py-4 text-slate-900">
              {email.hasAttachments ? (
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment, index) => (
                    <AttachmentBadge
                      attachment={attachment}
                      key={`${email.id}-attachment-${index}`}
                      onClick={onAttachmentSelect}
                    />
                  ))}
                </div>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const FiltersPanel = ({
  limit,
  search,
  from,
  to,
  startDate,
  endDate,
  hasAttachments,
  onLimitChange,
  onSearchChange,
  onFromChange,
  onToChange,
  onStartDateChange,
  onEndDateChange,
  onHasAttachmentsToggle,
  onRefresh,
  busy,
}: {
  limit: number;
  search: string;
  from: string;
  to: string;
  startDate: string;
  endDate: string;
  hasAttachments: boolean;
  onLimitChange: (value: number) => void;
  onSearchChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onHasAttachmentsToggle: (checked: boolean) => void;
  onRefresh: () => void;
  busy: boolean;
}) => (
  <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      Search
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Subject, sender, snippet..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </label>

    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      Limit
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={limit}
        onChange={(event) => onLimitChange(Number(event.target.value))}
      >
        {LIMIT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option} emails
          </option>
        ))}
      </select>
    </label>

    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      From
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Sender address or name"
        value={from}
        onChange={(event) => onFromChange(event.target.value)}
      />
    </label>

    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      To
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Recipient address"
        value={to}
        onChange={(event) => onToChange(event.target.value)}
      />
    </label>

    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      Start date
      <input
        type="date"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={startDate}
        onChange={(event) => onStartDateChange(event.target.value)}
      />
    </label>

    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      End date
      <input
        type="date"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
      />
    </label>

    <label className="flex items-center gap-3 text-sm font-medium text-slate-700 sm:col-span-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        checked={hasAttachments}
        onChange={(event) => onHasAttachmentsToggle(event.target.checked)}
      />
      Show emails with attachments only
    </label>

    <div className="flex items-center gap-3 sm:col-span-2">
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
      >
        {busy ? 'Loading…' : 'Refresh'}
      </button>
      {busy && <span className="text-xs text-slate-500">Fetching latest data…</span>}
    </div>
  </div>
);

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
      setLastRefreshed(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inbox emails';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInboxEmailsData();
  }, [fetchInboxEmailsData]);

  return (
    <section className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase text-blue-600">Email</p>
          <h1 className="text-3xl font-bold text-slate-900">Inbox</h1>
          <p className="text-sm text-slate-600">
            Review recent inbound Gmail messages. Filter by sender, recipient, time window, or
            attachments to find the exact conversation you need.
          </p>
        </header>

        <FiltersPanel
          limit={limit}
          search={search}
          from={from}
          to={to}
          startDate={startDate}
          endDate={endDate}
          hasAttachments={attachmentsOnly}
          onLimitChange={setLimit}
          onSearchChange={setSearch}
          onFromChange={setFrom}
          onToChange={setTo}
          onStartDateChange={(value) => {
            setStartDate(value);
            if (endDate && value && new Date(value) > new Date(endDate)) {
              setEndDate('');
            }
          }}
          onEndDateChange={setEndDate}
          onHasAttachmentsToggle={setAttachmentsOnly}
          onRefresh={fetchInboxEmailsData}
          busy={loading}
        />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !emails.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
            Loading inbox emails…
          </div>
        ) : emails.length ? (
          <InboxEmailsTable emails={emails} onAttachmentSelect={setPreviewAttachment} />
        ) : (
          <EmptyState />
        )}

        <footer className="text-right text-xs text-slate-500">
          {lastRefreshed ? `Last updated ${formatDate(lastRefreshed)}` : 'Not updated yet'}
        </footer>

        {previewAttachment && (
          <AttachmentPreviewModal
            attachment={previewAttachment}
            onClose={() => setPreviewAttachment(null)}
          />
        )}
      </div>
    </section>
  );
};

const InboxEmailsPage = () => <InboxEmailsView />;

export default InboxEmailsPage;

