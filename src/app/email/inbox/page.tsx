'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttachmentBadge, AttachmentPreviewModal } from '@/app/email/components/AttachmentPreview';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail, loadInboxEmails } from '@/app/utils/Emails/Inbox';

const LIMIT_OPTIONS = [10, 20, 50, 100];

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

/**
 * Helper: whether attachment is an image
 */
const isImage = (attachment: EmailAttachment) =>
  (attachment.contentType || '').startsWith('image/');

/**
 * Thumbnail component: shows image thumbnail or badge for non-images
 */
const AttachmentThumb = ({
  attachment,
  onClick,
  size = 64,
}: {
  attachment: EmailAttachment;
  onClick: (att: EmailAttachment) => void;
  size?: number;
}) => {
  if (isImage(attachment)) {
    return (
      <button
        onClick={() => onClick(attachment)}
        className="inline-block overflow-hidden rounded-md border border-slate-200 shadow-sm"
        style={{ width: size, height: size }}
        aria-label={`Preview ${attachment.filename}`}
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  // Non-image badge preview (small)
  return (
    <button
      onClick={() => onClick(attachment)}
      className="flex h-12 min-w-[120px] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-500">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="truncate">{attachment.filename}</span>
    </button>
  );
};

/**
 * Single email row in the middle list
 */
const EmailListItem = ({
  email,
  isSelected,
  onSelect,
}: {
  email: InboxEmail;
  isSelected: boolean;
  onSelect: (email: InboxEmail) => void;
}) => {
  return (
    <li
      onClick={() => onSelect(email)}
      className={`flex cursor-pointer items-start gap-4 px-4 py-3 transition-colors ${
        isSelected ? 'bg-slate-50 border-l-4 border-blue-600' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-3">
              <p className="truncate text-sm font-medium text-slate-900">{email.subject}</p>
              {email.isUnread && (
                <span className="ml-1 inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Unread
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{email.preview || email.snippet}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm text-slate-700">{formatDate(email.receivedAt)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {email.hasAttachments ? (
            <div className="flex gap-2">
              {email.attachments.slice(0, 3).map((att, idx) => (
                <div key={`${email.id}-att-${idx}`} className="overflow-hidden rounded-sm">
                  <AttachmentThumb attachment={att} onClick={() => onSelect(email)} size={48} />
                </div>
              ))}
              {email.attachments.length > 3 && (
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-600">
                  +{email.attachments.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No attachments</div>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * Reading pane: shows selected email body + inline media + attachments gallery
 */
const ReadingPane = ({
  email,
  onAttachmentPreview,
}: {
  email: InboxEmail | null;
  onAttachmentPreview: (att: EmailAttachment) => void;
}) => {
  if (!email) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="mb-2 font-medium">Select an email to read</p>
          <p className="text-sm">Preview attachments and inline media here</p>
        </div>
      </div>
    );
  }

  return (
    <article className="flex h-full flex-col gap-6 overflow-auto p-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{email.subject}</h2>
        <div className="mt-2 flex items-center justify-between gap-4 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-800">{email.from}</p>
            <p className="text-xs">To: {email.to}</p>
          </div>
          <div className="text-right">{formatDate(email.receivedAt)}</div>
        </div>
      </header>

      <section className="prose max-w-none break-words text-slate-700">
        {/* If your InboxEmail includes htmlBody prefer that, else render plain text */}
        {email.htmlBody ? (
          // dangerouslySetInnerHTML is often used for email HTML — sanitize server-side in production
          <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} />
        ) : (
          <pre className="whitespace-pre-wrap">{email.body || email.snippet}</pre>
        )}
      </section>

      {/* Inline media rendering */}
      <section className="flex flex-col gap-4">
        {email.attachments.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-slate-700">Attachments</h3>
            <div className="flex flex-wrap gap-3">
              {email.attachments.map((att, idx) => {
                if (isImage(att)) {
                  return (
                    <div key={idx} className="inline-block overflow-hidden rounded-md border border-slate-200 shadow-sm">
                      <img
                        src={att.url}
                        alt={att.filename}
                        className="h-36 w-36 object-cover"
                        loading="lazy"
                        onClick={() => onAttachmentPreview(att)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  );
                }

                if ((att.contentType || '').startsWith('audio/')) {
                  return (
                    <div key={idx} className="w-full max-w-md rounded-md border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-sm font-medium">{att.filename}</p>
                      <audio controls src={att.url} className="w-full" />
                    </div>
                  );
                }

                if ((att.contentType || '').startsWith('video/')) {
                  return (
                    <div key={idx} className="w-full max-w-2xl rounded-md border border-slate-200 bg-black">
                      <video controls src={att.url} className="w-full" />
                    </div>
                  );
                }

                // default: show badge (pdf, docx, etc.)
                return (
                  <div key={idx} className="inline-flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <AttachmentBadge attachment={att} onClick={onAttachmentPreview} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </article>
  );
};

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
  const selectedEmail = useMemo(() => emails.find((e) => e.id === selectedEmailId) ?? (emails[0] ?? null), [emails, selectedEmailId]);

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

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        {/* Left sidebar (narrow) */}
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Email</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Inbox</h1>
            <p className="mt-2 text-sm text-slate-500">Split pane view — select an email to preview on the right.</p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              onClick={() => {
                // reload and set first email selected
                fetchInboxEmailsData();
              }}
            >
              Refresh
            </button>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <label className="block text-xs font-medium text-slate-600">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Subject, sender, snippet..."
                className="mt-2 w-full rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <label className="block text-xs font-medium text-slate-600">Filters</label>
              <div className="mt-2 grid gap-2">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                >
                  {LIMIT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o} emails
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={attachmentsOnly} onChange={(e) => setAttachmentsOnly(e.target.checked)} />
                  Attachments only
                </label>

                <label className="text-xs text-slate-500">From</label>
                <input value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm" placeholder="sender@example.com" />

                <label className="text-xs text-slate-500">To</label>
                <input value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm" placeholder="me@example.com" />

                <div className="flex gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm" />
                </div>

                <div>
                  <button
                    onClick={() => {
                      setSelectedEmailId(null);
                      fetchInboxEmailsData();
                    }}
                    className="mt-2 w-full rounded-md bg-slate-100 px-3 py-2 text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {lastRefreshed ? `Last: ${formatDate(lastRefreshed)}` : 'Not updated yet'}
            </div>
          </div>
        </aside>

        {/* Middle list */}
        <main className="flex w-2/5 flex-col border-r border-slate-200 bg-white">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Messages</h2>
              <div className="text-xs text-slate-500">{emails.length} results</div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading && emails.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">Loading messages…</div>
            ) : error ? (
              <div className="m-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : emails.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">No messages</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {emails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isSelected={selectedEmail?.id === email.id}
                    onSelect={(e) => setSelectedEmailId(e.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* Right reading pane */}
        <aside className="flex-1 bg-slate-50">
          <div className="h-full overflow-auto p-6">
            <ReadingPane email={selectedEmail ?? null} onAttachmentPreview={setPreviewAttachment} />
          </div>
        </aside>
      </div>

      {/* Attachment preview modal (uses your existing component) */}
      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </div>
  );
};

export default function InboxEmailsPage() {
  return <InboxEmailsView />;
}
