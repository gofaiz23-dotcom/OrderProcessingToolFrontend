'use client';

import { Search, ChevronDown } from 'lucide-react';

type AdditionalCommoditySectionProps = {
  onManageCommodities?: () => void;
};

export const AdditionalCommoditySection = ({
  onManageCommodities,
}: AdditionalCommoditySectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-blue-600">Additional Commodity</h2>
        <div className="flex items-center gap-2">
          <Search className="text-slate-400" size={18} />
          <ChevronDown className="text-slate-400" size={18} />
        </div>
      </div>
      
      {onManageCommodities && (
        <button
          type="button"
          onClick={onManageCommodities}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Manage commodities
        </button>
      )}
    </div>
  );
};

