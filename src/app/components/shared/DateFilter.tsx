'use client';

import { memo, useState, useRef, useEffect } from 'react';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

type DateFilterProps = {
  dateFilter: DateFilterOption;
  startDate: string;
  endDate: string;
  onDateFilterChange: (option: DateFilterOption) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export const DateFilter = memo(
  ({
    dateFilter,
    startDate,
    endDate,
    onDateFilterChange,
    onStartDateChange,
    onEndDateChange,
  }: DateFilterProps) => {
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const dateDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
          setIsDateDropdownOpen(false);
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

    return (
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
          <div className="absolute top-full z-50 mt-1 w-36 rounded-md border border-slate-200 bg-white shadow-lg">
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
    );
  },
);

DateFilter.displayName = 'DateFilter';

