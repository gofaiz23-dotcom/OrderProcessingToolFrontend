'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Clock, X } from 'lucide-react';

type XPOQuoteCardProps = {
  quote: any;
  index: number;
};

export const XPOQuoteCard = ({ quote, index }: XPOQuoteCardProps) => {
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
      className={`border-2 rounded-lg p-3 sm:p-4 lg:p-5 transition-all ${
        index === 0
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1">
          <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
            {quote.serviceLevelText || quote.serviceLevel || 'Service Level'}
          </h4>
          {quote.rateFound !== false ? (
            <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm mb-2">
              <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
              <span>Rate Found</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 text-xs sm:text-sm mb-2">
              <Clock size={14} className="sm:w-4 sm:h-4" />
              <span>Rate Not Available</span>
            </div>
          )}
        </div>
        <div className="text-left sm:text-right relative">
          {quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0 ? (
            <>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                ${quote.quoteRate.totalCharges}
              </div>
              {quote.chargeItems && quote.chargeItems.length > 0 ? (
                <div
                  ref={chargesTextRef}
                  onClick={() => setShowChargesPopup(!showChargesPopup)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline font-semibold transition-colors"
                >
                  Quote Details
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-600">Total Charges</div>
              )}
            </>
          ) : (
            <div className="text-sm sm:text-base font-semibold text-slate-500">
              Rate Not Available
            </div>
          )}
        </div>
      </div>

      {quote.dates && (
        <div className="space-y-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="break-words">
              Delivery: {quote.dates.transitDeliveryDate || quote.dates.deliveryDate} {quote.dates.transitDeliveryTime ? `by ${quote.dates.transitDeliveryTime}` : ''}
            </span>
          </div>
          {quote.transitDetails?.transitDays && (
            <div className="text-xs sm:text-sm text-slate-600">
              Transit Days: {quote.transitDetails.transitDays}
            </div>
          )}
        </div>
      )}

      {quote.quoteId && (
        <div className="text-[10px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Quote ID: {quote.quoteId}</div>
      )}

      {quote.quoteRate?.ratedAccessorials && quote.quoteRate.ratedAccessorials.length > 0 && (
        <div className="mb-3 sm:mb-4">
          <div className="text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-2">Accessorials:</div>
          <div className="space-y-1">
            {quote.quoteRate.ratedAccessorials.map((acc: any, accIndex: number) => (
              <div key={accIndex} className="text-[10px] sm:text-xs text-slate-600 break-words">
                {acc.description}: ${acc.charge}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-slate-200">
        <input
          type="radio"
          name="selectedQuote"
          defaultChecked={index === 0 && quote.rateFound !== false && quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0}
          disabled={quote.rateFound === false || !quote.quoteRate?.totalCharges || parseFloat(quote.quoteRate.totalCharges) === 0}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className={`text-xs sm:text-sm ${quote.rateFound === false || !quote.quoteRate?.totalCharges || parseFloat(quote.quoteRate.totalCharges) === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
          {quote.rateFound !== false && quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0 ? 'Select this quote' : 'Rate not available'}
        </span>
      </div>

      {/* Charges Popup */}
      {showChargesPopup && quote.chargeItems && quote.chargeItems.length > 0 && (
        <>
          {/* Small Popup - positioned near the charges text */}
          <div
            ref={popupRef}
            className="fixed z-50 bg-white rounded-lg sm:rounded-xl shadow-2xl border border-slate-200 w-[calc(100vw-2rem)] sm:w-72 max-w-sm max-h-[400px] overflow-hidden"
            style={{
              top: chargesTextRef.current
                ? `${chargesTextRef.current.getBoundingClientRect().bottom + window.scrollY + 8}px`
                : '50%',
              right: chargesTextRef.current
                ? `${window.innerWidth - chargesTextRef.current.getBoundingClientRect().right}px`
                : 'auto',
              left: chargesTextRef.current ? 'auto' : '50%',
              transform: chargesTextRef.current ? 'none' : 'translate(-50%, -50%)',
            }}
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">All Charges</h3>
              <button
                type="button"
                onClick={() => setShowChargesPopup(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Popup Body */}
            <div className="overflow-y-auto max-h-[320px] p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-2.5">
                {quote.chargeItems.map((charge: any, chargeIndex: number) => (
                  <div
                    key={chargeIndex}
                    className="flex items-center justify-between py-2 sm:py-2.5 px-2 sm:px-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <p className="text-[10px] sm:text-xs font-medium text-slate-700 flex-1 pr-2 break-words">
                      {charge.description}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap flex-shrink-0">
                      ${parseFloat(charge.charge).toFixed(2)}
                    </p>
                  </div>
                ))}
                
                {/* Total */}
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between py-2 sm:py-2.5 px-2 sm:px-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">Total Charges</p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
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

