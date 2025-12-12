'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { XPORateQuote, type XPORateQuoteRef } from './XPORateQuote';
import { EstesRateQuote, type EstesRateQuoteRef } from './EstesRateQuote';

type LTLRateQuoteModalProps = {
  isOpen: boolean;
  order: Order;
  subSKUs?: string[];
  shippingType?: 'LTL' | 'Parcel' | string;
  onClose: () => void;
};

export const LTLRateQuoteModal = ({
  isOpen,
  order,
  subSKUs = [],
  shippingType,
  onClose,
}: LTLRateQuoteModalProps) => {
  const xpoRef = useRef<XPORateQuoteRef>(null);
  const estesRef = useRef<EstesRateQuoteRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQuotes, setHasQuotes] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<'xpo' | 'estes' | null>(null);
  const [showBOLForm, setShowBOLForm] = useState(false);

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

  const handleGetBothQuotes = async () => {
    setIsLoading(true);
    try {
      // Trigger both quote generations simultaneously
      await Promise.all([
        xpoRef.current?.getQuote().catch(err => console.error('XPO quote error:', err)),
        estesRef.current?.getQuote().catch(err => console.error('Estes quote error:', err)),
      ]);
      // Check if quotes were generated after a short delay
      setTimeout(() => {
        const xpoHasQuotes = xpoRef.current?.hasQuotes() || false;
        const estesHasQuotes = estesRef.current?.hasQuotes() || false;
        setHasQuotes(xpoHasQuotes || estesHasQuotes);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for quote selection events
  useEffect(() => {
    const handleQuoteSelected = (e: CustomEvent) => {
      const { carrier } = e.detail;
      if (carrier === 'xpo' || carrier === 'estes') {
        setSelectedCarrier(carrier);
      }
    };
    window.addEventListener('quoteSelected' as any, handleQuoteSelected as EventListener);
    return () => {
      window.removeEventListener('quoteSelected' as any, handleQuoteSelected as EventListener);
    };
  }, []);

  // Check for quotes and BOL form visibility periodically
  useEffect(() => {
    if (!isOpen) {
      setHasQuotes(false);
      setShowBOLForm(false);
      setSelectedCarrier(null);
      return;
    }

    const checkQuotes = () => {
      const xpoHasQuotes = xpoRef.current?.hasQuotes() || false;
      const estesHasQuotes = estesRef.current?.hasQuotes() || false;
      setHasQuotes(xpoHasQuotes || estesHasQuotes);
      
      // Sync BOL form visibility
      const xpoBOLVisible = xpoRef.current?.isBOLFormVisible() || false;
      const estesBOLVisible = estesRef.current?.isBOLFormVisible() || false;
      if (xpoBOLVisible || estesBOLVisible) {
        setShowBOLForm(true);
        if (xpoBOLVisible && selectedCarrier !== 'xpo') {
          setSelectedCarrier('xpo');
        } else if (estesBOLVisible && selectedCarrier !== 'estes') {
          setSelectedCarrier('estes');
        }
      } else if (showBOLForm && !xpoBOLVisible && !estesBOLVisible) {
        // BOL form was closed
        setShowBOLForm(false);
      }
    };

    // Check immediately and then periodically
    checkQuotes();
    const interval = setInterval(checkQuotes, 500);

    return () => clearInterval(interval);
  }, [isOpen, showBOLForm, selectedCarrier]);

  const handleCreateBOL = () => {
    if (selectedCarrier === 'xpo') {
      xpoRef.current?.showBOLForm();
      setShowBOLForm(true);
    } else if (selectedCarrier === 'estes') {
      estesRef.current?.showBOLForm();
      setShowBOLForm(true);
    }
  };

  const handleBackToQuotes = () => {
    // The BOL forms have their own back handlers that will close them
    // We just need to reset our state - the useEffect will sync when BOL form closes
    setShowBOLForm(false);
  };

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
            {showBOLForm 
              ? `${selectedCarrier === 'xpo' ? 'XPO' : 'Estes'} Bill of Lading - Order #${order.id}`
              : `LTL Rate Quote - Order #${order.id}`
            }
          </h2>
          <div className="flex items-center gap-3">
            {showBOLForm ? (
              <button
                onClick={handleBackToQuotes}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                Back to Quotes
              </button>
            ) : hasQuotes && selectedCarrier ? (
              <button
                onClick={handleCreateBOL}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                Create BOL
              </button>
            ) : (
              <button
                onClick={handleGetBothQuotes}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Quotes...
                  </>
                ) : (
                  'Get Rate Quote'
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content - Always render both components but conditionally show/hide */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row relative">
          {/* XPO Rate Quote - Left Side */}
          <div 
            className={`flex-1 border-r-2 border-blue-300 overflow-y-auto bg-blue-50/30 transition-all ${
              showBOLForm && selectedCarrier !== 'xpo' ? 'hidden' : ''
            } ${showBOLForm && selectedCarrier === 'xpo' ? 'border-r-0' : ''}`}
          >
            <div className="p-4 sm:p-6">
              {!showBOLForm && (
                <h3 className="text-base font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-300">
                  XPO Rate Quote
                </h3>
              )}
              <XPORateQuote ref={xpoRef} order={order} subSKUs={subSKUs} shippingType={shippingType} />
            </div>
          </div>

          {/* Estes Rate Quote - Right Side */}
          <div 
            className={`flex-1 overflow-y-auto bg-green-50/30 transition-all ${
              showBOLForm && selectedCarrier !== 'estes' ? 'hidden' : ''
            } ${showBOLForm && selectedCarrier === 'estes' ? 'border-l-0' : ''}`}
          >
            <div className="p-4 sm:p-6">
              {!showBOLForm && (
                <h3 className="text-base font-semibold text-green-900 mb-4 pb-2 border-b-2 border-green-300">
                  Estes Rate Quote
                </h3>
              )}
              <EstesRateQuote ref={estesRef} order={order} subSKUs={subSKUs} shippingType={shippingType} />
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
