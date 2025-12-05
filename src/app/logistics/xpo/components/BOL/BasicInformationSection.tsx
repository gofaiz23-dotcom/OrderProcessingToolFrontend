'use client';

import { FileText, X } from 'lucide-react';
import { XPO_BOL_REQUESTER_ROLE_OPTIONS, XPO_BOL_CHARGE_TO_OPTIONS } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';

type BasicInformationSectionProps = {
  requesterRole: string;
  onRequesterRoleChange: (value: string) => void;
  paymentTerms: string;
  onPaymentTermsChange: (value: string) => void;
  onUseBOLTemplate?: () => void;
  onClearForm?: () => void;
};

export const BasicInformationSection = ({
  requesterRole,
  onRequesterRoleChange,
  paymentTerms,
  onPaymentTermsChange,
  onUseBOLTemplate,
  onClearForm,
}: BasicInformationSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={requesterRole}
            onChange={(e) => onRequesterRoleChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
            required
          >
            {XPO_BOL_REQUESTER_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Payment Terms <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => onPaymentTermsChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
            required
          >
            {XPO_BOL_CHARGE_TO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {onUseBOLTemplate && (
          <button
            type="button"
            onClick={onUseBOLTemplate}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <FileText size={16} />
            Use BOL Template
          </button>
        )}
        {onClearForm && (
          <button
            type="button"
            onClick={onClearForm}
            className="text-slate-600 hover:text-slate-700 text-sm font-medium"
          >
            Clear Form
          </button>
        )}
      </div>
    </div>
  );
};

