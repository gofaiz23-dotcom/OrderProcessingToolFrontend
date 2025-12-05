'use client';

import { X, Trash2, Calculator } from 'lucide-react';
import type { XPOBillOfLadingCommodity } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { XPO_BOL_PACKAGE_CODE_OPTIONS } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';

type CommodityDetailsSectionProps = {
  commodity: XPOBillOfLadingCommodity;
  index: number;
  onUpdate: (index: number, field: keyof XPOBillOfLadingCommodity, value: any) => void;
  onUpdateNested: (index: number, path: string[], value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  onClassCalculator?: () => void;
};

export const CommodityDetailsSection = ({
  commodity,
  index,
  onUpdate,
  onUpdateNested,
  onRemove,
  canRemove,
  onClassCalculator,
}: CommodityDetailsSectionProps) => {
  return (
    <div className="p-4 border border-slate-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Commodity {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            <Trash2 size={16} />
            Remove From Shipment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Commodity Description */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-semibold text-slate-900">
            Commodity Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={commodity.desc || ''}
            onChange={(e) => onUpdate(index, 'desc', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Total Weight */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Total Weight <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={commodity.grossWeight?.weight || 0}
            onChange={(e) => onUpdateNested(index, ['grossWeight', 'weight'], parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="0"
            step="0.01"
          />
        </div>

        {/* Freight Class */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Freight Class <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commodity.nmfcClass || ''}
              onChange={(e) => onUpdate(index, 'nmfcClass', e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {onClassCalculator && (
              <button
                type="button"
                onClick={onClassCalculator}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Calculator size={16} />
                Class Calculator
              </button>
            )}
          </div>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Length (Inches) (Optional)
          </label>
          <input
            type="number"
            value={commodity.length || ''}
            onChange={(e) => onUpdate(index, 'length', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        {/* Width */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Width (Inches) (Optional)
          </label>
          <input
            type="number"
            value={commodity.width || ''}
            onChange={(e) => onUpdate(index, 'width', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        {/* Height */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Height (Inches) (Optional)
          </label>
          <input
            type="number"
            value={commodity.height || ''}
            onChange={(e) => onUpdate(index, 'height', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        {/* Pieces/Quantity */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Pieces/Quantity (Optional)
          </label>
          <input
            type="number"
            value={commodity.pieceCnt || 1}
            onChange={(e) => onUpdate(index, 'pieceCnt', parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
          />
        </div>

        {/* Packaging */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Packaging
          </label>
          <select
            value={commodity.packaging?.packageCd || 'PLT'}
            onChange={(e) => onUpdateNested(index, ['packaging', 'packageCd'], e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
          >
            {XPO_BOL_PACKAGE_CODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* NMFC Code */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            NMFC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={commodity.nmfcItemCd || ''}
            onChange={(e) => onUpdate(index, 'nmfcItemCd', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Sub */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Sub (Optional)
          </label>
          <input
            type="text"
            value={commodity.sub || ''}
            onChange={(e) => onUpdate(index, 'sub', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={commodity.freezableProtection || false}
            onChange={(e) => onUpdate(index, 'freezableProtection', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Freezable Protection</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={commodity.hazmatInd || false}
            onChange={(e) => onUpdate(index, 'hazmatInd', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Hazmat Item</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Save As New
        </button>
        <button
          type="button"
          className="text-slate-600 hover:text-slate-700 text-sm font-medium"
        >
          Update Commodity
        </button>
      </div>
    </div>
  );
};

