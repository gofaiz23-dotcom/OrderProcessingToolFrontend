'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { XPOBillOfLadingReference } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';

type ReferenceNumbersSectionProps = {
  references: XPOBillOfLadingReference[];
  onReferencesChange: (references: XPOBillOfLadingReference[]) => void;
};

const REFERENCE_TYPE_OPTIONS = [
  { value: 'Other', label: 'Other' },
  { value: 'PO', label: 'PO' },
  { value: 'SO', label: 'SO' },
  { value: 'BOL', label: 'BOL' },
  { value: 'PRO', label: 'PRO' },
];

export const ReferenceNumbersSection = ({
  references,
  onReferencesChange,
}: ReferenceNumbersSectionProps) => {
  const addReference = () => {
    onReferencesChange([
      ...references,
      {
        referenceCode: '',
        reference: '',
        referenceDescr: '',
        referenceTypeCd: 'Other',
      },
    ]);
  };

  const removeReference = (index: number) => {
    onReferencesChange(references.filter((_, i) => i !== index));
  };

  const updateReference = (index: number, field: keyof XPOBillOfLadingReference, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    onReferencesChange(updated);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Reference Number(s)</h2>
      
      <div className="space-y-4">
        {references.map((ref, index) => (
          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Type</label>
                  <select
                    value={ref.referenceTypeCd || 'Other'}
                    onChange={(e) => updateReference(index, 'referenceTypeCd', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                  >
                    {REFERENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={ref.reference || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 text-slate-700 rounded-lg focus:outline-none cursor-not-allowed"
                    title="This field cannot be changed"
                  />
                </div>

                {/* Reference Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Reference Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={ref.referenceCode || ''}
                    onChange={(e) => updateReference(index, 'referenceCode', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={ref.referenceDescr || ''}
                    onChange={(e) => updateReference(index, 'referenceDescr', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeReference(index)}
                className="text-red-600 hover:text-red-700 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Reference Button */}
      <button
        type="button"
        onClick={addReference}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <Plus size={16} />
        Add Reference Number
      </button>
    </div>
  );
};

