'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, FileText, Download, Copy, ChevronDown, ChevronUp, Loader2, Send, Eye, X, Upload } from 'lucide-react';
import { createLogisticsShippedOrder } from '@/app/api/LogisticsApi/LogisticsShippedOrders';

type ResponseSummaryProps = {
  orderData?: {
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  };
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  files?: File[];
  pdfUrl?: string | null;
  onDownloadPDF?: () => void;
  orderId?: number;
  onSubmitSuccess?: (orderId: number, sku: string) => void;
  onFilesChange?: (files: File[]) => void;
};

export const ResponseSummary = ({
  orderData,
  rateQuotesResponseJsonb,
  bolResponseJsonb,
  pickupResponseJsonb,
  files: initialFiles,
  pdfUrl,
  onDownloadPDF,
  orderId,
  onSubmitSuccess,
  onFilesChange,
}: ResponseSummaryProps) => {
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    orderInfo: true,
    rateQuote: true,
    bol: true,
    pickup: true,
    files: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedPdfName, setSelectedPdfName] = useState<string>('');
  const [files, setFiles] = useState<File[]>(initialFiles || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Create object URLs for PDF previews and clean them up
  const fileUrls = useMemo(() => {
    if (!files || files.length === 0) return [];
    return files.map(file => URL.createObjectURL(file));
  }, [files]);

  // Update files when initialFiles prop changes
  useEffect(() => {
    if (initialFiles) {
      setFiles(initialFiles);
    }
  }, [initialFiles]);

  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      fileUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [fileUrls]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      
      // Notify parent component if callback is provided
      if (onFilesChange) {
        onFilesChange(updatedFiles);
      }
    }
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    
    // Notify parent component if callback is provided
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const handleSubmit = async () => {
    if (!orderData?.sku || !orderData?.orderOnMarketPlace || !orderData?.ordersJsonb) {
      setSubmitError('Missing required order data (SKU, Marketplace, or Orders JSONB)');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        sku: orderData.sku,
        orderOnMarketPlace: orderData.orderOnMarketPlace,
        ordersJsonb: orderData.ordersJsonb,
        rateQuotesResponseJsonb: rateQuotesResponseJsonb,
        bolResponseJsonb: bolResponseJsonb,
        pickupResponseJsonb: pickupResponseJsonb,
        files: files || [],
      };

      const response = await createLogisticsShippedOrder(payload);

      // Call success callback if provided
      if (onSubmitSuccess && orderId) {
        onSubmitSuccess(orderId, orderData.sku);
      }

      // Show success message
      console.log('Order submitted successfully:', response);
    } catch (error) {
      console.error('Error submitting order:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="text-green-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">Response Summary</h2>
            <p className="text-sm text-slate-600">Complete shipment information</p>
          </div>
        </div>

        {/* Order Information */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => toggleSection('orderInfo')}
                className="text-left"
              >
                <h3 className="text-lg font-bold text-slate-900">Order Information</h3>
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleSection('orderInfo')}
              className="text-slate-500 hover:text-slate-700"
            >
              {showSections.orderInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showSections.orderInfo && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderData?.sku && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">SKU</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={orderData.sku}
                        readOnly
                        className="flex-1 px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(orderData.sku ?? '')}
                        className="px-3 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}
                {orderData?.orderOnMarketPlace && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Order on Marketplace</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={orderData.orderOnMarketPlace}
                        readOnly
                        className="flex-1 px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(orderData.orderOnMarketPlace ?? '')}
                        className="px-3 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {orderData?.ordersJsonb && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Orders JSONB</label>
                  <div className="relative">
                    <pre className="px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg overflow-auto max-h-64 text-sm font-mono">
                      {JSON.stringify(orderData.ordersJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(orderData.ordersJsonb, null, 2))}
                      className="absolute top-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rate Quote Response */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => toggleSection('rateQuote')}
                className="text-left"
              >
                <h3 className="text-lg font-bold text-slate-900">Rate Quote Response</h3>
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleSection('rateQuote')}
              className="text-slate-500 hover:text-slate-700"
            >
              {showSections.rateQuote ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showSections.rateQuote && (
            <div className="p-6 space-y-4">
              {rateQuotesResponseJsonb ? (
                <div className="relative">
                  <pre className="px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg overflow-auto max-h-64 text-sm font-mono">
                    {JSON.stringify(rateQuotesResponseJsonb, null, 2)}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(rateQuotesResponseJsonb, null, 2))}
                    className="absolute top-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No rate quote response available</p>
              )}
            </div>
          )}
        </div>

        {/* BOL Response */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => toggleSection('bol')}
                className="text-left"
              >
                <h3 className="text-lg font-bold text-slate-900">Bill of Lading Response</h3>
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleSection('bol')}
              className="text-slate-500 hover:text-slate-700"
            >
              {showSections.bol ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showSections.bol && (
            <div className="p-6 space-y-4">
              {bolResponseJsonb ? (
                <div className="relative">
                  <pre className="px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg overflow-auto max-h-64 text-sm font-mono">
                    {JSON.stringify(bolResponseJsonb, null, 2)}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(bolResponseJsonb, null, 2))}
                    className="absolute top-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No BOL response available</p>
              )}
            </div>
          )}
        </div>

        {/* Pickup Response */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => toggleSection('pickup')}
                className="text-left"
              >
                <h3 className="text-lg font-bold text-slate-900">Pickup Request Response</h3>
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleSection('pickup')}
              className="text-slate-500 hover:text-slate-700"
            >
              {showSections.pickup ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showSections.pickup && (
            <div className="p-6 space-y-4">
              {pickupResponseJsonb ? (
                <div className="relative">
                  <pre className="px-4 py-3 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg overflow-auto max-h-64 text-sm font-mono">
                    {JSON.stringify(pickupResponseJsonb, null, 2)}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(pickupResponseJsonb, null, 2))}
                    className="absolute top-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No pickup request response available</p>
              )}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => toggleSection('files')}
                className="text-left"
              >
                <h3 className="text-lg font-bold text-slate-900">Files</h3>
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleSection('files')}
              className="text-slate-500 hover:text-slate-700"
            >
              {showSections.files ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showSections.files && (
            <div className="p-6 space-y-4">
              {/* File Upload Button */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Upload size={16} />
                  Upload Files
                </button>
                <span className="text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG</span>
              </div>

              {files && files.length > 0 ? (
                <div className="space-y-4">
                  {files.map((file, index) => {
                    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    const fileUrl = fileUrls[index];
                    
                    return (
                      <div key={index} className="space-y-3">
                        {/* File Info and Download */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="text-blue-500" size={20} />
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              {isPDF && fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPdfUrl(fileUrl);
                                    setSelectedPdfName(file.name);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Preview PDF"
                                >
                                  <Eye size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => downloadFile(file)}
                              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove file"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No files available</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {submitError}
            </div>
          )}
          <div className="flex flex-col items-end gap-2">
            {submitError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs max-w-xs">
                {submitError}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !orderData?.sku || !orderData?.orderOnMarketPlace}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {selectedPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{selectedPdfName}</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedPdfUrl(null);
                  setSelectedPdfName('');
                }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* PDF Preview */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={selectedPdfUrl}
                className="w-full h-full border-0"
                title={`PDF Preview - ${selectedPdfName}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

