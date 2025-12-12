'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { ESTES_ACCOUNTS } from '@/Shared/constant';

type ESTESAccountInfoProps = {
  myAccount: string;
  role: string;
  onAccountChange: (account: string) => void;
  onRoleChange: (role: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESAccountInfo = ({
  myAccount,
  role,
  onAccountChange,
  onRoleChange,
  isExpanded,
  onToggle,
}: ESTESAccountInfoProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-visible">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={onToggle}
            className="text-left"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Account Information</h3>
          </button>
          <span
            className="text-blue-600 text-sm hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              // Handle help click
            }}
          >
            Need Help?
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center"
        >
          {isExpanded ? (
            <ChevronUp className="text-slate-600" size={20} />
          ) : (
            <ChevronDown className="text-slate-600" size={20} />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <SearchableDropdown
                options={ESTES_ACCOUNTS.map(account => ({
                  value: account.accountNumber,
                  label: `${account.accountNumber} - ${account.type} - ${account.companyName} - ${account.address}`,
                })) as SearchableDropdownOption[]}
                value={myAccount}
                onChange={onAccountChange}
                label="My Accounts"
                placeholder="Search or select account..."
                required
                filterKeys={['label', 'value']}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Your Role:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Shipper"
                    checked={role === 'Shipper'}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Shipper</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Consignee"
                    checked={role === 'Consignee'}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Consignee</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Third-Party"
                    checked={role === 'Third-Party'}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Third-Party</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

