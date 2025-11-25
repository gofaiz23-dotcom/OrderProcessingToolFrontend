'use client';

import { EmailAttachment } from '@/app/types/email';

export const normalizeBase64 = (value: string) => value.replace(/-/g, '+').replace(/_/g, '/');

export const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
};

type AttachmentBadgeProps = {
  attachment: EmailAttachment;
  onClick: (attachment: EmailAttachment) => void;
};

export const AttachmentBadge = ({ attachment, onClick }: AttachmentBadgeProps) => (
  <button
    type="button"
    onClick={() => onClick(attachment)}
    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-blue-700 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
  >
    {attachment.filename}
    {attachment.size ? <span className="text-slate-500">{formatFileSize(attachment.size)}</span> : null}
  </button>
);

type AttachmentPreviewModalProps = {
  attachment: EmailAttachment;
  onClose: () => void;
};

export const AttachmentPreviewModal = ({ attachment, onClose }: AttachmentPreviewModalProps) => {
  const hasPreviewData = Boolean(attachment.contentBase64);
  const dataUrl = hasPreviewData
    ? `data:${attachment.mimeType};base64,${normalizeBase64(attachment.contentBase64!)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 rounded-xl bg-white p-6 shadow-2xl">
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">{attachment.filename}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Close
            </button>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{attachment.mimeType}</p>
          {attachment.size ? <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p> : null}
        </header>

        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
          {hasPreviewData ? (
            <iframe title={attachment.filename} src={dataUrl ?? undefined} className="h-[60vh] w-full" />
          ) : (
            <div className="flex h-[40vh] items-center justify-center text-sm text-slate-500">
              This file was sent without inline data. Download from Gmail to view.
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-3">
          {hasPreviewData && dataUrl ? (
            <a
              href={dataUrl}
              download={attachment.filename}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Download
            </a>
          ) : null}
        </footer>
      </div>
    </div>
  );
};

