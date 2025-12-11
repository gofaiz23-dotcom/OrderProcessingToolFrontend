'use client';

import { useEffect, useState } from 'react';
import { X, Eye, Download, FileText, Image as ImageIcon, File, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type { ShippedOrder } from '../utils/shippedOrdersApi';
import { getBackendBaseUrl } from '../../../../BaseUrl';
import { getLogisticsShippedOrderById } from '@/app/api/LogisticsApi/LogisticsShippedOrders';
import { parseJsonSafely } from '@/app/utils/Orders';

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
  const [fullOrder, setFullOrder] = useState<ShippedOrder | null>(null);
  const [loadingFullOrder, setLoadingFullOrder] = useState(false);
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

  // Fetch full order data when modal opens to get rateQuotesRequestJsonb
  useEffect(() => {
    if (isOpen && order?.id && !fullOrder && !loadingFullOrder) {
      setLoadingFullOrder(true);
      
      // First, try to get rateQuotesRequestJsonb from localStorage (frontend workaround)
      let rateQuotesRequestJsonbFromStorage: Record<string, unknown> | undefined = undefined;
      try {
        // Try by order ID first
        const storageKeyById = `rateQuotesRequestJsonb_${order.id}`;
        const storedById = localStorage.getItem(storageKeyById);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Checking localStorage for rateQuotesRequestJsonb:', {
            storageKeyById,
            storedById: storedById ? 'found' : 'not found',
            orderId: order.id,
            sku: order.sku,
            allLocalStorageKeys: Object.keys(localStorage).filter(k => k.includes('rateQuotesRequestJsonb')),
          });
        }
        
        if (storedById) {
          const parsed = parseJsonSafely(storedById);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            rateQuotesRequestJsonbFromStorage = parsed as Record<string, unknown>;
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Found rateQuotesRequestJsonb in localStorage by ID:', {
                storageKeyById,
                keys: Object.keys(rateQuotesRequestJsonbFromStorage),
              });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Failed to parse rateQuotesRequestJsonb from localStorage:', {
                storageKeyById,
                parsed,
                parsedType: typeof parsed,
              });
            }
          }
        }
        
        // Fallback: try by SKU
        if (!rateQuotesRequestJsonbFromStorage && order.sku) {
          const storageKeyBySku = `rateQuotesRequestJsonb_sku_${order.sku}`;
          const storedBySku = localStorage.getItem(storageKeyBySku);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Checking localStorage by SKU:', {
              storageKeyBySku,
              storedBySku: storedBySku ? 'found' : 'not found',
            });
          }
          
          if (storedBySku) {
            const parsed = parseJsonSafely(storedBySku);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              rateQuotesRequestJsonbFromStorage = parsed as Record<string, unknown>;
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Found rateQuotesRequestJsonb in localStorage by SKU:', {
                  storageKeyBySku,
                  keys: Object.keys(rateQuotesRequestJsonbFromStorage),
                });
              }
            }
          }
        }
        
        if (!rateQuotesRequestJsonbFromStorage && process.env.NODE_ENV === 'development') {
          console.warn('❌ rateQuotesRequestJsonb not found in localStorage for order:', {
            id: order.id,
            sku: order.sku,
            checkedKeys: [
              `rateQuotesRequestJsonb_${order.id}`,
              order.sku ? `rateQuotesRequestJsonb_sku_${order.sku}` : null,
            ].filter(Boolean),
          });
        }
      } catch (storageError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error reading rateQuotesRequestJsonb from localStorage:', storageError);
        }
      }
      
      getLogisticsShippedOrderById(order.id)
        .then((response) => {
          if (response?.data) {
            // Debug: Log raw response to see all fields
            if (process.env.NODE_ENV === 'development') {
              console.log('getLogisticsShippedOrderById - Raw response:', {
                response,
                data: response.data,
                dataKeys: Object.keys(response.data),
                hasRateQuotesRequestJsonb: 'rateQuotesRequestJsonb' in response.data,
                rateQuotesRequestJsonb: response.data.rateQuotesRequestJsonb,
                allJsonbFields: Object.keys(response.data).filter(k => k.toLowerCase().includes('jsonb')),
                allRequestFields: Object.keys(response.data).filter(k => k.toLowerCase().includes('request')),
                rateQuotesRequestJsonbFromStorage,
              });
            }
            
            // Normalize JSONB fields from the fetched order
            const normalizeJsonb = (jsonb: unknown): Record<string, unknown> | undefined => {
              if (jsonb === null || jsonb === undefined) {
                return undefined;
              }
              if (typeof jsonb === 'object' && !Array.isArray(jsonb)) {
                return jsonb as Record<string, unknown>;
              }
              if (typeof jsonb === 'string' && jsonb.trim()) {
                const parsed = parseJsonSafely(jsonb);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  return parsed as Record<string, unknown>;
                }
              }
              return undefined;
            };

            // Check for alternative field names (in case backend uses different naming)
            const rawData = response.data as any;
            const rateQuotesRequestJsonb = 
              normalizeJsonb(rawData.rateQuotesRequestJsonb) ?? 
              normalizeJsonb(rawData.rateQuotesRequest) ??
              normalizeJsonb(rawData.rate_quotes_request_jsonb) ??
              normalizeJsonb(rawData.rateQuotesRequestJson) ??
              rateQuotesRequestJsonbFromStorage ?? // Use localStorage as fallback
              undefined;

            const normalizedOrder: ShippedOrder = {
              id: response.data.id,
              sku: response.data.sku,
              orderOnMarketPlace: response.data.orderOnMarketPlace,
              status: response.data.status,
              ordersJsonb: normalizeJsonb(response.data.ordersJsonb) || response.data.ordersJsonb,
              rateQuotesRequestJsonb: rateQuotesRequestJsonb,
              rateQuotesResponseJsonb: normalizeJsonb(response.data.rateQuotesResponseJsonb),
              bolResponseJsonb: normalizeJsonb(response.data.bolResponseJsonb),
              pickupResponseJsonb: normalizeJsonb(response.data.pickupResponseJsonb),
              uploads: response.data.uploads || [],
              createdAt: response.data.createdAt,
              updatedAt: response.data.updatedAt,
            };

            setFullOrder(normalizedOrder);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Fetched full order by ID - Normalized:', {
                id: normalizedOrder.id,
                hasRateQuotesRequestJsonb: 'rateQuotesRequestJsonb' in normalizedOrder,
                rateQuotesRequestJsonb: normalizedOrder.rateQuotesRequestJsonb,
                rateQuotesRequestJsonbType: typeof normalizedOrder.rateQuotesRequestJsonb,
                rateQuotesRequestJsonbKeys: normalizedOrder.rateQuotesRequestJsonb && typeof normalizedOrder.rateQuotesRequestJsonb === 'object' 
                  ? Object.keys(normalizedOrder.rateQuotesRequestJsonb) 
                  : 'N/A',
                source: rateQuotesRequestJsonbFromStorage ? 'localStorage' : 'api',
              });
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching full order:', error);
          // If fetch fails but we have localStorage data, use that
          if (rateQuotesRequestJsonbFromStorage && order) {
            const fallbackOrder: ShippedOrder = {
              ...order,
              rateQuotesRequestJsonb: rateQuotesRequestJsonbFromStorage,
            };
            setFullOrder(fallbackOrder);
            if (process.env.NODE_ENV === 'development') {
              console.log('Using rateQuotesRequestJsonb from localStorage as fallback');
            }
          }
        })
        .finally(() => {
          setLoadingFullOrder(false);
        });
    }
  }, [isOpen, order?.id, order?.sku, fullOrder, loadingFullOrder]);

  // Reset fullOrder when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFullOrder(null);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // Use fullOrder if available (has rateQuotesRequestJsonb), otherwise use order prop
  // Since order is not null (checked above), displayOrder will never be null
  const displayOrder = fullOrder || order;

  // Debug: Log order data to check if rateQuotesRequestJsonb exists
  if (process.env.NODE_ENV === 'development') {
    console.log('Order data in ProcessedOrderDetailsModal:', {
      id: displayOrder.id,
      usingFullOrder: !!fullOrder,
      hasRateQuotesRequestJsonb: 'rateQuotesRequestJsonb' in displayOrder,
      rateQuotesRequestJsonb: displayOrder.rateQuotesRequestJsonb,
      rateQuotesRequestJsonbType: typeof displayOrder.rateQuotesRequestJsonb,
      rateQuotesRequestJsonbIsNull: displayOrder.rateQuotesRequestJsonb === null,
      rateQuotesRequestJsonbIsUndefined: displayOrder.rateQuotesRequestJsonb === undefined,
      rateQuotesRequestJsonbKeys: displayOrder.rateQuotesRequestJsonb && typeof displayOrder.rateQuotesRequestJsonb === 'object' 
        ? Object.keys(displayOrder.rateQuotesRequestJsonb) 
        : 'N/A',
      hasRateQuotesResponseJsonb: 'rateQuotesResponseJsonb' in displayOrder,
      rateQuotesResponseJsonb: displayOrder.rateQuotesResponseJsonb,
      allOrderKeys: Object.keys(displayOrder),
    });
  }

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
                      <p className="text-sm font-medium text-black">#{displayOrder.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">SKU</label>
                      <p className="text-sm font-medium text-black">{displayOrder.sku}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Marketplace</label>
                      <p className="text-sm font-medium text-black">{displayOrder.orderOnMarketPlace}</p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Status</label>
                      <p className="text-sm font-medium text-black">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          displayOrder.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : displayOrder.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : displayOrder.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : displayOrder.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {displayOrder.status || 'pending'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Created At</label>
                      <p className="text-sm font-medium text-black">
                        {displayOrder.createdAt ? new Date(displayOrder.createdAt).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-black">Updated At</label>
                      <p className="text-sm font-medium text-black">
                        {displayOrder.updatedAt ? new Date(displayOrder.updatedAt).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Orders JSONB */}
            {displayOrder.ordersJsonb && Object.keys(displayOrder.ordersJsonb).length > 0 && (
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
                      {JSON.stringify(displayOrder.ordersJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(displayOrder.ordersJsonb, null, 2))}
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
                  {loadingFullOrder ? (
                    <p className="text-sm text-slate-500">Loading rate quote request data...</p>
                  ) : displayOrder.rateQuotesRequestJsonb && 
                   typeof displayOrder.rateQuotesRequestJsonb === 'object' && 
                   !Array.isArray(displayOrder.rateQuotesRequestJsonb) &&
                   Object.keys(displayOrder.rateQuotesRequestJsonb).length > 0 ? (
                    <>
                      <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                        {JSON.stringify(displayOrder.rateQuotesRequestJsonb, null, 2)}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(displayOrder.rateQuotesRequestJsonb, null, 2))}
                        className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">No rate quote request data available</p>
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
                          <p>Debug: rateQuotesRequestJsonb = {displayOrder.rateQuotesRequestJsonb === undefined ? 'undefined' : displayOrder.rateQuotesRequestJsonb === null ? 'null' : JSON.stringify(displayOrder.rateQuotesRequestJsonb)}</p>
                          <p>Type: {typeof displayOrder.rateQuotesRequestJsonb}</p>
                          <p>Is Array: {Array.isArray(displayOrder.rateQuotesRequestJsonb) ? 'Yes' : 'No'}</p>
                          <p>Using Full Order: {fullOrder ? 'Yes' : 'No'}</p>
                          {displayOrder.rateQuotesRequestJsonb && typeof displayOrder.rateQuotesRequestJsonb === 'object' && (
                            <p>Keys: {Object.keys(displayOrder.rateQuotesRequestJsonb).join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rate Quote Response */}
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
                  {displayOrder.rateQuotesResponseJsonb && 
                   typeof displayOrder.rateQuotesResponseJsonb === 'object' && 
                   Object.keys(displayOrder.rateQuotesResponseJsonb).length > 0 ? (
                    <>
                      <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs max-h-64 text-black">
                        {JSON.stringify(displayOrder.rateQuotesResponseJsonb, null, 2)}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(displayOrder.rateQuotesResponseJsonb, null, 2))}
                        className="absolute top-6 right-6 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No rate quote response data available</p>
                  )}
                </div>
              )}
            </div>

            {/* Bill of Lading Response */}
            {displayOrder.bolResponseJsonb && Object.keys(displayOrder.bolResponseJsonb).length > 0 && (
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
                      {JSON.stringify(displayOrder.bolResponseJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(displayOrder.bolResponseJsonb, null, 2))}
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
            {displayOrder.pickupResponseJsonb && Object.keys(displayOrder.pickupResponseJsonb).length > 0 && (
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
                      {JSON.stringify(displayOrder.pickupResponseJsonb, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(displayOrder.pickupResponseJsonb, null, 2))}
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
            {displayOrder.uploads && displayOrder.uploads.length > 0 && (
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
                      {displayOrder.uploads.map((upload, index) => {
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

