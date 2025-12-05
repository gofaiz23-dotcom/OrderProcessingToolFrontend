'use client';

import { Search } from 'lucide-react';

type BillToSectionProps = {
  billTo: string;
  onBillToChange: (value: string) => void;
};

export const BillToSection = ({
  billTo,
  onBillToChange,
}: BillToSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Bill To</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900">
          Bill To (Optional)
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={billTo}
            onChange={(e) => onBillToChange(e.target.value)}
            placeholder="Search Bill To"
            className="w-full pl-10 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

