'use client';

import { Info } from 'lucide-react';

type ProNumberOption = 'none' | 'auto' | 'preassigned';

type XPOProNumberSectionProps = {
  proNumberOption: ProNumberOption;
  onProNumberOptionChange: (value: ProNumberOption) => void;
  preAssignedProNumber?: string;
  onPreAssignedProNumberChange?: (value: string) => void;
};

export const XPOProNumberSection = ({
  proNumberOption,
  onProNumberOptionChange,
  preAssignedProNumber = '',
  onPreAssignedProNumberChange,
}: XPOProNumberSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">XPO Pro Number</h2>
      
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="proNumber"
            checked={proNumberOption === 'none'}
            onChange={() => onProNumberOptionChange('none')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-1"
          />
          <div className="flex-1">
            <span className="text-sm text-slate-700 block">
              Do not auto-assign a PRO Number
            </span>
            <p className="text-xs text-slate-500 mt-1">
              The Driver Sales Representative will provide you with one
            </p>
          </div>
        </label>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="proNumber"
            checked={proNumberOption === 'auto'}
            onChange={() => onProNumberOptionChange('auto')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">
                Auto-assign PRO Number
              </span>
              <Info className="text-blue-500" size={16} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select this option if we should auto-assign a PRO Number for you
            </p>
          </div>
        </label>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="proNumber"
            checked={proNumberOption === 'preassigned'}
            onChange={() => onProNumberOptionChange('preassigned')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-1"
          />
          <div className="flex-1">
            <span className="text-sm text-slate-700 block">
              Pre-assigned PRO Number
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Enter a PRO Number that XPO has pre-assigned to you
            </p>
            {proNumberOption === 'preassigned' && onPreAssignedProNumberChange && (
              <input
                type="text"
                value={preAssignedProNumber}
                onChange={(e) => onPreAssignedProNumberChange(e.target.value)}
                placeholder="Enter PRO Number"
                className="w-full mt-2 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </label>
      </div>
    </div>
  );
};

