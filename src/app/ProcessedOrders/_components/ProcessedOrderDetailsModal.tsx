'use client';

import { useEffect, useState } from 'react';
import { X, Eye, Download, FileText, Image as ImageIcon, File, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type { ShippedOrder } from '../utils/shippedOrdersApi';
import { getBackendBaseUrl } from '../../../../BaseUrl';

type ProcessedOrderDetailsModalProps = {
  isOpen: boolean;
  order: ShippedOrder | null;
  onClose: () => void;
};

export const ProcessedOrderDetailsModal = ({
  isOpen,
  order,
  onClose,
}: ProcessedOrderDetailsModalProps) => {
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; mimetype: string } | null>(null);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    ordersJsonb: true,
    rateQuoteRequest: true,
    rateQuoteResponse: true,
    bolResponse: true,
    pickupResponse: true,
    files: true,
  });

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (previewFile) {
          setPreviewFile(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose, previewFile]);

  const getFileIcon = (mimetype: string, filename: string) => {
    const lowerMime = mimetype.toLowerCase();
    const lowerName = filename.toLowerCase();
    
    if (lowerMime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => lowerName.endsWith(ext))) {
      return ImageIcon;
    }
    if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
      return FileText;
    }
    return File;
  };

  const canPreview = (mimetype: string, filename: string) => {
    const lowerMime = mimetype.toLowerCase();
    const lowerName = filename.toLowerCase();
    return (
      lowerMime.startsWith('image/') ||
      lowerMime === 'application/pdf' ||
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf'].some(ext => lowerName.endsWith(ext))
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-black">Processed Order Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('basicInfo')}>
                <h3 className="text-sm font-semibold text-black">Basic Information</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection('basicInfo');
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showSections.basicInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              {showSections.basicInfo && (
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs text-black">ID</label>
                      <p className="text-sm font-medium text-black">#{order.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">SKU</label>
                      <p className="text-sm font-medium text-black">{order.sku}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Marketplace</label>
                      <p className="text-sm font-medium text-black">{order.orderOnMarketPlace}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Status</label>
                      <p className="text-sm font-medium text-black">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          order.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {order.status || 'pending'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Created At</label>
                      <p className="text-sm font-medium text-black">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Updated At</label>
                      <p className="text-sm font-medium text-black">
                        {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Orders JSONB */}
            {order.ordersJsonb && Object.keys(order.ordersJsonb).length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('ordersJsonb')}>
                  <h3 className="text-sm font-semibold text-black">Orders JSONB</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('ordersJsonb');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.ordersJsonb ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.ordersJsonb && (
                  <div className="p-4 relative">
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                      {JSON.stringify(order.ordersJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(order.ordersJsonb, null, 2))}
                      className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rate Quote Request */}
            {(order as any).rateQuotesRequestJsonb && Object.keys((order as any).rateQuotesRequestJsonb).length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('rateQuoteRequest')}>
                  <h3 className="text-sm font-semibold text-black">Rate Quote Request</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('rateQuoteRequest');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.rateQuoteRequest ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.rateQuoteRequest && (
                  <div className="p-4 relative">
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                      {JSON.stringify((order as any).rateQuotesRequestJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify((order as any).rateQuotesRequestJsonb, null, 2))}
                      className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rate Quote Response */}
            {order.rateQuotesResponseJsonb && Object.keys(order.rateQuotesResponseJsonb).length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('rateQuoteResponse')}>
                  <h3 className="text-sm font-semibold text-black">Rate Quote Response</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('rateQuoteResponse');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.rateQuoteResponse ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.rateQuoteResponse && (
                  <div className="p-4 relative">
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                      {JSON.stringify(order.rateQuotesResponseJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(order.rateQuotesResponseJsonb, null, 2))}
                      className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bill of Lading Response */}
            {order.bolResponseJsonb && Object.keys(order.bolResponseJsonb).length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('bolResponse')}>
                  <h3 className="text-sm font-semibold text-black">Bill of Lading Response</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('bolResponse');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.bolResponse ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.bolResponse && (
                  <div className="p-4 relative">
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                      {JSON.stringify(order.bolResponseJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(order.bolResponseJsonb, null, 2))}
                      className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pickup Request Response */}
            {order.pickupResponseJsonb && Object.keys(order.pickupResponseJsonb).length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('pickupResponse')}>
                  <h3 className="text-sm font-semibold text-black">Pickup Request Response</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('pickupResponse');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.pickupResponse ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.pickupResponse && (
                  <div className="p-4 relative">
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                      {JSON.stringify(order.pickupResponseJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(order.pickupResponseJsonb, null, 2))}
                      className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Files */}
            {order.uploads && order.uploads.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toggleSection('files')}>
                  <h3 className="text-sm font-semibold text-black">Files</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('files');
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showSections.files ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showSections.files && (
                  <div className="p-4">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase">Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {order.uploads.map((upload, index) => {
                        // Handle both formats: string (path) or object (with filename, path, etc.)
                        const isString = typeof upload === 'string';
                        const filePath = isString ? upload : (upload.path || upload.filename || '');
                        const filename = isString 
                          ? filePath.split('/').pop() || filePath 
                          : (upload.filename || filePath.split('/').pop() || 'Unknown');
                        const mimetype = isString ? 'application/octet-stream' : (upload.mimetype || 'application/octet-stream');
                        const size = isString ? null : (upload.size || null);
                        
                        // Build shipping document URL: BaseUrl/FhsOrdersMedia/ShippingDocuments/filename
                        const buildShippingDocumentUrl = (filename: string) => {
                          const backendUrl = getBackendBaseUrl();
                          // Clean filename - remove any path separators
                          const cleanFilename = filename.split('/').pop() || filename.split('\\').pop() || filename;
                          return `${backendUrl}/FhsOrdersMedia/ShippingDocuments/${cleanFilename}`;
                        };
                        
                        const downloadUrl = buildShippingDocumentUrl(filename);
                        const FileIcon = getFileIcon(mimetype, filename);
                        const showPreview = canPreview(mimetype, filename);
                        const isImage = mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => filename.toLowerCase().endsWith(ext));
                        const isPDF = mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
                        
                        return (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              {isImage ? (
                                <div className="w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-100">
                                  <img
                                    src={downloadUrl}
                                    alt={filename}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setPreviewFile({ url: downloadUrl, filename, mimetype })}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : isPDF ? (
                                <div 
                                  className="w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-100 relative cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewFile({ url: downloadUrl, filename, mimetype })}
                                >
                                  <embed
                                    src={`${downloadUrl}#page=1&zoom=25&toolbar=0&navpanes=0&scrollbar=0`}
                                    type="application/pdf"
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                    style={{ 
                                      transform: 'scale(0.25)',
                                      transformOrigin: 'top left',
                                      width: '400%',
                                      height: '400%',
                                      border: 'none'
                                    }}
                                    title={filename}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                                  <FileIcon className="h-6 w-6 text-slate-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-black">{filename}</p>
                              <p className="text-xs text-black truncate max-w-xs" title={filePath}>
                                {filePath}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-black">{mimetype}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-black">{formatFileSize(size)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {showPreview && (
                                  <button
                                    onClick={() => setPreviewFile({ url: downloadUrl, filename, mimetype })}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Preview"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <a
                                  href={downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-black bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75" onClick={() => setPreviewFile(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-2 -right-2 z-10 bg-white rounded-full p-1 text-slate-400 hover:text-slate-600 transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="bg-white rounded-lg shadow-xl p-4">
              {previewFile.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => previewFile.filename.toLowerCase().endsWith(ext)) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="w-[200px] h-[200px] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : previewFile.mimetype === 'application/pdf' || previewFile.filename.toLowerCase().endsWith('.pdf') ? (
                <div className="w-[200px] h-[200px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <iframe
                    src={`${previewFile.url}#page=1&zoom=fit&toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0"
                    title={previewFile.filename}
                  />
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText className="h-12 w-12 mb-2 text-slate-400" />
                  <p className="text-xs">Preview not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

