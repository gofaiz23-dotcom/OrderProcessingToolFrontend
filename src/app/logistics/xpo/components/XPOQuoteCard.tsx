'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Clock, X, MapPin, Package, DollarSign, Calendar, Info } from 'lucide-react';

type XPOQuoteCardProps = {
  quote: any;
  index: number;
};

export const XPOQuoteCard = ({ quote, index }: XPOQuoteCardProps) => {
  const [showChargesPopup, setShowChargesPopup] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
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

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on buttons, links, or popup triggers
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[data-no-select]') ||
      chargesTextRef.current?.contains(target)
    ) {
      return;
    }
    
    if (quote.rateFound !== false && quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0) {
      setIsSelected(true);
      // Unselect all other quotes (both XPO and Estes) by dispatching a custom event with carrier identifier
      window.dispatchEvent(new CustomEvent('quoteSelected', { 
        detail: { 
          quoteId: quote.quoteId, 
          index,
          carrier: 'xpo' // Identify this as an XPO quote
        } 
      }));
    }
  };

  // Auto-select first valid XPO quote on mount
  useEffect(() => {
    if (index === 0 && quote.rateFound !== false && quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0) {
      // Auto-select the first XPO quote
      setIsSelected(true);
      // Dispatch event to ensure other quotes are deselected
      window.dispatchEvent(new CustomEvent('quoteSelected', { 
        detail: { 
          quoteId: quote.quoteId, 
          index,
          carrier: 'xpo'
        } 
      }));
    }
  }, [quote.quoteId, quote.rateFound, quote.quoteRate?.totalCharges, index]);

  // Listen for selection events from other cards (both XPO and Estes)
  useEffect(() => {
    const handleQuoteSelected = (e: CustomEvent) => {
      const { index: selectedIndex, carrier: selectedCarrier } = e.detail;
      // Deselect if it's a different quote (different carrier OR same carrier but different index)
      const isThisQuote = selectedCarrier === 'xpo' && selectedIndex === index;
      if (!isThisQuote) {
        setIsSelected(false);
      } else {
        setIsSelected(true);
      }
    };
    window.addEventListener('quoteSelected' as any, handleQuoteSelected as EventListener);
    return () => {
      window.removeEventListener('quoteSelected' as any, handleQuoteSelected as EventListener);
    };
  }, [index]);

  return (
    <div
      onClick={handleCardClick}
      data-quote-selected={isSelected}
      className={`border-2 rounded-lg p-3 sm:p-4 lg:p-5 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : quote.rateFound !== false && quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0
          ? 'border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50'
          : 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
      }`}
    >
      {/* Quote Number */}
      {quote.quoteId && (
        <div className="mb-3 sm:mb-4">
          <div className="text-xs sm:text-sm font-bold text-slate-900">
            Quote# {quote.quoteId}
          </div>
        </div>
      )}

      {/* Pickup and Delivery Locations */}
      {(quote.pickupLocation || quote.deliveryLocation) && (
        <div className="mb-3 sm:mb-4 space-y-2">
          {quote.pickupLocation && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">PICKUP LOCATION:</span>
                <span className="ml-1">{quote.pickupLocation}</span>
              </div>
            </div>
          )}
          {quote.deliveryLocation && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">DELIVERY LOCATION:</span>
                <span className="ml-1">{quote.deliveryLocation}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commodities and Weight */}
      {(quote.commoditiesText || quote.totalWeightText) && (
        <div className="mb-3 sm:mb-4 space-y-2">
          {quote.commoditiesText && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
              <Package size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">COMMODITIES:</span>
                <span className="ml-1">{quote.commoditiesText}</span>
              </div>
            </div>
          )}
          {quote.totalWeightText && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
              <Package size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">TOTAL QUOTED WEIGHT:</span>
                <span className="ml-1">{quote.totalWeightText}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Terms */}
      {quote.paymentTerms && (
        <div className="mb-3 sm:mb-4">
          <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
            <DollarSign size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">PAYMENT TERMS:</span>
              <span className="ml-1">{quote.paymentTerms}</span>
            </div>
          </div>
        </div>
      )}

      {/* Note/Reminder */}
      <div className="mb-3 sm:mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700">
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <div className="font-semibold mb-1">NOTE</div>
            <div>
              Price estimate is based on the information provided. If the actual shipment is different from the quote, the price will change to reflect the updated information.
            </div>
            {quote.totalWeightText && parseFloat(quote.totalWeightText.replace(' Lbs.', '').replace(' Lbs', '')) < 500 && (
              <div className="mt-2 text-amber-700 font-semibold">
                * Reminder: Single Shipments may be subject to a special service charge if the weight is less than 500 Lbs
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Level and Pricing */}
      <div className="mb-3 sm:mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
              {quote.serviceLevelText || quote.serviceLevel || 'Standard'}
            </h4>
            {quote.discountPct > 0 && quote.basePrice > 0 && (
              <div className="text-xs sm:text-sm text-slate-700 mb-1">
                XPO {quote.discountPct}% Standard Discount
              </div>
            )}
            {quote.basePrice > 0 && (
              <div className="text-xs sm:text-sm text-slate-600">
                On ${formatCurrency(quote.basePrice)} Base Price.
              </div>
            )}
          </div>
          <div className="text-left sm:text-right">
            {quote.quoteRate?.totalCharges && parseFloat(quote.quoteRate.totalCharges) > 0 ? (
              <>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  ${formatCurrency(quote.quoteRate.totalCharges)}
                </div>
                {quote.chargeItems && quote.chargeItems.length > 0 ? (
                  <div
                    ref={chargesTextRef}
                    data-no-select
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChargesPopup(!showChargesPopup);
                    }}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline font-semibold transition-colors"
                  >
                    Price break down
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-slate-600">Cost</div>
                )}
              </>
            ) : (
              <div className="text-sm sm:text-base font-semibold text-slate-500">
                Rate Not Available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ship Date and Transit */}
      <div className="mb-3 sm:mb-4 space-y-2">
        {quote.dates?.shipmentDate && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
            <Calendar size={14} className="flex-shrink-0" />
            <span>
              <span className="font-semibold">Ship On</span>
              <span className="ml-1">{quote.dates.shipmentDate}</span>
            </span>
          </div>
        )}
        {quote.transitDetails?.transitDays && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
            <Clock size={14} className="flex-shrink-0" />
            <span>
              <span className="font-semibold">Es. Transit</span>
              <span className="ml-1">{quote.transitDetails.transitDays} Business Days</span>
            </span>
          </div>
        )}
        {quote.dates?.deliveryDate && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
            <Clock size={14} className="flex-shrink-0" />
            <span>
              <span className="font-semibold">Delivery:</span>
              <span className="ml-1">{quote.dates.deliveryDate}</span>
            </span>
          </div>
        )}
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <CheckCircle2 size={16} className="text-blue-600" />
          <span className="text-xs sm:text-sm text-blue-700 font-semibold">Selected</span>
        </div>
      )}

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

