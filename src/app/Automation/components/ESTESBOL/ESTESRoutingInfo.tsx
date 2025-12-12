'use client';

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { ESTES_SHIPPER_ADDRESSES, ESTES_ADDRESS_BOOK } from '@/Shared/constant';

type ESTESRoutingInfoProps = {
  // Origin (Shipper)
  originAddressBook: string;
  originAccount: string;
  originName: string;
  originAddress1: string;
  originAddress2: string;
  originCity: string;
  originState: string;
  originZipCode: string;
  originCountry: string;
  originContactName: string;
  originPhone: string;
  originEmail: string;
  originLoadingZip: boolean;
  onOriginChange: (field: string, value: string) => void;
  onOriginAddressBookChange: (value: string) => void;
  
  // Destination (Consignee)
  destinationAddressBook: string;
  destinationName: string;
  destinationAddress1: string;
  destinationAddress2: string;
  destinationCity: string;
  destinationState: string;
  destinationZipCode: string;
  destinationCountry: string;
  destinationContactName: string;
  destinationPhone: string;
  destinationEmail: string;
  destinationLoadingZip: boolean;
  onDestinationChange: (field: string, value: string) => void;
  onDestinationAddressBookChange: (value: string) => void;
  
  // Bill To
  billToAddressBook: string;
  billToAccount: string;
  billToName: string;
  billToAddress1: string;
  billToAddress2: string;
  billToCity: string;
  billToState: string;
  billToZipCode: string;
  billToCountry: string;
  billToContactName: string;
  billToPhone: string;
  billToEmail: string;
  billToLoadingZip: boolean;
  onBillToChange: (field: string, value: string) => void;
  onBillToAddressBookChange: (value: string) => void;
  
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESRoutingInfo = ({
  originAddressBook,
  originAccount,
  originName,
  originAddress1,
  originAddress2,
  originCity,
  originState,
  originZipCode,
  originCountry,
  originContactName,
  originPhone,
  originEmail,
  originLoadingZip,
  onOriginChange,
  onOriginAddressBookChange,
  destinationAddressBook,
  destinationName,
  destinationAddress1,
  destinationAddress2,
  destinationCity,
  destinationState,
  destinationZipCode,
  destinationCountry,
  destinationContactName,
  destinationPhone,
  destinationEmail,
  destinationLoadingZip,
  onDestinationChange,
  onDestinationAddressBookChange,
  billToAddressBook,
  billToAccount,
  billToName,
  billToAddress1,
  billToAddress2,
  billToCity,
  billToState,
  billToZipCode,
  billToCountry,
  billToContactName,
  billToPhone,
  billToEmail,
  billToLoadingZip,
  onBillToChange,
  onBillToAddressBookChange,
  isExpanded,
  onToggle,
}: ESTESRoutingInfoProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Routing Information</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Shipper Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-slate-900">Shipper Information</h4>
              <SearchableDropdown
                options={ESTES_SHIPPER_ADDRESSES.map(addr => ({
                  value: addr.value,
                  label: addr.label,
                  name: addr.name,
                  city: addr.city,
                  state: addr.state,
                  zip: addr.zip,
                })) as SearchableDropdownOption[]}
                value={originAddressBook}
                onChange={onOriginAddressBookChange}
                label="Address Book (Optional)"
                placeholder="Search or select address..."
                filterKeys={['label', 'name', 'city', 'state', 'zip']}
                onSelect={(option) => {
                  const address = ESTES_SHIPPER_ADDRESSES.find(opt => opt.value === option.value);
                  if (address) {
                    onOriginChange('name', address.name);
                    onOriginChange('address1', address.address1);
                    onOriginChange('address2', address.address2 || '');
                    onOriginChange('city', address.city);
                    onOriginChange('state', address.state);
                    onOriginChange('zipCode', address.zip);
                    onOriginChange('country', address.country);
                    if (address.contactName) onOriginChange('contactName', address.contactName);
                    if (address.phone) onOriginChange('phone', address.phone);
                    if (address.email) onOriginChange('email', address.email);
                    if (address.account) onOriginChange('account', address.account);
                  }
                }}
              />
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => onOriginChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                <input
                  type="email"
                  value={originEmail}
                  onChange={(e) => onOriginChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={originContactName}
                  onChange={(e) => onOriginChange('contactName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={originAddress1}
                  onChange={(e) => onOriginChange('address1', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={originAddress2}
                  onChange={(e) => onOriginChange('address2', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={originZipCode}
                      onChange={(e) => onOriginChange('zipCode', e.target.value)}
                      placeholder="Enter ZIP code"
                      maxLength={10}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    {originLoadingZip && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  {(originCity || originState) && (
                    <p className="text-sm text-slate-600 mt-1">
                      Auto-filled: {originCity}{originState ? `, ${originState}` : ''}{originCountry ? `, ${originCountry}` : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                  <select
                    value={originCountry}
                    onChange={(e) => onOriginChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="Mexico">Mexico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={originCity}
                    onChange={(e) => onOriginChange('city', e.target.value)}
                    placeholder="Enter city name"
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={originState}
                    onChange={(e) => onOriginChange('state', e.target.value.toUpperCase())}
                    placeholder="Enter state code (e.g., CA, NY, TX)"
                    maxLength={2}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={originPhone}
                  onChange={(e) => onOriginChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Consignee Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-slate-900">Consignee Information</h4>
              <SearchableDropdown
                options={ESTES_ADDRESS_BOOK as SearchableDropdownOption[]}
                value={destinationAddressBook || ''}
                onChange={onDestinationAddressBookChange}
                label="Address Book (Optional)"
                placeholder="Search or select address..."
                filterKeys={['label', 'city', 'state', 'zip']}
              />
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={destinationName}
                  onChange={(e) => onDestinationChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                <input
                  type="email"
                  value={destinationEmail}
                  onChange={(e) => onDestinationChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={destinationContactName}
                  onChange={(e) => onDestinationChange('contactName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={destinationAddress1}
                  onChange={(e) => onDestinationChange('address1', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={destinationAddress2}
                  onChange={(e) => onDestinationChange('address2', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={destinationZipCode}
                      onChange={(e) => onDestinationChange('zipCode', e.target.value)}
                      placeholder="Enter ZIP code"
                      maxLength={10}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    {destinationLoadingZip && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  {(destinationCity || destinationState) && (
                    <p className="text-sm text-slate-600 mt-1">
                      Auto-filled: {destinationCity}{destinationState ? `, ${destinationState}` : ''}{destinationCountry ? `, ${destinationCountry}` : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                  <select
                    value={destinationCountry}
                    onChange={(e) => onDestinationChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="Mexico">Mexico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={(e) => onDestinationChange('city', e.target.value)}
                    placeholder="Enter city name"
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-900">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={destinationState}
                    onChange={(e) => onDestinationChange('state', e.target.value.toUpperCase())}
                    placeholder="Enter state code (e.g., CA, NY, TX)"
                    maxLength={2}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={destinationPhone}
                  onChange={(e) => onDestinationChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Bill To Information */}
          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-md font-semibold text-slate-900 mb-4">Bill To Information</h4>
            <SearchableDropdown
              options={ESTES_ADDRESS_BOOK as SearchableDropdownOption[]}
              value={billToAddressBook || ''}
              onChange={onBillToAddressBookChange}
              label="Address Book (Optional)"
              placeholder="Search or select address..."
              filterKeys={['label', 'city', 'state', 'zip']}
              className="mb-4"
            />
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 border-t border-slate-300"></div>
              <span className="text-sm text-slate-600">or</span>
              <div className="flex-1 border-t border-slate-300"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={billToName}
                  onChange={(e) => onBillToChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                <input
                  type="email"
                  value={billToEmail}
                  onChange={(e) => onBillToChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={billToContactName}
                  onChange={(e) => onBillToChange('contactName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={billToAddress1}
                  onChange={(e) => onBillToChange('address1', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={billToAddress2}
                  onChange={(e) => onBillToChange('address2', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-900">
                  ZIP/Postal Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={billToZipCode}
                    onChange={(e) => onBillToChange('zipCode', e.target.value)}
                    placeholder="Enter ZIP or postal code"
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  {billToLoadingZip && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
                  )}
                </div>
                {(billToCity || billToState) && (
                  <p className="text-sm text-slate-600 mt-1">
                    Auto-filled: {billToCity}{billToState ? `, ${billToState}` : ''}{billToCountry ? `, ${billToCountry}` : ''}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-900">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={billToCity}
                  onChange={(e) => onBillToChange('city', e.target.value)}
                  placeholder="Enter city name"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-900">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={billToState}
                  onChange={(e) => onBillToChange('state', e.target.value.toUpperCase())}
                  placeholder="Enter state code (e.g., CA, NY, TX)"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                <select
                  value={billToCountry}
                  onChange={(e) => onBillToChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                  <option value="Mexico">Mexico</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={billToPhone}
                  onChange={(e) => onBillToChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold text-sm"
              >
                SAVE TO ADDRESS BOOK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

