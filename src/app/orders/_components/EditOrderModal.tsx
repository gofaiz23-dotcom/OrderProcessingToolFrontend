'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import type { Order, UpdateOrderPayload } from '@/app/types/order';
import { formatJsonb, parseJsonSafely } from '@/app/utils/Orders';
import { detectValueType, parseValueByType } from '@/app/utils/Orders/valueTypeDetector';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

type KeyValuePair = {
  id: string;
  key: string;
  value: string;
};

type EditOrderModalProps = {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSave: (payload: UpdateOrderPayload) => Promise<void>;
  loading?: boolean;
  error?: unknown;
};

export const EditOrderModal = ({
  isOpen,
  order,
  onClose,
  onSave,
  loading = false,
  error,
}: EditOrderModalProps) => {
  const [orderOnMarketPlace, setOrderOnMarketPlace] = useState('');
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([]);
  const [jsonbError, setJsonbError] = useState<string | null>(null);
  const [previewHeight, setPreviewHeight] = useState(192); // Default 192px (12rem)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(192);

  // Initialize form when order changes
  useEffect(() => {
    if (isOpen && order) {
      setOrderOnMarketPlace(order.orderOnMarketPlace);
      
      // Convert JSONB to key-value pairs
      const jsonObj = typeof order.jsonb === 'string' 
        ? parseJsonSafely(order.jsonb) as Record<string, unknown>
        : (order.jsonb as Record<string, unknown>);
      
      if (jsonObj && typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
        const pairs: KeyValuePair[] = Object.entries(jsonObj).map(([key, value], index) => {
          let stringValue = '';
          
          if (value === null) {
            stringValue = 'null';
          } else if (typeof value === 'boolean') {
            stringValue = value.toString();
          } else if (typeof value === 'number') {
            stringValue = value.toString();
          } else {
            stringValue = String(value);
          }
          
          return {
            id: `pair-${index}-${Date.now()}`,
            key,
            value: stringValue,
          };
        });
        
        setKeyValuePairs(pairs.length > 0 ? pairs : [{ id: '1', key: '', value: '' }]);
      } else {
        setKeyValuePairs([{ id: '1', key: '', value: '' }]);
      }
      
      setJsonbError(null);
    }
  }, [isOpen, order]);

  // Build JSON object from key-value pairs
  const buildJsonFromPairs = (): Record<string, unknown> | null => {
    const jsonObj: Record<string, unknown> = {};
    
    for (const pair of keyValuePairs) {
      if (!pair.key.trim()) continue; // Skip empty keys
      
      // Auto-detect and parse value type
      const valueType = detectValueType(pair.value);
      const parsedValue = parseValueByType(pair.value, valueType);
      
      jsonObj[pair.key.trim()] = parsedValue;
    }
    
    return jsonObj;
  };

  // Get JSON preview
  const getJsonPreview = (): string => {
    const jsonObj = buildJsonFromPairs();
    if (jsonObj === null) return '{}';
    return formatJsonb(jsonObj);
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, loading, onClose]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(100, Math.min(600, startHeightRef.current + deltaY));
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = previewHeight;
  };

  const addKeyValuePair = () => {
    const newId = Date.now().toString();
    setKeyValuePairs([...keyValuePairs, { id: newId, key: '', value: '' }]);
    setJsonbError(null);
  };

  const removeKeyValuePair = (id: string) => {
    setKeyValuePairs(keyValuePairs.filter((pair) => pair.id !== id));
    setJsonbError(null);
  };

  const updateKeyValuePair = (id: string, field: 'key' | 'value', newValue: string) => {
    setKeyValuePairs(
      keyValuePairs.map((pair) => {
        if (pair.id === id) {
          return { ...pair, [field]: newValue };
        }
        return pair;
      })
    );
    setJsonbError(null);
  };

  const handleSave = async () => {
    if (!order) return;

    // Validate required fields
    if (!orderOnMarketPlace.trim()) {
      alert('Order on Marketplace is required');
      return;
    }

    // Check if at least one key-value pair has a key
    const hasValidPair = keyValuePairs.some((pair) => pair.key.trim() !== '');
    if (!hasValidPair) {
      alert('At least one key-value pair is required');
      return;
    }

    if (jsonbError) {
      alert('Please fix errors before saving');
      return;
    }

    // Build JSON object from pairs
    const jsonObj = buildJsonFromPairs();
    if (jsonObj === null) {
      return; // Error already set by buildJsonFromPairs
    }

    try {
      await onSave({
        orderOnMarketPlace: orderOnMarketPlace.trim(),
        jsonb: jsonObj,
      });
      // Close modal on successful save
      onClose();
    } catch (err) {
      // Error is handled by parent component
      console.error('Error saving order:', err);
    }
  };

  if (!isOpen || !order) return null;

  const jsonPreview = getJsonPreview();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg sm:rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-slide-up-and-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-white flex items-center justify-between rounded-t-lg sm:rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Edit Order #{order.id}</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error display */}
        {error != null && (
          <div className="px-6 py-4 border-b border-red-200 bg-red-50/50">
            <ErrorDisplay error={error} />
          </div>
        )}

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Order ID (read-only) */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900">
              Order ID
            </label>
            <div className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed">
              #{order.id}
            </div>
          </div>

          {/* Order on Marketplace */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900">
              Order on Marketplace <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orderOnMarketPlace}
              onChange={(e) => setOrderOnMarketPlace(e.target.value)}
              disabled={loading}
              placeholder="e.g., Amazon, eBay, Shopify"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Key-Value Pairs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                Key-Value Pairs <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addKeyValuePair}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Pair
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] sm:max-h-[300px] overflow-y-auto pr-2">
              {keyValuePairs.map((pair) => (
                <div
                  key={pair.id}
                  className="flex items-start gap-2 p-3 sm:p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Key Input */}
                    <div className="col-span-1 sm:col-span-4">
                      <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updateKeyValuePair(pair.id, 'key', e.target.value)}
                        disabled={loading}
                        placeholder="Key"
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                      />
                    </div>

                    {/* Value Input - Auto-detects type */}
                    <div className="col-span-1 sm:col-span-7">
                      <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => updateKeyValuePair(pair.id, 'value', e.target.value)}
                        disabled={loading}
                        placeholder="Value (auto-detects type)"
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex items-center justify-start sm:justify-center">
                      <button
                        type="button"
                        onClick={() => removeKeyValuePair(pair.id)}
                        disabled={loading}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove pair"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {jsonbError && (
              <p className="text-sm text-red-600 font-medium">{jsonbError}</p>
            )}
          </div>

          {/* JSONB Data Preview at Bottom - Resizable */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <label className="block text-sm font-semibold text-slate-900">
              JSONB Data Preview
            </label>
            <div className="relative">
              <div
                ref={resizeRef}
                className="w-full border border-slate-300 rounded-lg bg-slate-50 font-mono text-xs text-slate-700 overflow-auto"
                style={{ height: `${previewHeight}px`, minHeight: '100px', maxHeight: '600px' }}
              >
                <div className="px-4 py-3">
                  <pre className="whitespace-pre-wrap break-words">{jsonPreview}</pre>
                </div>
              </div>
              <div
                onMouseDown={handleResizeStart}
                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200 transition-colors rounded-b-lg flex items-center justify-center group"
              >
                <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 rounded-b-lg sm:rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !!jsonbError || !orderOnMarketPlace.trim() || !keyValuePairs.some((p) => p.key.trim() !== '')}
            className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all disabled:bg-blue-300 disabled:text-white disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

