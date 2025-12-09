'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

export type SearchableDropdownOption = {
  value: string;
  label: string;
  [key: string]: any; // Allow additional properties
};

type SearchableDropdownProps = {
  options: SearchableDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  filterKeys?: string[]; // Keys to search in (default: ['label'])
  dataTestId?: string; // For testing
  onSelect?: (option: SearchableDropdownOption) => void; // Callback when option is selected
};

export const SearchableDropdown = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Search or select...',
  searchPlaceholder,
  className = '',
  disabled = false,
  required = false,
  filterKeys = ['label'],
  dataTestId,
  onSelect,
}: SearchableDropdownProps) => {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected option to display its label
  const selectedOption = options.find(opt => opt.value === value);

  // Initialize search with selected option label (only when value changes, not when search changes)
  useEffect(() => {
    if (selectedOption && !search) {
      setSearch(selectedOption.label);
    } else if (!value && !showDropdown) {
      setSearch('');
    }
  }, [value, selectedOption]);

  // Filter options based on search
  const filteredOptions = options.filter((option) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return filterKeys.some(key => {
      const fieldValue = option[key];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchLower);
      }
      // Handle numeric values (like IDs) - convert to string for searching
      if (typeof fieldValue === 'number') {
        return fieldValue.toString().includes(search);
      }
      return false;
    });
  });

  // Handle option selection
  const handleSelect = (option: SearchableDropdownOption) => {
    onChange(option.value);
    setSearch(option.label);
    setShowDropdown(false);
    if (onSelect) {
      onSelect(option);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    setShowDropdown(true);
    
    // Clear selection if search is cleared or doesn't match selected option
    if (!newSearch) {
      onChange('');
    } else if (selectedOption && newSearch !== selectedOption.label) {
      // If user is typing something different, clear the selection
      onChange('');
    }
  };

  // Handle clear button
  const handleClear = () => {
    setSearch('');
    onChange('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Restore search to selected option label if dropdown closes without selection
        if (selectedOption && search !== selectedOption.label) {
          setSearch(selectedOption.label);
        } else if (!selectedOption && search) {
          // If no selection and search exists, keep it (user might be typing)
          // Only clear if they click outside without making a selection
        }
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, selectedOption, search]);

  return (
    <div className={`space-y-1 ${className}`} ref={dropdownRef} data-testid={dataTestId}>
      {label && (
        <label className="block text-sm font-semibold text-slate-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={(e) => {
            setShowDropdown(true);
            // Allow user to select all text when focusing (better UX for typing)
            e.target.select();
          }}
          onKeyDown={(e) => {
            // Allow typing freely - don't prevent default unless handling specific keys
            if (e.key === 'Escape') {
              setShowDropdown(false);
              if (selectedOption) {
                setSearch(selectedOption.label);
              }
            }
          }}
          placeholder={searchPlaceholder || placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" 
          size={18} 
        />
        {search && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-20 transition-colors"
            aria-label="Clear selection"
          >
            <X size={18} />
          </button>
        )}
        
        {/* Dropdown List */}
        {showDropdown && !disabled && (
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                // Custom rendering for AMMANA locations with deliveryType
                const hasDeliveryType = option.deliveryType !== undefined;
                
                // Use simplified format (name + address) if available, otherwise use legacy format
                const company = option.name || option.company || '';
                let fullAddress = '';
                
                if (option.address) {
                  // Use the simplified address string directly
                  fullAddress = option.address;
                } else {
                  // Build address from legacy format
                  const streetAddress = option.streetAddress || '';
                  const addressLine2 = option.addressLine2 || '';
                  const city = option.city || '';
                  const state = option.state || '';
                  const zip = option.zip || '';
                  
                  const addressParts = [
                    streetAddress,
                    addressLine2,
                    city,
                    state,
                    zip
                  ].filter(Boolean);
                  fullAddress = addressParts.join(', ');
                }
                
                // Use id as key if value is not available
                const optionKey = option.value || `option-${option.id || Math.random()}`;
                
                return (
                  <button
                    key={optionKey}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                      value === option.value ? 'bg-blue-100' : ''
                    }`}
                  >
                    {hasDeliveryType && company ? (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 mb-1">{company}</div>
                          <div className="text-sm text-slate-700">{fullAddress}</div>
                        </div>
                        <div className="text-sm text-slate-600 whitespace-nowrap flex-shrink-0">
                          {option.deliveryType}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-slate-900">{option.label || `${company} - ${fullAddress}`}</div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-2 text-sm text-slate-500">No options found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

