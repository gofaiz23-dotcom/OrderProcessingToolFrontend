'use client';

import { ChevronDown, ChevronUp, Info, X } from 'lucide-react';

type ESTESAccessorialsProps = {
  selectedAccessorials: string[];
  appointmentRequest: boolean;
  liftGateService: boolean;
  residentialDelivery: boolean;
  specialHandlingRequests: string[];
  onAccessorialChange: (accessorial: string, checked: boolean) => void;
  onSpecialHandlingChange: (request: string, checked: boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESAccessorials = ({
  selectedAccessorials,
  appointmentRequest,
  liftGateService,
  residentialDelivery,
  specialHandlingRequests,
  onAccessorialChange,
  onSpecialHandlingChange,
  isExpanded,
  onToggle,
}: ESTESAccessorialsProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">Freight Accessorials</h3>
          <Info className="text-blue-500" size={20} />
        </div>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-4">
          {selectedAccessorials.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedAccessorials.map((acc) => (
                <span
                  key={acc}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {acc}
                  <button
                    type="button"
                    onClick={() => onAccessorialChange(acc, false)}
                    className="hover:text-blue-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900">Service Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appointmentRequest}
                  onChange={(e) => {
                    onAccessorialChange('Appointment Request', e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">Appointment Request</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={liftGateService}
                  onChange={(e) => {
                    onAccessorialChange('Lift-Gate Service (Delivery)', e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">Lift-Gate Service (Delivery)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={residentialDelivery}
                  onChange={(e) => {
                    onAccessorialChange('Residential Delivery', e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">Residential Delivery</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Special Handling Requests */}
      <div className="border-t border-slate-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Special Handling Requests</h3>
            <Info className="text-blue-500" size={20} />
          </div>
          <p className="text-sm text-slate-600">Special Instructions (Optional)</p>
          {specialHandlingRequests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {specialHandlingRequests.map((req) => (
                <span
                  key={req}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {req}
                  <button
                    type="button"
                    onClick={() => onSpecialHandlingChange(req, false)}
                    className="hover:text-blue-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={specialHandlingRequests.includes('Added Accessorials Require Pre Approval')}
                onChange={(e) => onSpecialHandlingChange('Added Accessorials Require Pre Approval', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Added Accessorials Require Pre Approval</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={specialHandlingRequests.includes('Do Not Break Down the Pallet')}
                onChange={(e) => onSpecialHandlingChange('Do Not Break Down the Pallet', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Do Not Break Down the Pallet</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={specialHandlingRequests.includes('Do Not Remove Shrink Wrap from Skid')}
                onChange={(e) => onSpecialHandlingChange('Do Not Remove Shrink Wrap from Skid', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Do Not Remove Shrink Wrap from Skid</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={specialHandlingRequests.includes('Fragile-Handle with Care')}
                onChange={(e) => onSpecialHandlingChange('Fragile-Handle with Care', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Fragile-Handle with Care</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

