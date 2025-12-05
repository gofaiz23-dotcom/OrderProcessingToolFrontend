'use client';

import { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { XPO_BOL_COUNTRY_OPTIONS } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { US_STATES } from './constants';

type LocationData = {
  searchValue: string;
  company: string;
  careOf?: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  extension?: string;
  email?: string;
};

type LocationSectionProps = {
  title: string;
  data: LocationData;
  onDataChange: (data: LocationData) => void;
  onZipLookup?: (zipCode: string) => Promise<void>;
  loadingZip?: boolean;
  showEmail?: boolean;
  required?: boolean;
  addressBookOptions?: Array<{
    value: string;
    label: string;
    company?: string;
    streetAddress?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    extension?: string;
    contactName?: string;
  }>;
};

export const LocationSection = ({
  title,
  data,
  onDataChange,
  onZipLookup,
  loadingZip = false,
  showEmail = false,
  required = true,
  addressBookOptions,
}: LocationSectionProps) => {
  const [showDetails, setShowDetails] = useState(true);

  const handleFieldChange = (field: keyof LocationData, value: string) => {
    onDataChange({ ...data, [field]: value });
  };

  const handleZipChange = async (value: string) => {
    handleFieldChange('postalCode', value);
    if (onZipLookup && value.length >= 5) {
      await onZipLookup(value);
    }
  };

  const clearSearch = () => {
    handleFieldChange('searchValue', '');
  };

  const handleAddressBookSelect = (value: string) => {
    if (!addressBookOptions) return;
    
    const selected = addressBookOptions.find(opt => opt.value === value);
    if (selected) {
      onDataChange({
        ...data,
        searchValue: selected.label,
        company: selected.company || '',
        streetAddress: selected.streetAddress || '',
        addressLine2: selected.addressLine2 || '',
        city: selected.city || '',
        state: selected.state || '',
        postalCode: selected.zip || '',
        country: selected.country || 'US',
        phone: selected.phone || '',
        extension: selected.extension || '',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      
      {/* Location Search */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900">
          {title} {required && <span className="text-red-500">*</span>}
        </label>
        {addressBookOptions && addressBookOptions.length > 0 ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
            <select
              value={data.searchValue || ''}
              onChange={(e) => {
                handleAddressBookSelect(e.target.value);
              }}
              className={`w-full pl-10 pr-10 px-4 py-2 border bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 appearance-none ${
                required && !data.searchValue
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
              required={required}
            >
              <option value="">Select {title}</option>
              {addressBookOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            {data.searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={data.searchValue}
              onChange={(e) => handleFieldChange('searchValue', e.target.value)}
              placeholder={`Search ${title}`}
              className={`w-full pl-10 pr-10 px-4 py-2 border bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 ${
                required && !data.searchValue
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
              required={required}
            />
            {data.searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {required && !data.searchValue && (
          <div className="flex items-center gap-1 text-red-500 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>This field is required</span>
          </div>
        )}
      </div>

      {/* Show/Hide Details */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {showDetails && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Company {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={data.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={required}
              />
            </div>

            {/* Care of/Attention to */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Care of/Attention to (Optional)
              </label>
              <input
                type="text"
                value={data.careOf || ''}
                onChange={(e) => handleFieldChange('careOf', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Street Address */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-900">
                Street Address {required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data.streetAddress}
                  onChange={(e) => handleFieldChange('streetAddress', e.target.value)}
                  className="w-full pl-10 pr-10 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={required}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            {/* Address Line 2 */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-900">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={data.addressLine2 || ''}
                onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, unit, building, floor, P.O, etc."
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                City {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={data.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={required}
              />
            </div>

            {/* State/Province */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                State/Province {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={data.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                required={required}
              >
                <option value="">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Postal Code */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Postal Code {required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data.postalCode}
                  onChange={(e) => handleZipChange(e.target.value)}
                  maxLength={10}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required={required}
                />
                {loadingZip && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Country {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={data.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                required={required}
              >
                {XPO_BOL_COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Phone {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="tel"
                value={data.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 (123) 456-7890"
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={required}
              />
            </div>

            {/* Extension */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Extension (Optional)
              </label>
              <input
                type="text"
                value={data.extension || ''}
                onChange={(e) => handleFieldChange('extension', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email (if showEmail is true) */}
            {showEmail && (
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

