'use client';

import { ChevronDown, ChevronUp, Info } from 'lucide-react';

type ESTESShipmentInfoProps = {
  masterBol: string;
  shipDate: string;
  quoteId: string;
  autoAssignPro: boolean;
  onMasterBolChange: (value: string) => void;
  onShipDateChange: (value: string) => void;
  onQuoteIdChange: (value: string) => void;
  onAutoAssignProChange: (value: boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
  showQuoteSection?: boolean;
};

export const ESTESShipmentInfo = ({
  masterBol,
  shipDate,
  quoteId,
  autoAssignPro,
  onMasterBolChange,
  onShipDateChange,
  onQuoteIdChange,
  onAutoAssignProChange,
  isExpanded,
  onToggle,
  showQuoteSection = false,
}: ESTESShipmentInfoProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Shipment Information</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Optional: Enter your company's unique reference number or alphanumeric value.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Master BOL Number (Optional)
              </label>
              <input
                type="text"
                value={masterBol}
                onChange={(e) => onMasterBolChange(e.target.value)}
                placeholder="Enter master BOL number"
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Ship Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={shipDate}
                  onChange={(e) => onShipDateChange(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {showQuoteSection && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Quote Number (Optional)
              </label>
              <input
                type="text"
                value={quoteId}
                onChange={(e) => onQuoteIdChange(e.target.value)}
                placeholder="Enter quote number"
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {quoteId && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  Any updates made to the BOL that differ from the details of the quote will invalidate this quote.
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoAssignPro}
              onChange={(e) => onAutoAssignProChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label className="text-sm text-slate-700">Auto-assign PRO Number</label>
            <Info className="text-blue-500" size={16} />
          </div>
        </div>
      )}
    </div>
  );
};

