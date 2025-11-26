'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { formatJsonb } from '@/app/utils/Orders';

type OrderDetailsModalProps = {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
};

export const OrderDetailsModal = ({
  isOpen,
  order,
  onClose,
}: OrderDetailsModalProps) => {
  // Handle Escape key to close modal
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

  const jsonbString = formatJsonb(order.jsonb);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up-and-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Order Details #{order.id}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Order ID
            </label>
            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900">
              #{order.id}
            </div>
          </div>

          {/* Order on Marketplace */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Marketplace
            </label>
            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900">
              {order.orderOnMarketPlace}
            </div>
          </div>

          {/* JSONB Data */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              JSONB Data
            </label>
            <div className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm text-slate-900 max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap break-words">{jsonbString}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

