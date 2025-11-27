'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ShippedOrder } from '../utils/shippedOrdersApi';

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
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Processed Order Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">ID</label>
                  <p className="text-sm font-medium text-slate-900">#{order.id}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">SKU</label>
                  <p className="text-sm font-medium text-slate-900">{order.sku}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Marketplace</label>
                  <p className="text-sm font-medium text-slate-900">{order.orderOnMarketPlace}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <p className="text-sm font-medium text-slate-900">
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
                  <label className="text-xs text-slate-500">Created At</label>
                  <p className="text-sm font-medium text-slate-900">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Updated At</label>
                  <p className="text-sm font-medium text-slate-900">
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* JSONB Fields */}
            {order.ordersJsonb && Object.keys(order.ordersJsonb).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Orders JSONB</h3>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(order.ordersJsonb, null, 2)}
                </pre>
              </div>
            )}

            {order.rateQuotesResponseJsonb && Object.keys(order.rateQuotesResponseJsonb).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Rate Quotes Response JSONB</h3>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(order.rateQuotesResponseJsonb, null, 2)}
                </pre>
              </div>
            )}

            {order.bolResponseJsonb && Object.keys(order.bolResponseJsonb).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">BOL Response JSONB</h3>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(order.bolResponseJsonb, null, 2)}
                </pre>
              </div>
            )}

            {order.pickupResponseJsonb && Object.keys(order.pickupResponseJsonb).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Pickup Response JSONB</h3>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(order.pickupResponseJsonb, null, 2)}
                </pre>
              </div>
            )}

            {/* Uploads */}
            {order.uploads && order.uploads.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Uploaded Files</h3>
                <div className="space-y-2">
                  {order.uploads.map((upload, index) => (
                    <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{upload.filename}</p>
                      <p className="text-xs text-slate-500">{upload.mimetype} • {(upload.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

