'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const LIMIT_OPTIONS = [20, 50, 100];

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

type EmailFiltersProps = {
  search: string;
  limit: number;
  attachmentsOnly: boolean;
  dateFilter: DateFilterOption;
  startDate: string;
  endDate: string;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onAttachmentsOnlyToggle: (checked: boolean) => void;
  onDateFilterChange: (option: DateFilterOption) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
};

export const EmailFilters = memo(
  ({
    search,
    limit,
    attachmentsOnly,
    dateFilter,
    startDate,
    endDate,
    loading = false,
    onSearchChange,
    onLimitChange,
    onAttachmentsOnlyToggle,
    onDateFilterChange,
    onStartDateChange,
    onEndDateChange,
    onClear,
  }: EmailFiltersProps) => {
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
    const [limitInput, setLimitInput] = useState<string>(limit.toString());
    const dateDropdownRef = useRef<HTMLDivElement>(null);
    const limitDropdownRef = useRef<HTMLDivElement>(null);
    const limitInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
          setIsDateDropdownOpen(false);
        }
        if (limitDropdownRef.current && !limitDropdownRef.current.contains(event.target as Node)) {
          setIsLimitDropdownOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const getDateFilterLabel = () => {
      switch (dateFilter) {
        case 'today':
          return 'Today';
        case 'thisWeek':
          return 'This Week';
        case 'specificDate':
          return 'Specific Date';
        case 'custom':
          return 'Custom Range';
        default:
          return 'Date Filter';
      }
    };

    const handleDateOptionSelect = (option: DateFilterOption) => {
      onDateFilterChange(option);
      setIsDateDropdownOpen(false);
    };

    const handleLimitSelect = (value: number) => {
      onLimitChange(value);
      setLimitInput(value.toString());
      setIsLimitDropdownOpen(false);
      limitInputRef.current?.blur();
    };

    const handleLimitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLimitInput(value);
      
      // Only update if it's a valid number
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0 && numValue <= 1000) {
        onLimitChange(numValue);
      }
    };

    const handleLimitInputBlur = () => {
      // Validate and fix the input on blur
      const numValue = parseInt(limitInput, 10);
      if (isNaN(numValue) || numValue <= 0) {
        setLimitInput(limit.toString());
      } else if (numValue > 1000) {
        setLimitInput('1000');
        onLimitChange(1000);
      } else {
        setLimitInput(numValue.toString());
        onLimitChange(numValue);
      }
      setIsLimitDropdownOpen(false);
    };

    const handleLimitInputFocus = () => {
      setIsLimitDropdownOpen(true);
    };

    const handleLimitInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        limitInputRef.current?.blur();
        setIsLimitDropdownOpen(false);
      }
    };

    // Sync limitInput when limit prop changes externally
    useEffect(() => {
      setLimitInput(limit.toString());
    }, [limit]);

    return (
      <div className="border-b border-slate-200 bg-white px-3 sm:px-4 py-3">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <label className="flex flex-col gap-1 flex-1 sm:flex-initial min-w-[200px] sm:min-w-0">
            <span className="text-xs font-medium text-slate-900">Search</span>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search emails..."
                className="w-full sm:w-48 rounded-md border border-slate-300 px-2 py-1.5 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {loading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </label>

          <div className="flex flex-col gap-1 relative" ref={limitDropdownRef}>
            <span className="text-xs font-medium text-slate-900">Limit</span>
            <div className="relative">
              <input
                ref={limitInputRef}
                type="text"
                inputMode="numeric"
                value={limitInput}
                onChange={handleLimitInputChange}
                onFocus={handleLimitInputFocus}
                onBlur={handleLimitInputBlur}
                onKeyDown={handleLimitInputKeyDown}
                placeholder="Enter limit"
                className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {isLimitDropdownOpen && (
                <div className="absolute top-full z-10 mt-1 w-20 rounded-md border border-slate-200 bg-white shadow-lg">
                  {LIMIT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleLimitSelect(option)}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                        limit === option ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 relative" ref={dateDropdownRef}>
            <span className="text-xs font-medium text-slate-900">Date</span>
            {dateFilter === 'custom' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex flex-col gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="w-full sm:w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Start Date"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="w-full sm:w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="End Date"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="h-[34px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  ▼
                </button>
              </div>
            ) : dateFilter === 'specificDate' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full sm:w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="h-[34px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  ▼
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="w-full sm:w-36 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {getDateFilterLabel()}
                <span className="float-right mt-0.5">▼</span>
              </button>
            )}

            {isDateDropdownOpen && (
              <div className="absolute top-full z-10 mt-1 w-36 rounded-md border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => handleDateOptionSelect('all')}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    dateFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => handleDateOptionSelect('today')}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    dateFilter === 'today' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleDateOptionSelect('thisWeek')}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    dateFilter === 'thisWeek' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => handleDateOptionSelect('specificDate')}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    dateFilter === 'specificDate' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Specific Date
                </button>
                <button
                  type="button"
                  onClick={() => handleDateOptionSelect('custom')}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    dateFilter === 'custom' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-900">Attachments</span>
            <div className="flex h-[34px] items-center">
              <input
                type="checkbox"
                checked={attachmentsOnly}
                onChange={(e) => onAttachmentsOnlyToggle(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
            </div>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-900 opacity-0">Actions</span>
            <button
              onClick={onClear}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  },
);

EmailFilters.displayName = 'EmailFilters';

