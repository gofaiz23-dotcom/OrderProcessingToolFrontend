'use client';

import { memo } from 'react';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail } from '@/app/utils/Emails/Inbox';
import { SentEmail } from '@/app/utils/Emails/Sent';

type EmailWithDate = (InboxEmail & { dateField: 'receivedAt' }) | (SentEmail & { dateField: 'sentAt' });

type ReadingPaneProps = {
  email: InboxEmail | SentEmail | null;
  onAttachmentPreview: (att: EmailAttachment) => void;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

const normalizeBase64 = (value: string) => value.replace(/-/g, '+').replace(/_/g, '/');

const isImage = (mimeType: string) => mimeType.startsWith('image/');
const isPDF = (mimeType: string) => mimeType === 'application/pdf';

const getAttachmentDataUrl = (attachment: EmailAttachment): string | null => {
  if (!attachment.contentBase64) return null;
  const normalized = normalizeBase64(attachment.contentBase64);
  return `data:${attachment.mimeType};base64,${normalized}`;
};

export const ReadingPane = memo(({ email, onAttachmentPreview }: ReadingPaneProps) => {
  if (!email) {
    return (
      <div className="flex items-center justify-center bg-slate-50 py-20">
        <div className="text-center text-slate-500">
          <p className="mb-2 text-lg font-medium">Select an email to read</p>
          <p className="text-sm">Preview attachments and content here</p>
        </div>
      </div>
    );
  }

  // Determine if it's inbox or sent email and get the date
  const isInboxEmail = 'receivedAt' in email;
  const emailDate = isInboxEmail ? email.receivedAt : email.sentAt;

  return (
    <article className="flex flex-col bg-white">
      <style>{`
        .email-content img {
          max-width: 100% !important;
          height: auto !important;
          display: block;
          margin: 1em 0;
        }
        .email-content table {
          width: 100% !important;
          border-collapse: collapse;
        }
        .email-content a {
          color: #1a73e8;
          text-decoration: underline;
        }
        .email-content p {
          margin: 0.5em 0;
        }
        .email-content * {
          max-width: 100%;
        }
      `}</style>
      {/* Email Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-slate-900">{email.subject || '(No subject)'}</h2>
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>
            {isInboxEmail ? (
              <>
                <p className="font-medium text-slate-900">{email.from}</p>
                <p className="mt-1 text-xs text-slate-500">To: {email.to}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-900">To: {email.to}</p>
                <p className="mt-1 text-xs text-slate-500">From: {email.from}</p>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">{formatDate(emailDate)}</div>
        </div>
      </header>

      {/* Email Body - HTML or Text */}
      <section className="px-6 py-4">
        {email.htmlBody ? (
          <div
            className="email-content break-words"
            dangerouslySetInnerHTML={{ __html: email.htmlBody }}
            style={{
              fontFamily: 'Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#202124',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          />
        ) : email.textBody ? (
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 break-words">
            {email.textBody}
          </div>
        ) : email.snippet ? (
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 break-words">
            {email.snippet}
          </div>
        ) : email.preview ? (
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 break-words">
            {email.preview}
          </div>
        ) : (
          <div className="italic text-slate-500">No content available</div>
        )}
      </section>

      {/* Attachments Section */}
      {email.attachments.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex-shrink-0">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Attachments ({email.attachments.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {email.attachments.map((att, idx) => {
              const dataUrl = getAttachmentDataUrl(att);

              return (
                <div
                  key={idx}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => onAttachmentPreview(att)}
                >
                  {isImage(att.mimeType) && dataUrl ? (
                    <div className="aspect-square overflow-hidden">
                      <img src={dataUrl} alt={att.filename} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : isPDF(att.mimeType) && dataUrl ? (
                    <div className="aspect-square flex flex-col items-center justify-center bg-slate-100 p-4">
                      <svg
                        className="mb-2 h-16 w-16 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="truncate text-xs font-medium text-slate-700">{att.filename}</p>
                      <p className="mt-1 text-xs text-slate-500">Click to preview</p>
                    </div>
                  ) : (
                    <div className="aspect-square flex flex-col items-center justify-center bg-slate-50 p-4">
                      <svg
                        className="mb-2 h-12 w-12 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="truncate text-xs font-medium text-slate-600">{att.filename}</p>
                      {att.size && <p className="mt-1 text-xs text-slate-400">{(att.size / 1024).toFixed(1)} KB</p>}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
});

ReadingPane.displayName = 'ReadingPane';

