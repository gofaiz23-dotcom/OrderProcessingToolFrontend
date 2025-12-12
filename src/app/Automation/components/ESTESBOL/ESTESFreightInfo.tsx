'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

type ESTESFreightInfoProps = {
  fullValueCoverage: boolean;
  fullValueCoverageAmount: string;
  onFullValueCoverageChange: (checked: boolean) => void;
  onFullValueCoverageAmountChange: (value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESFreightInfo = ({
  fullValueCoverage,
  fullValueCoverageAmount,
  onFullValueCoverageChange,
  onFullValueCoverageAmountChange,
  isExpanded,
  onToggle,
}: ESTESFreightInfoProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900">Freight Information</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fullValueCoverage}
                onChange={(e) => onFullValueCoverageChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">I would like Full Value Coverage.</span>
            </label>
            {fullValueCoverage && (
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Full Value Coverage (USD)
                </label>
                <input
                  type="number"
                  value={fullValueCoverageAmount}
                  onChange={(e) => onFullValueCoverageAmountChange(e.target.value)}
                  placeholder="Enter Amount ($)"
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

