'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

type ESTESBillingInfoProps = {
  payer: string;
  terms: string;
  onPayerChange: (payer: string) => void;
  onTermsChange: (terms: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESBillingInfo = ({
  payer,
  terms,
  onPayerChange,
  onTermsChange,
  isExpanded,
  onToggle,
}: ESTESBillingInfoProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Billing Information</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Payer:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Shipper"
                    checked={payer === 'Shipper'}
                    onChange={(e) => onPayerChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Shipper</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Consignee"
                    checked={payer === 'Consignee'}
                    onChange={(e) => onPayerChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Consignee</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Third Party"
                    checked={payer === 'Third Party'}
                    onChange={(e) => onPayerChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Third Party (add)</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Terms:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Prepaid"
                    checked={terms === 'Prepaid'}
                    onChange={(e) => onTermsChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Prepaid</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Collect"
                    checked={terms === 'Collect'}
                    onChange={(e) => onTermsChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Collect</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

