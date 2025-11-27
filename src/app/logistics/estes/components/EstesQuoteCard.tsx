'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Clock, X } from 'lucide-react';

type EstesQuoteCardProps = {
  quote: any;
  index: number;
};

export const EstesQuoteCard = ({ quote, index }: EstesQuoteCardProps) => {
  const [showChargesPopup, setShowChargesPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const chargesTextRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        chargesTextRef.current &&
        !chargesTextRef.current.contains(event.target as Node)
      ) {
        setShowChargesPopup(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowChargesPopup(false);
      }
    };

    if (showChargesPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showChargesPopup]);

  return (
    <div
      className={`border-2 rounded-lg p-5 transition-all ${
        index === 0
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-slate-900 mb-2">
            {quote.serviceLevelText || 'Service Level'}
          </h4>
          {quote.rateFound && (
            <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
              <CheckCircle2 size={16} />
              <span>Rate Found</span>
            </div>
          )}
        </div>
        <div className="text-right relative">
          <div className="text-2xl font-bold text-slate-900">
            ${quote.quoteRate?.totalCharges || '0.00'}
          </div>
          {quote.chargeItems && quote.chargeItems.length > 0 ? (
            <div
              ref={chargesTextRef}
              onClick={() => setShowChargesPopup(!showChargesPopup)}
              className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline font-semibold transition-colors"
            >
              Quote Details
            </div>
          ) : (
            <div className="text-sm text-slate-600">Total Charges</div>
          )}
        </div>
      </div>

      {quote.dates && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clock size={14} />
            <span>
              Delivery: {quote.dates.transitDeliveryDate} by {quote.dates.transitDeliveryTime}
            </span>
          </div>
          {quote.transitDetails?.transitDays && (
            <div className="text-sm text-slate-600">
              Transit Days: {quote.transitDetails.transitDays}
            </div>
          )}
        </div>
      )}

      {quote.quoteId && (
        <div className="text-xs text-slate-500 mb-4">Quote ID: {quote.quoteId}</div>
      )}

      {quote.quoteRate?.ratedAccessorials && quote.quoteRate.ratedAccessorials.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">Accessorials:</div>
          <div className="space-y-1">
            {quote.quoteRate.ratedAccessorials.map((acc: any, accIndex: number) => (
              <div key={accIndex} className="text-xs text-slate-600">
                {acc.description}: ${acc.charge}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
        <input
          type="radio"
          name="selectedQuote"
          defaultChecked={index === 0}
          className="w-4 h-4 text-blue-600"
        />
        <span className="text-sm text-slate-700">Select this quote</span>
      </div>

      {/* Charges Popup */}
      {showChargesPopup && quote.chargeItems && quote.chargeItems.length > 0 && (
        <>
          {/* Small Popup - positioned near the charges text */}
          <div
            ref={popupRef}
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 max-h-[400px] overflow-hidden"
            style={{
              top: chargesTextRef.current
                ? `${chargesTextRef.current.getBoundingClientRect().bottom + window.scrollY + 8}px`
                : '50%',
              right: chargesTextRef.current
                ? `${window.innerWidth - chargesTextRef.current.getBoundingClientRect().right}px`
                : 'auto',
              transform: chargesTextRef.current ? 'none' : 'translate(-50%, -50%)',
            }}
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-sm font-bold text-slate-900">All Charges</h3>
              <button
                type="button"
                onClick={() => setShowChargesPopup(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Popup Body */}
            <div className="overflow-y-auto max-h-[320px] p-4">
              <div className="space-y-2.5">
                {quote.chargeItems.map((charge: any, chargeIndex: number) => (
                  <div
                    key={chargeIndex}
                    className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <p className="text-xs font-medium text-slate-700 flex-1 pr-2">
                      {charge.description}
                    </p>
                    <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      ${parseFloat(charge.charge).toFixed(2)}
                    </p>
                  </div>
                ))}
                
                {/* Total */}
                <div className="mt-4 pt-3 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between py-2.5 px-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <p className="text-sm font-bold text-slate-900">Total Charges</p>
                    <p className="text-base font-bold text-slate-900">
                      ${quote.quoteRate?.totalCharges || '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

