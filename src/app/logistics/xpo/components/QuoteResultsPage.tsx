'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Info, X } from 'lucide-react';

type QuoteResultsPageProps = {
  quoteNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  commodities: string;
  totalWeight: string;
  paymentTerms: string;
  accountCode?: string;
  accountNumber?: string;
  quotes: any[];
  onBack: () => void;
  onRequote: () => void;
  onClose: () => void;
  onCreateBOLAndPickup: (quote: any) => void;
  onCreateBOL: (quote: any) => void;
  onSchedulePickup: (quote: any) => void;
};

export const QuoteResultsPage = ({
  quoteNumber,
  pickupLocation,
  deliveryLocation,
  commodities,
  totalWeight,
  paymentTerms,
  accountCode,
  accountNumber,
  quotes,
  onBack,
  onRequote,
  onClose,
  onCreateBOLAndPickup,
  onCreateBOL,
  onSchedulePickup,
}: QuoteResultsPageProps) => {
  const [showPriceBreakdown, setShowPriceBreakdown] = useState<number | null>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[date.getDay()];
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${dayName} ${month}/${day}/${year}`;
    } catch {
      return dateString;
    }
  };

  const getTransitDays = (quote: any) => {
    if (quote.transitDetails?.transitDays) {
      return `${quote.transitDetails.transitDays} Business Days`;
    }
    if (quote.dates?.transitDeliveryDate && quote.dates?.shipDate) {
      try {
        const shipDate = new Date(quote.dates.shipDate);
        const deliveryDate = new Date(quote.dates.transitDeliveryDate);
        const diffTime = Math.abs(deliveryDate.getTime() - shipDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} Business Days`;
      } catch {
        return '3 Business Days';
      }
    }
    return '3 Business Days';
  };

  const getDiscountPercentage = (quote: any) => {
    // Try multiple possible paths for discount percentage
    if (quote.actlDiscountPct !== undefined && quote.actlDiscountPct !== null) {
      return `${quote.actlDiscountPct}%`;
    }
    if (quote.quoteRate?.discountPercent !== undefined) {
      return `${quote.quoteRate.discountPercent}%`;
    }
    if (quote.discountPercentage !== undefined) {
      return `${quote.discountPercentage}%`;
    }
    if (quote.quoteRate?.discountPercentage !== undefined) {
      return `${quote.quoteRate.discountPercentage}%`;
    }
    return '91.67%';
  };

  const getBasePrice = (quote: any) => {
    // Try multiple possible paths for base price
    if (quote.basePriceAmt?.amt !== undefined) {
      return quote.basePriceAmt.amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (quote.quoteRate?.basePrice !== undefined) {
      return typeof quote.quoteRate.basePrice === 'number' 
        ? quote.quoteRate.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : quote.quoteRate.basePrice;
    }
    if (quote.basePrice !== undefined) {
      return typeof quote.basePrice === 'number'
        ? quote.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : quote.basePrice;
    }
    return '2,665.50';
  };

  const getTotalCharges = (quote: any) => {
    // Helper function to format amount
    const formatAmount = (value: any): string => {
      if (value === undefined || value === null) return '';
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return '';
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    // Check totCharge array (from response.data.data.rateQuote.totCharge[0].amt)
    if (quote.totCharge && Array.isArray(quote.totCharge) && quote.totCharge.length > 0) {
      const firstCharge = quote.totCharge[0];
      if (firstCharge?.amt !== undefined && firstCharge.amt !== null) {
        return formatAmount(firstCharge.amt);
      }
    }
    
    // Check totChargesAmt.amt (most common)
    if (quote.totChargesAmt?.amt !== undefined && quote.totChargesAmt.amt !== null) {
      return formatAmount(quote.totChargesAmt.amt);
    }
    
    // Check netChargesAmt.amt
    if (quote.netChargesAmt?.amt !== undefined && quote.netChargesAmt.amt !== null) {
      return formatAmount(quote.netChargesAmt.amt);
    }
    
    // Check totAccessorialAmt.amt (might be the total)
    if (quote.totAccessorialAmt?.amt !== undefined && quote.totAccessorialAmt.amt !== null) {
      return formatAmount(quote.totAccessorialAmt.amt);
    }
    
    // Check chargeAmt.amt
    if (quote.chargeAmt?.amt !== undefined && quote.chargeAmt.amt !== null) {
      return formatAmount(quote.chargeAmt.amt);
    }
    
    // Check quoteRate.totalCharges
    if (quote.quoteRate?.totalCharges !== undefined && quote.quoteRate.totalCharges !== null) {
      return formatAmount(quote.quoteRate.totalCharges);
    }
    
    // Check totalCharges directly
    if (quote.totalCharges !== undefined && quote.totalCharges !== null) {
      return formatAmount(quote.totalCharges);
    }
    
    // Check for any amount field directly
    if (quote.amt !== undefined && quote.amt !== null) {
      return formatAmount(quote.amt);
    }
    
    // Fallback: Try to calculate from base price and discount
    const basePrice = quote.basePriceAmt?.amt || quote.quoteRate?.basePrice || quote.basePrice;
    const discountPct = quote.actlDiscountPct || quote.quoteRate?.discountPercent || quote.discountPercentage;
    
    if (basePrice !== undefined && basePrice !== null && discountPct !== undefined && discountPct !== null) {
      const basePriceNum = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice);
      const discountNum = typeof discountPct === 'number' ? discountPct : parseFloat(discountPct);
      if (!isNaN(basePriceNum) && !isNaN(discountNum)) {
        const calculatedPrice = basePriceNum * (1 - discountNum / 100);
        return formatAmount(calculatedPrice);
      }
    }
    
    return '0.00';
  };

  // Helper function to format amount
  const formatAmount = (value: any): string => {
    if (value === undefined || value === null) return '0.00';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get price breakdown data from quote
  const getPriceBreakdown = (quote: any) => {
    const breakdown: {
      accessorials: Array<{ code: string; desc: string; amount: number }>;
      commodityCharge: number;
      totalDiscount: number;
      totalCharge: number;
      basePrice?: number;
      discountPercent?: number;
    } = {
      accessorials: [],
      commodityCharge: 0,
      totalDiscount: 0,
      totalCharge: 0,
    };

    // Get accessorials from shipmentInfo.accessorials
    if (quote.shipmentInfo?.accessorials && Array.isArray(quote.shipmentInfo.accessorials)) {
      breakdown.accessorials = quote.shipmentInfo.accessorials.map((acc: any) => ({
        code: acc.accessorialCd || '',
        desc: acc.accessorialDesc || '',
        amount: acc.chargeAmt?.amt || 0,
      }));
    }

    // Get total commodity charge
    if (quote.shipmentInfo?.totCommodityCharge?.amt !== undefined) {
      breakdown.commodityCharge = quote.shipmentInfo.totCommodityCharge.amt;
    } else if (quote.shipmentInfo?.commodity?.[0]?.charge?.chargeAmt?.amt !== undefined) {
      breakdown.commodityCharge = quote.shipmentInfo.commodity[0].charge.chargeAmt.amt;
    }

    // Get total discount amount
    if (quote.totDiscountAmt?.amt !== undefined) {
      breakdown.totalDiscount = quote.totDiscountAmt.amt;
    }

    // Get total charge
    if (quote.totCharge && Array.isArray(quote.totCharge) && quote.totCharge.length > 0) {
      breakdown.totalCharge = quote.totCharge[0].amt || 0;
    }

    // Get base price and discount percent for display
    if (quote.shipmentInfo?.commodity?.[0]?.charge?.calcMethod?.perUnitRate !== undefined) {
      breakdown.basePrice = quote.shipmentInfo.commodity[0].charge.calcMethod.perUnitRate;
    }
    if (quote.actlDiscountPct !== undefined) {
      breakdown.discountPercent = quote.actlDiscountPct;
    }

    return breakdown;
  };

  // Close breakdown modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (breakdownRef.current && !breakdownRef.current.contains(event.target as Node)) {
        setShowPriceBreakdown(null);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPriceBreakdown(null);
      }
    };

    if (showPriceBreakdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showPriceBreakdown]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Rate Quote</h1>
      </div>

      {/* Quote Number */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Quote# {quoteNumber}</h2>
      </div>

      {/* Shipment Details Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">PICKUP LOCATION:</label>
            <p className="text-base text-blue-600 hover:text-blue-700 cursor-pointer underline">
              {pickupLocation || 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">DELIVERY LOCATION:</label>
            <p className="text-base text-blue-600 hover:text-blue-700 cursor-pointer underline">
              {deliveryLocation || 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">COMMODITIES:</label>
            <p className="text-base text-slate-900">{commodities || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">TOTAL QUOTED WEIGHT:</label>
            <p className="text-base text-slate-900">{totalWeight || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">PAYMENT TERMS:</label>
            <p className="text-base text-slate-900">{paymentTerms || 'N/A'}</p>
          </div>
          {accountCode && (
            <div>
              <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">ACCOUNT CODE:</label>
              <p className="text-base text-slate-900">{accountCode}</p>
            </div>
          )}
          {accountNumber && (
            <div>
              <label className="text-sm font-semibold text-slate-600 uppercase block mb-1">ACCOUNT #:</label>
              <p className="text-base text-slate-900">{accountNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Note Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-900 block mb-2">NOTE</label>
            <p className="text-sm text-slate-700 mb-2">
              Price estimate is based on the information provided. If the actual shipment is different from the quote, the price will change to reflect the updated information.{' '}
              <span className="text-blue-600 hover:text-blue-700 cursor-pointer underline">Details</span>
            </p>
            <p className="text-sm text-orange-600 font-medium">
              * Reminder: Single Shipments may be subject to a special service charge if the weight is less than 500 Lbs
            </p>
          </div>
        </div>
      </div>

      {/* Quote Results */}
      <div className="mb-6">
        <p className="text-sm text-slate-600 mb-4">
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''} found matching your preferences.
        </p>

        {quotes.map((quote, index) => (
          <div key={quote.quoteId || quote.confirmationNbr || index} className="bg-white rounded-lg border border-slate-200 p-6 mb-4 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side - Service Info */}
              <div className="lg:col-span-4">
                <div className="inline-block bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded mb-3">
                  Standard
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  XPO {getDiscountPercentage(quote)} Standard Discount
                </h3>
                <p className="text-sm text-slate-600">
                  On ${getBasePrice(quote)} Base Price.
                </p>
              </div>

              {/* Middle - Shipping Schedule */}
              <div className="lg:col-span-3 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Ship On</label>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(quote.dates?.shipDate || quote.shipDate || quote.quoteCreateDate)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Es. Transit</label>
                  <p className="text-sm font-semibold text-slate-900">
                    {getTransitDays(quote)}
                  </p>
                </div>
              </div>

              {/* Right Side - Cost and Actions */}
              <div className="lg:col-span-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Cost</label>
                    <p className="text-3xl font-bold text-slate-900 mb-2">
                      ${getTotalCharges(quote)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPriceBreakdown(index)}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Price break down
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => onCreateBOLAndPickup(quote)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      Create BOL + Pickup
                    </button>
                    <button
                      // onClick={() => onCreateBOL(quote)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      Create BOL
                    </button>
                    <button
                      // onClick={() => onSchedulePickup(quote)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      Schedule Pickup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onRequote}
          className="px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
        >
          Requote
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
        >
          Close
        </button>
      </div>

      {/* Price Breakdown Modal */}
      {showPriceBreakdown !== null && quotes[showPriceBreakdown] && (() => {
        const quote = quotes[showPriceBreakdown];
        const breakdown = getPriceBreakdown(quote);
        const totalAccessorialAmount = breakdown.accessorials.reduce((sum, acc) => sum + acc.amount, 0);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={breakdownRef}
              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-xl font-bold text-slate-900">Price Breakdown</h2>
                <button
                  type="button"
                  onClick={() => setShowPriceBreakdown(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
                  {/* Commodity Charge */}
                  {breakdown.commodityCharge > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Commodity Charge</span>
                        <span className="text-base font-bold text-slate-900">
                          ${formatAmount(breakdown.commodityCharge)}
                        </span>
                      </div>
                      {breakdown.basePrice && (
                        <div className="text-xs text-slate-600">
                          Base Rate: ${formatAmount(breakdown.basePrice)} per unit
                        </div>
                      )}
                      {breakdown.discountPercent !== undefined && (
                        <div className="text-xs text-slate-600">
                          Discount: {breakdown.discountPercent}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accessorials */}
                  {breakdown.accessorials.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Accessorials</h3>
                      <div className="space-y-2">
                        {breakdown.accessorials.map((acc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">{acc.desc}</div>
                              {acc.code && (
                                <div className="text-xs text-slate-600">Code: {acc.code}</div>
                              )}
                            </div>
                            <div className="text-sm font-bold text-slate-900 ml-4">
                              ${formatAmount(acc.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalAccessorialAmount > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">Total Accessorials</span>
                            <span className="text-base font-bold text-slate-900">
                              ${formatAmount(totalAccessorialAmount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Discount */}
                  {breakdown.totalDiscount > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-700">Total Discount</span>
                        <span className="text-base font-bold text-green-700">
                          -${formatAmount(breakdown.totalDiscount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Total Charge */}
                  <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-300 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-900">Total Charge</span>
                      <span className="text-2xl font-bold text-slate-900">
                        ${formatAmount(breakdown.totalCharge)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowPriceBreakdown(null)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

