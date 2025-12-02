'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { ShippedOrder, UpdateShippedOrderPayload } from '../utils/shippedOrdersApi';

type ProcessedOrderEditModalProps = {
  isOpen: boolean;
  order: ShippedOrder | null;
  onClose: () => void;
  onSave: (payload: UpdateShippedOrderPayload) => Promise<void>;
};

export const ProcessedOrderEditModal = ({
  isOpen,
  order,
  onClose,
  onSave,
}: ProcessedOrderEditModalProps) => {
  const [sku, setSku] = useState('');
  const [orderOnMarketPlace, setOrderOnMarketPlace] = useState('');
  const [status, setStatus] = useState('pending');
  const [ordersJsonb, setOrdersJsonb] = useState('{}');
  const [rateQuotesResponseJsonb, setRateQuotesResponseJsonb] = useState('{}');
  const [bolResponseJsonb, setBolResponseJsonb] = useState('{}');
  const [pickupResponseJsonb, setPickupResponseJsonb] = useState('{}');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setSku(order.sku || '');
      setOrderOnMarketPlace(order.orderOnMarketPlace || '');
      setStatus(order.status || 'pending');
      setOrdersJsonb(JSON.stringify(order.ordersJsonb || {}, null, 2));
      setRateQuotesResponseJsonb(JSON.stringify(order.rateQuotesResponseJsonb || {}, null, 2));
      setBolResponseJsonb(JSON.stringify(order.bolResponseJsonb || {}, null, 2));
      setPickupResponseJsonb(JSON.stringify(order.pickupResponseJsonb || {}, null, 2));
      setFiles([]);
      setError(null);
    }
  }, [order]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: UpdateShippedOrderPayload = {
        sku,
        orderOnMarketPlace,
        status,
      };

      // Parse JSON fields
      try {
        if (ordersJsonb.trim()) {
          payload.ordersJsonb = JSON.parse(ordersJsonb);
        }
      } catch (err) {
        throw new Error('Invalid Orders JSONB format');
      }

      try {
        if (rateQuotesResponseJsonb.trim()) {
          payload.rateQuotesResponseJsonb = JSON.parse(rateQuotesResponseJsonb);
        }
      } catch (err) {
        throw new Error('Invalid Rate Quotes JSONB format');
      }

      try {
        if (bolResponseJsonb.trim()) {
          payload.bolResponseJsonb = JSON.parse(bolResponseJsonb);
        }
      } catch (err) {
        throw new Error('Invalid BOL JSONB format');
      }

      try {
        if (pickupResponseJsonb.trim()) {
          payload.pickupResponseJsonb = JSON.parse(pickupResponseJsonb);
        }
      } catch (err) {
        throw new Error('Invalid Pickup JSONB format');
      }

      if (files.length > 0) {
        payload.files = files;
      }

      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Edit Processed Order</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Marketplace <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderOnMarketPlace}
                  onChange={(e) => setOrderOnMarketPlace(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Orders JSONB</label>
              <textarea
                value={ordersJsonb}
                onChange={(e) => setOrdersJsonb(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Rate Quotes Response JSONB</label>
              <textarea
                value={rateQuotesResponseJsonb}
                onChange={(e) => setRateQuotesResponseJsonb(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">BOL Response JSONB</label>
              <textarea
                value={bolResponseJsonb}
                onChange={(e) => setBolResponseJsonb(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Pickup Response JSONB</label>
              <textarea
                value={pickupResponseJsonb}
                onChange={(e) => setPickupResponseJsonb(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1">Additional Files</label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg  text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

