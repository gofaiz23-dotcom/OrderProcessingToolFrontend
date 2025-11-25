'use client';

import { memo } from 'react';

const LIMIT_OPTIONS = [10, 20, 50, 100];

type SentFiltersProps = {
  search: string;
  limit: number;
  from: string;
  to: string;
  startDate: string;
  endDate: string;
  attachmentsOnly: boolean;
  onSearchChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAttachmentsOnlyToggle: (checked: boolean) => void;
  onApply: () => void;
  onRefresh: () => void;
};

export const SentFilters = memo(
  ({
    search,
    limit,
    from,
    to,
    startDate,
    endDate,
    attachmentsOnly,
    onSearchChange,
    onLimitChange,
    onFromChange,
    onToChange,
    onStartDateChange,
    onEndDateChange,
    onAttachmentsOnlyToggle,
    onApply,
    onRefresh,
  }: SentFiltersProps) => {
    return (
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>Search</span>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search emails..."
              className="w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>Limit</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {LIMIT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>From</span>
            <input
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              placeholder="sender"
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>To</span>
            <input
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="recipient"
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <span>End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={attachmentsOnly}
              onChange={(e) => onAttachmentsOnlyToggle(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="whitespace-nowrap">Attachments</span>
          </label>

          <button
            onClick={onApply}
            className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Apply
          </button>

          <button
            onClick={onRefresh}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  },
);

SentFilters.displayName = 'SentFilters';

