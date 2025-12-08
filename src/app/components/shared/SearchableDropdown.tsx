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

  // Initialize search with selected option label
  useEffect(() => {
    if (selectedOption && !search) {
      setSearch(selectedOption.label);
    } else if (!value && search) {
      setSearch('');
    }
  }, [value, selectedOption, search]);

  // Filter options based on search
  const filteredOptions = options.filter((option) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return filterKeys.some(key => {
      const fieldValue = option[key];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchLower);
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
    
    // Clear selection if search is cleared
    if (!newSearch) {
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
          onFocus={() => setShowDropdown(true)}
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
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                    value === option.value ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">{option.label}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-slate-500">No options found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

