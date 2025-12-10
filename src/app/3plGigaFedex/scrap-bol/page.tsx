'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Play, Loader2, CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { startScrapBol, type ScrapBolResponse } from '@/app/api/3plGigaFedexApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

export default function ScrapBolPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'both' | 'successfulBuyLabel' | 'creationDate'>('both');
  const [handle, setHandle] = useState<boolean | null>(null); // null = default (true/headless), false = show browser
  const [scraping, setScraping] = useState(false);
  const [response, setResponse] = useState<ScrapBolResponse | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    if (!endDate) {
      setError('Please select an end date');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be greater than or equal to start date');
      return;
    }

    // Check if dates are more than 2 days in the future
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const maxAllowedDate = new Date(todayDate);
    maxAllowedDate.setDate(maxAllowedDate.getDate() + 2);
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (startDateObj > maxAllowedDate) {
      setError('Start date cannot be more than 2 days in the future');
      return;
    }
    
    if (endDateObj > maxAllowedDate) {
      setError('End date cannot be more than 2 days in the future');
      return;
    }

    setScraping(true);
    setError(null);
    setResponse(null);

    try {
      // Only pass handle if it's explicitly false (show browser), otherwise don't send (backend defaults to true)
      const handleValue = handle === false ? false : undefined;
      const result = await startScrapBol(startDate, endDate, dateFilterType, handleValue);
      setResponse(result);
      
      // Navigate to status page after successful start
      setTimeout(() => {
        router.push('/3plGigaFedex/status');
      }, 1500); // Small delay to show success message
    } catch (err) {
      // Better error handling - show more details
      console.error('Scraping error:', err);
      
      // If it's a network error or fetch error, provide more helpful message
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(new Error('Failed to connect to Python backend. Please ensure the backend server is running on http://localhost:8000'));
      } else if (err instanceof Error) {
        setError(err);
      } else {
        // For unknown errors, wrap in Error with more context
        setError(new Error(`An unexpected error occurred: ${String(err)}`));
      }
    } finally {
      setScraping(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setDateFilterType('both');
    setResponse(null);
    setError(null);
    setHandle(null);
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get max date (2 days from today) in YYYY-MM-DD format
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 2);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Scrap-Bol (Parcel Management)</h1>
            <p className="text-slate-600">
              Scrape parcel management data from Giga Fedex by date range. Data will be saved to Node.js backend.
            </p>
          </div>

          {/* Scraping Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Range */}
              <div className="space-y-4">
                {/* Date Filter Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Filter By Date Range <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dateFilterType === 'both'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${scraping ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input
                        type="radio"
                        name="dateFilterType"
                        value="both"
                        checked={dateFilterType === 'both'}
                        onChange={(e) => setDateFilterType(e.target.value as 'both')}
                        disabled={scraping}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">Both Date Ranges</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Recommended</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Filter by both "Successful Buy Label Date" AND "Creation Date" (shows records matching either date range)
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dateFilterType === 'successfulBuyLabel'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${scraping ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input
                        type="radio"
                        name="dateFilterType"
                        value="successfulBuyLabel"
                        checked={dateFilterType === 'successfulBuyLabel'}
                        onChange={(e) => setDateFilterType(e.target.value as 'successfulBuyLabel')}
                        disabled={scraping}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-700">Successful Buy Label Date Only</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Filter only by when the label was successfully bought
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dateFilterType === 'creationDate'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${scraping ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input
                        type="radio"
                        name="dateFilterType"
                        value="creationDate"
                        checked={dateFilterType === 'creationDate'}
                        onChange={(e) => setDateFilterType(e.target.value as 'creationDate')}
                        disabled={scraping}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-700">Creation Date Only</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Filter only by when the order was created
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={maxDateString}
                        required
                        disabled={scraping}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || undefined}
                        max={maxDateString}
                        required
                        disabled={scraping || !startDate}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    {startDate && (
                      <p className="text-xs text-slate-500 mt-1">
                        Must be greater than or equal to start date
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Browser Mode Radio Buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Browser Mode
                </label>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    handle === null || handle === true
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${scraping ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="browserMode"
                      checked={handle === null || handle === true}
                      onChange={() => setHandle(null)}
                      disabled={scraping}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Background (Headless)</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Default</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Browser automation runs in the background without showing a window
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    handle === false
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${scraping ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="browserMode"
                      checked={handle === false}
                      onChange={() => setHandle(false)}
                      disabled={scraping}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Show Browser</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Browser window will be visible during automation
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Show message when browser mode is selected */}
                {handle === false && (
                  <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Browser will open automatically when scraping starts
                    </p>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error !== null && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ErrorDisplay error={error} />
                </div>
              )}

              {/* Response Display */}
              {response && (
                <div className={`
                  border rounded-lg p-4
                  ${response.status === 'success' || response.status === 'processing'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                  }
                `}>
                  <div className="flex items-start gap-3">
                    {response.status === 'success' || response.status === 'processing' ? (
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        response.status === 'success' || response.status === 'processing'
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}>
                        {response.message}
                      </p>
                      {response.scraping_id && (
                        <p className="text-xs text-slate-600 mt-1">
                          Scraping ID: <span className="font-mono">{response.scraping_id}</span>
                        </p>
                      )}
                      <p className="text-sm text-slate-700 mt-2">
                        Date Range: {response.start_date} to {response.end_date}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!startDate || !endDate || scraping}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                    ${!startDate || !endDate || scraping
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {scraping ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Starting Scraping...</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      <span>Start Scraping</span>
                    </>
                  )}
                </button>
                {(startDate || response) && !scraping && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Scraping runs in the background. Use the Status page to track progress.</li>
                  <li>All table rows will be scraped.</li>
                  <li>Data is saved temporarily, then batch-saved to Node.js backend after scraping completes.</li>
                  <li>Credentials are loaded from the backend .env file.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
