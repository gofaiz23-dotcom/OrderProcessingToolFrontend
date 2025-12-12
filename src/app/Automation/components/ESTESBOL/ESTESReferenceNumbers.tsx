'use client';

import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

type ReferenceNumber = {
  id: string;
  type: string;
  value: string;
};

type ESTESReferenceNumbersProps = {
  referenceNumbers: ReferenceNumber[];
  onAddReferenceNumber: () => void;
  onRemoveReferenceNumber: (id: string) => void;
  onUpdateReferenceNumber: (id: string, field: 'type' | 'value', value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESReferenceNumbers = ({
  referenceNumbers,
  onAddReferenceNumber,
  onRemoveReferenceNumber,
  onUpdateReferenceNumber,
  isExpanded,
  onToggle,
}: ESTESReferenceNumbersProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900">Reference Numbers</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-4">
          {referenceNumbers.map((ref, index) => (
            <div key={ref.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Ref #{index + 1} - Type (Optional)
                </label>
                <select
                  value={ref.type}
                  onChange={(e) => onUpdateReferenceNumber(ref.id, 'type', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="PO">PO</option>
                  <option value="SO">SO</option>
                  <option value="Invoice">Invoice</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Reference # (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ref.value}
                    onChange={(e) => onUpdateReferenceNumber(ref.id, 'value', e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveReferenceNumber(ref.id)}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddReferenceNumber}
            className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center gap-2"
          >
            <Plus size={16} />
            ADD REFERENCE NUMBER
          </button>
          <p className="text-xs text-slate-600">
            Note: If you choose to schedule a pickup, all reference numbers will be visible to the driver picking up your shipment.
          </p>
        </div>
      )}
    </div>
  );
};

