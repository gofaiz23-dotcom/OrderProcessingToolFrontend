'use client';

import { memo, useState } from 'react';
import { Reply, Forward } from 'lucide-react';
import { EmailAttachment } from '@/app/types/email';
import { InboxEmail } from '@/app/utils/Emails/Inbox';
import { SentEmail } from '@/app/utils/Emails/Sent';
import { ReadingPaneSkeleton } from './ReadingPaneSkeleton';
import { InlineReply } from './InlineReply';

type EmailWithDate = (InboxEmail & { dateField: 'receivedAt' }) | (SentEmail & { dateField: 'sentAt' });

type ReadingPaneProps = {
  email: InboxEmail | SentEmail | null;
  loading?: boolean;
  onAttachmentPreview: (att: EmailAttachment) => void;
};

const formatDate = (date: Date | string) => {
  // Ensure date is a Date object (handle cases where it might be a string from cache)
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateObj);
};

const normalizeBase64 = (value: string) => value.replace(/-/g, '+').replace(/_/g, '/');

const isImage = (mimeType: string) => mimeType.startsWith('image/');
const isPDF = (mimeType: string) => mimeType === 'application/pdf';

const getAttachmentDataUrl = (attachment: EmailAttachment): string | null => {
  if (!attachment.contentBase64) return null;
  const normalized = normalizeBase64(attachment.contentBase64);
  return `data:${attachment.mimeType};base64,${normalized}`;
};

export const ReadingPane = memo(({ email, loading = false, onAttachmentPreview }: ReadingPaneProps) => {
  const [showReply, setShowReply] = useState(false);
  const [replyData, setReplyData] = useState<{
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
  } | null>(null);
  const [showForward, setShowForward] = useState(false);
  const [forwardData, setForwardData] = useState<{
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    attachments: File[];
  } | null>(null);

  if (loading) {
    return <ReadingPaneSkeleton />;
  }

  if (!email) {
    return null;
  }

  // Determine if it's inbox or sent email and get the date
  const isInboxEmail = 'receivedAt' in email;
  const emailDateRaw = isInboxEmail ? email.receivedAt : email.sentAt;
  // Ensure date is a Date object (handle cases where it might be a string from cache)
  const emailDate = emailDateRaw instanceof Date ? emailDateRaw : new Date(emailDateRaw);

  // Extract email address from "Name <email@example.com>" or just "email@example.com"
  const extractEmailAddress = (emailString: string): string => {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString.trim();
  };
  
  // Extract all email addresses from a comma-separated list (may contain "Name <email>" format)
  const extractEmailAddresses = (emailString: string): string[] => {
    if (!emailString) return [];
    // Split by comma, then extract email from each part
    return emailString
      .split(',')
      .map(part => extractEmailAddress(part.trim()))
      .filter(Boolean);
  };

  // Handle Reply - show inline reply box
  const handleReply = () => {
    // Extract email address to reply to
    const fromEmail = email.from || '';
    const toEmail = email.to || '';
    const replyToEmail = isInboxEmail ? fromEmail : toEmail;
    const replyTo = extractEmailAddress(replyToEmail);
    
    // Validate that we have an email address to reply to
    if (!replyTo || !replyTo.includes('@')) {
      console.error('Cannot reply: No valid email address found', { fromEmail, toEmail, isInboxEmail });
      alert('Cannot reply: No valid email address found');
      return;
    }
    
    // Get subject - ensure it's not empty
    const originalSubject = email.subject || '(No subject)';
    const replySubject = originalSubject.startsWith('Re: ') ? originalSubject : `Re: ${originalSubject}`;
    
    // Extract CC and BCC from original email
    const originalCc = email.cc || '';
    const originalBcc = email.bcc || '';
    const originalTo = email.to || '';
    
    // Parse CC/BCC/To strings into arrays and extract email addresses properly
    const ccList = extractEmailAddresses(originalCc);
    const bccList = extractEmailAddresses(originalBcc);
    const toList = extractEmailAddresses(originalTo);
    
    // For replies, add other "To" recipients to CC (standard email behavior)
    // Exclude the current user's email if present
    const otherToRecipients = toList.filter(addr => {
      const addrLower = addr.toLowerCase();
      return addrLower !== replyTo.toLowerCase() && addrLower.includes('@');
    });
    
    // Combine original CC with other To recipients, avoiding duplicates
    const combinedCc = [...new Set([...ccList, ...otherToRecipients])].filter(addr => addr.includes('@'));
    
    // Prepare reply data for inline reply
    const newReplyData = {
      to: [replyTo],
      cc: combinedCc,
      bcc: bccList.filter(addr => addr.includes('@')),
      subject: replySubject,
    };
    
    // Set reply data and show reply box
    setReplyData(newReplyData);
    setShowReply(true);
  };

  // Handle closing reply
  const handleCloseReply = () => {
    setShowReply(false);
    setReplyData(null);
  };

  // Handle successful send
  const handleReplySent = () => {
    setShowReply(false);
    setReplyData(null);
  };

  // Helper function to convert base64 to File object
  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    // Normalize base64 (handle URL-safe base64)
    const normalizedBase64 = normalizeBase64(base64);
    
    // Convert base64 to binary
    const byteCharacters = atob(normalizedBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    return new File([blob], filename, { type: mimeType });
  };

  // Handle Forward - show inline forward box
  const handleForward = () => {
    const forwardSubject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
    
    // Build forward body with standard email forwarding format (Gmail-style)
    const originalBody = email.htmlBody || email.textBody || email.snippet || '';
    
    // Format date for email header
    const emailDateFormatted = formatDate(emailDate);
    
    // Create HTML version with proper styling
    const forwardHeaderHtml = `
<div style="color: #666; font-size: 12px; line-height: 1.5; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
<div style="font-family: monospace; white-space: pre-wrap; color: #666;">---------- Forwarded message ---------</div>
<div style="margin-top: 8px;"><strong>From:</strong> ${email.from}</div>
<div><strong>Date:</strong> ${emailDateFormatted}</div>
<div><strong>Subject:</strong> ${email.subject || '(No subject)'}</div>
<div><strong>To:</strong> ${email.to || ''}</div>
${email.cc ? `<div><strong>Cc:</strong> ${email.cc}</div>` : ''}
</div>`;
    
    // Build the complete forwarded message
    let quotedBody: string;
    
    if (email.htmlBody) {
      // HTML email - wrap in a quoted block
      quotedBody = `${forwardHeaderHtml}
<div style="margin-top: 15px; padding-left: 15px; border-left: 3px solid #ccc; color: #333;">
${originalBody}
</div>`;
    } else {
      // Plain text email - use pre-formatted text
      const plainTextBody = email.textBody || email.snippet || '';
      quotedBody = `${forwardHeaderHtml}
<div style="margin-top: 15px; padding-left: 15px; border-left: 3px solid #ccc; color: #333;">
<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${plainTextBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</div>`;
    }

    // Convert attachments from base64 to File objects
    const attachmentFiles: File[] = [];
    if (email.attachments && email.attachments.length > 0) {
      email.attachments
        .filter(att => att.contentBase64) // Only include attachments with contentBase64
        .forEach(att => {
          try {
            const file = base64ToFile(att.contentBase64!, att.filename, att.mimeType);
            attachmentFiles.push(file);
          } catch (e) {
            console.error(`Error converting attachment ${att.filename}:`, e);
          }
        });
      
      // Warn if some attachments couldn't be included
      if (attachmentFiles.length < email.attachments.length) {
        console.warn(`Some attachments couldn't be forwarded (missing contentBase64). Forwarding ${attachmentFiles.length} of ${email.attachments.length} attachments.`);
      }
    }
    
    // Prepare forward data for inline forward
    const newForwardData = {
      to: [], // Empty - user needs to add recipients
      cc: [],
      bcc: [],
      subject: forwardSubject,
      body: quotedBody,
      attachments: attachmentFiles,
    };
    
    // Set forward data and show forward box
    setForwardData(newForwardData);
    setShowForward(true);
  };

  // Handle closing forward
  const handleCloseForward = () => {
    setShowForward(false);
    setForwardData(null);
  };

  // Handle successful forward send
  const handleForwardSent = () => {
    setShowForward(false);
    setForwardData(null);
  };

  return (
    <article className="flex h-full flex-col bg-white overflow-hidden">
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
      <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 break-words">{email.subject || '(No subject)'}</h2>
            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
              <div className="min-w-0">
                {isInboxEmail ? (
                  <>
                    <p className="font-medium text-slate-900 truncate">{email.from}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">To: {email.to}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-900 truncate">To: {email.to}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">From: {email.from}</p>
                  </>
                )}
              </div>
              <div className="text-xs text-slate-500">{formatDate(emailDate)}</div>
            </div>
          </div>
          {/* Reply and Forward Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleReply}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md border border-slate-300 bg-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 flex-1 sm:flex-initial"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Reply</span>
            </button>
            <button
              onClick={handleForward}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md border border-slate-300 bg-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 flex-1 sm:flex-initial"
              title="Forward"
            >
              <Forward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Email Body - HTML or Text */}
        <section className="px-3 sm:px-6 py-3 sm:py-4">
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
          <section className="border-t border-slate-200 bg-slate-50 px-3 sm:px-6 py-3 sm:py-4">
          <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-700">
            Attachments ({email.attachments.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {email.attachments.map((att, idx) => {
              const dataUrl = getAttachmentDataUrl(att);

              return (
                <div
                  key={idx}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => onAttachmentPreview(att)}
                >
                  {isImage(att.mimeType) && dataUrl ? (
                    <div className="overflow-hidden">
                      <img src={dataUrl} alt={att.filename} className="max-w-full max-h-96 w-auto h-auto object-contain" loading="lazy" />
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

      </div>

      {/* Inline Reply Box */}
      {showReply && replyData && (
        <InlineReply
          to={replyData.to}
          cc={replyData.cc}
          bcc={replyData.bcc}
          subject={replyData.subject}
          mode="reply"
          onClose={handleCloseReply}
          onSent={handleReplySent}
        />
      )}

      {/* Inline Forward Box */}
      {showForward && forwardData && (
        <InlineReply
          to={forwardData.to}
          cc={forwardData.cc}
          bcc={forwardData.bcc}
          subject={forwardData.subject}
          initialBody={forwardData.body}
          initialAttachments={forwardData.attachments}
          mode="forward"
          onClose={handleCloseForward}
          onSent={handleForwardSent}
        />
      )}
    </article>
  );
});

ReadingPane.displayName = 'ReadingPane';

