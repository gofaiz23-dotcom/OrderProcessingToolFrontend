'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { XPORateQuote } from './XPORateQuote';
import { EstesRateQuote } from './EstesRateQuote';

type LTLRateQuoteModalProps = {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
};

export const LTLRateQuoteModal = ({
  isOpen,
  order,
  onClose,
}: LTLRateQuoteModalProps) => {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 left-56 sm:left-64 right-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl border border-slate-200 w-full h-full flex flex-col animate-slide-up-and-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            LTL Rate Quote - Order #{order.id}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Split Screen */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          {/* XPO Rate Quote - Left Side */}
          <div className="flex-1 border-r border-slate-200 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                XPO Rate Quote
              </h3>
              <XPORateQuote order={order} />
            </div>
          </div>

          {/* Estes Rate Quote - Right Side */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                Estes Rate Quote
              </h3>
              <EstesRateQuote order={order} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
        
        </div>
      </div>
    </div>
  );
};

