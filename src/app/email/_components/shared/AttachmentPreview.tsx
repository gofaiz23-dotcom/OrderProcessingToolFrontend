'use client';

import { useEffect, useMemo } from 'react';
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
  
  const filenameLower = attachment.filename?.toLowerCase() ?? '';
  const mimeType = attachment.mimeType?.toLowerCase() ?? '';
  
  // File type detection
  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf' || filenameLower.endsWith('.pdf');
  const isTextFile = mimeType.startsWith('text/');
  const isCSV = mimeType === 'text/csv' || mimeType === 'application/csv' || filenameLower.endsWith('.csv');
  const isExcel = mimeType.includes('spreadsheet') || 
                  mimeType.includes('excel') || 
                  filenameLower.endsWith('.xlsx') || 
                  filenameLower.endsWith('.xls') ||
                  filenameLower.endsWith('.ods');
  const isWord = mimeType.includes('word') || 
                 mimeType.includes('document') ||
                 mimeType === 'application/msword' ||
                 mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 filenameLower.endsWith('.doc') || 
                 filenameLower.endsWith('.docx');
  const isPowerPoint = mimeType.includes('presentation') ||
                       mimeType.includes('powerpoint') ||
                       mimeType === 'application/vnd.ms-powerpoint' ||
                       mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                       filenameLower.endsWith('.ppt') || 
                       filenameLower.endsWith('.pptx');
  
  // Check for text-based file extensions
  const textFileExtensions = ['.md', '.txt', '.json', '.xml', '.log', '.yaml', '.yml', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.htm', '.sh', '.py', '.java', '.cpp', '.c', '.h'];
  const isTextExtension = textFileExtensions.some(ext => filenameLower.endsWith(ext));
  
  // Decode base64 text content for text files
  const textContent = (hasPreviewData && (isTextFile || isTextExtension) && attachment.contentBase64) 
    ? (() => {
        try {
          const normalized = normalizeBase64(attachment.contentBase64);
          return atob(normalized);
        } catch {
          return null;
        }
      })()
    : null;

  // Parse CSV content
  const csvData = useMemo(() => {
    if (!isCSV || !textContent) return null;
    
    try {
      const lines = textContent.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) return null;
      
      // Try to detect delimiter (comma, semicolon, or tab)
      const firstLine = lines[0];
      let delimiter = ',';
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      
      if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
      } else if (semicolonCount > commaCount) {
        delimiter = ';';
      }
      
      // Simple CSV parser that handles quoted values
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      const rows = lines.map(parseCSVLine);
      
      // Find max columns to ensure consistent table structure
      const maxCols = Math.max(...rows.map(row => row.length));
      
      // Pad rows to have same number of columns
      return rows.map(row => {
        while (row.length < maxCols) {
          row.push('');
        }
        return row;
      });
    } catch {
      return null;
    }
  }, [isCSV, textContent]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);


  // Handle download button click - only downloads when explicitly clicked
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dataUrl) return;

    // Create a temporary anchor element and trigger download programmatically
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prevent context menu and drag on preview content
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`relative flex max-h-[95vh] w-full flex-col rounded-xl bg-white shadow-2xl ${
        isPDF ? 'max-w-6xl gap-2 p-3' : 'max-w-3xl gap-4 p-6'
      }`}>
        <header className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        <div 
          className={`flex-1 rounded-lg border border-slate-200 bg-slate-50 ${isImage ? 'flex items-center justify-center overflow-hidden' : isPDF ? 'overflow-hidden min-h-[75vh]' : 'overflow-auto'}`}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
        >
          {hasPreviewData ? (
            isImage ? (
              <img
                src={dataUrl ?? undefined}
                alt={attachment.filename}
                className="max-h-[60vh] max-w-full object-contain select-none"
                draggable={false}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
              />
            ) : isPDF ? (
              <div className="h-full w-full min-h-[75vh]">
                <iframe
                  title={attachment.filename}
                  src={`${dataUrl}#view=FitH&zoom=page-width&toolbar=1&navpanes=1&scrollbar=1`}
                  className="h-full w-full border-0"
                  onContextMenu={handleContextMenu}
                  style={{ minHeight: '75vh' }}
                />
              </div>
            ) : csvData ? (
              <div className="h-full w-full overflow-auto p-4">
                <table className="min-w-full divide-y divide-slate-200 border border-slate-300 bg-white">
                  <thead className="bg-slate-50">
                    {csvData[0] && (
                      <tr>
                        {csvData[0].map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-200"
                          >
                            {header || `Column ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {csvData.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-4 py-2 text-sm text-slate-900 whitespace-nowrap"
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : textContent ? (
              <pre className="h-full w-full overflow-auto p-4 text-sm font-mono text-slate-900 whitespace-pre-wrap break-words bg-white">
                {textContent}
              </pre>
            ) : isExcel || isWord || isPowerPoint ? (
              <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center bg-slate-50">
                {isExcel ? (
                  <>
                    <svg
                      className="mb-4 h-16 w-16 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-900 mb-2">Excel Spreadsheet</p>
                    <p className="text-xs text-slate-500 mb-4">
                      Excel files (.xls, .xlsx) cannot be previewed in the browser.
                    </p>
                  </>
                ) : isWord ? (
                  <>
                    <svg
                      className="mb-4 h-16 w-16 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-900 mb-2">Word Document</p>
                    <p className="text-xs text-slate-500 mb-4">
                      Word documents (.doc, .docx) cannot be previewed in the browser.
                    </p>
                  </>
                ) : (
                  <>
                    <svg
                      className="mb-4 h-16 w-16 text-orange-600"
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
                    <p className="text-sm font-medium text-slate-900 mb-2">PowerPoint Presentation</p>
                    <p className="text-xs text-slate-500 mb-4">
                      PowerPoint files (.ppt, .pptx) cannot be previewed in the browser.
                    </p>
                  </>
                )}
                <p className="text-xs text-slate-400">
                  Please download the file to view it in Microsoft Office, Google Docs, or another compatible application.
                </p>
              </div>
            ) : (
              <iframe 
                title={attachment.filename} 
                src={dataUrl ?? undefined} 
                className="h-[60vh] w-full border-0"
                onContextMenu={handleContextMenu}
              />
            )
          ) : (
            <div className="flex h-[40vh] items-center justify-center text-sm text-slate-500">
              This file was sent without inline data. Download from Gmail to view.
            </div>
          )}
        </div>

        {/* Attachment Info - Name and Size */}
        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">{attachment.filename}</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">{attachment.mimeType}</p>
                {attachment.size && (
                  <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className={`flex justify-end gap-3 ${isPDF ? 'mt-1' : 'mt-3'}`}>
          {hasPreviewData && dataUrl ? (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Download
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
};

