'use client';

import { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import type { Order, CreateOrderPayload, UpdateOrderPayload } from '@/app/types/order';
import { formatJsonb, isValidJson, parseJsonSafely } from '@/app/utils/Orders';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

type OrderDetailProps = {
  order: Order | null;
  mode: 'view' | 'create' | 'edit';
  loading?: boolean;
  saving?: boolean;
  error?: unknown;
  onSave: (payload: CreateOrderPayload | UpdateOrderPayload) => void;
  onCancel: () => void;
};

export const OrderDetail = ({
  order,
  mode,
  loading = false,
  saving = false,
  error,
  onSave,
  onCancel,
}: OrderDetailProps) => {
  const [orderOnMarketPlace, setOrderOnMarketPlace] = useState('');
  const [jsonbString, setJsonbString] = useState('');
  const [jsonbError, setJsonbError] = useState<string | null>(null);

  // Initialize form when order changes
  useEffect(() => {
    if (order) {
      setOrderOnMarketPlace(order.orderOnMarketPlace);
      setJsonbString(formatJsonb(order.jsonb));
      setJsonbError(null);
    } else if (mode === 'create') {
      setOrderOnMarketPlace('');
      setJsonbString('{}');
      setJsonbError(null);
    }
  }, [order, mode]);

  const handleJsonbChange = (value: string) => {
    setJsonbString(value);
    if (value.trim() === '') {
      setJsonbError(null);
      return;
    }
    if (!isValidJson(value)) {
      setJsonbError('Invalid JSON format');
    } else {
      setJsonbError(null);
    }
  };

  const handleSave = () => {
    // Validate required fields
    if (!orderOnMarketPlace.trim()) {
      alert('Order on Marketplace is required');
      return;
    }

    const trimmedJsonb = jsonbString.trim();
    if (!trimmedJsonb) {
      alert('JSONB data is required');
      return;
    }

    if (jsonbError) {
      alert('Please fix JSON errors before saving');
      return;
    }

    // Validate JSON one more time
    if (!isValidJson(trimmedJsonb)) {
      alert('Invalid JSON format');
      return;
    }

    const parsedJsonb = parseJsonSafely(trimmedJsonb);
    if (parsedJsonb === null) {
      alert('Invalid JSON format');
      return;
    }

    onSave({
      orderOnMarketPlace: orderOnMarketPlace.trim(),
      jsonb: parsedJsonb as Record<string, unknown> | unknown[] | string | number | boolean | null,
    });
  };

  const isReadOnly = mode === 'view';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (mode === 'view' && !order) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <p className="text-sm">Select an order to view details</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === 'create' ? 'Create New Order' : mode === 'edit' ? 'Edit Order' : `Order #${order?.id}`}
        </h2>
        {!isReadOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!jsonbError || !orderOnMarketPlace.trim() || !jsonbString.trim()}
              className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all disabled:bg-blue-300 disabled:text-white disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error != null && (
        <div className="p-4 border-b border-red-200">
          <ErrorDisplay error={error} />
        </div>
      )}

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {/* Order on Marketplace */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Order on Marketplace <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={orderOnMarketPlace}
            onChange={(e) => setOrderOnMarketPlace(e.target.value)}
            disabled={isReadOnly || saving}
            placeholder="e.g., Amazon, eBay, Shopify"
            className="w-full px-4 py-2.5 border-2 border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm transition-colors"
          />
        </div>

        {/* JSONB Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            JSONB Data <span className="text-red-500">*</span>
          </label>
          <textarea
            value={jsonbString}
            onChange={(e) => handleJsonbChange(e.target.value)}
            disabled={isReadOnly || saving}
            placeholder='{"key": "value"}'
            rows={15}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed font-mono text-sm text-slate-900 shadow-sm transition-colors ${
              jsonbError
                ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {jsonbError && (
            <p className="mt-1 text-sm text-red-600">{jsonbError}</p>
          )}
          {!jsonbError && jsonbString.trim() && (
            <p className="mt-1 text-xs text-green-600">Valid JSON</p>
          )}
        </div>

        {/* Order ID (view mode only) */}
        {mode === 'view' && order && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Order ID
            </label>
            <input
              type="text"
              value={order.id}
              disabled
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed shadow-sm"
            />
          </div>
        )}

        {/* Help text */}
        {!isReadOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> The JSONB field accepts valid JSON. You can enter objects, arrays, strings, numbers, booleans, or null.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

