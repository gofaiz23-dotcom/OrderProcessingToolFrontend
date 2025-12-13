'use client';

import { useState, useRef, useEffect } from 'react';
import { X, FileSpreadsheet, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, Package, TrendingUp, Activity, Calendar } from 'lucide-react';
import { uploadExcel, type UploadExcelResponse, getAllUploadStatus, type UploadStatusItem, startScrapBol, getAllScrapBolStatus, type ScrapBolStatusItem } from '@/app/api/3plGigaFedexApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

import type { Order } from '@/app/types/order';
import { generateExcelFromTemplate, downloadExcelFile, blobToFile } from '../utils/excelFileGenerator';

type ParcelModalProps = {
  isOpen: boolean;
  orders: Order[];
  onClose: () => void;
};

const CACHE_KEY = 'parcelModal_bolFormData';

export const ParcelModal = ({ isOpen, onClose, orders }: ParcelModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [handle, setHandle] = useState<boolean | null>(null); // null = default (true/headless), false = show browser
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<UploadExcelResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BOL Scraping Form Fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'both' | 'successfulBuyLabel' | 'creationDate'>('both');

  // Excel upload progress tracking
  const [excelUploadStatus, setExcelUploadStatus] = useState<UploadStatusItem | null>(null);
  const [excelUploadProgress, setExcelUploadProgress] = useState(0);
  const [excelUploadMessage, setExcelUploadMessage] = useState<string>('');

  // BOL scraping progress tracking
  const [bolScrapingStatus, setBolScrapingStatus] = useState<ScrapBolStatusItem | null>(null);
  const [bolScrapingProgress, setBolScrapingProgress] = useState(0);
  const [bolScrapingMessage, setBolScrapingMessage] = useState<string>('');
  const [scrapingStarted, setScrapingStarted] = useState(false);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached BOL form data on mount
  useEffect(() => {
    if (isOpen) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setStartDate(parsed.startDate || '');
          setEndDate(parsed.endDate || '');
          setDateFilterType(parsed.dateFilterType || 'both');
          setHandle(parsed.handle !== undefined ? parsed.handle : null);
        }
      } catch (err) {
        console.error('Error loading cached form data:', err);
      }
    }
  }, [isOpen]);

  // Save BOL form data to cache whenever it changes
  useEffect(() => {
    if (isOpen && (startDate || endDate)) {
      try {
        const formData = {
          startDate,
          endDate,
          dateFilterType,
          handle,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(formData));
      } catch (err) {
        console.error('Error saving form data to cache:', err);
      }
    }
  }, [isOpen, startDate, endDate, dateFilterType, handle]);

  // Clear cache after all operations succeed
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  };

  // Check if both forms are filled
  const isFormComplete = file !== null && startDate !== '' && endDate !== '';

  // Get today's date and max date (2 days from today)
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 2);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setResponse(null);
    }
  };

  // Poll for Excel upload status
  const pollExcelUploadStatus = async (uploadId: string) => {
    try {
      const statusResponse = await getAllUploadStatus();
      const uploadStatus = statusResponse.uploads.find(u => u.upload_id === uploadId);
      
      if (uploadStatus) {
        setExcelUploadStatus(uploadStatus);
        setExcelUploadProgress(uploadStatus.progress);
        setExcelUploadMessage(uploadStatus.message);

        // If Excel upload is complete, start BOL scraping
        if ((uploadStatus.status === 'success' || uploadStatus.status === 'completed') && !scrapingStarted && startDate && endDate) {
          setScrapingStarted(true);
          setExcelUploadMessage('Excel upload completed. Starting BOL scraping...');
          await startBolScraping();
        }

        // If still processing, continue polling
        if (uploadStatus.status === 'processing' || uploadStatus.status === 'uploading') {
          return true; // Continue polling
        }
      }
      return false; // Stop polling
    } catch (err) {
      console.error('Error polling Excel upload status:', err);
      return false;
    }
  };

  // Start BOL scraping automatically after Excel upload
  const startBolScraping = async () => {
    try {
      setBolScrapingMessage('Initializing BOL scraping...');
      
      // Use form data for BOL scraping
      const handleValue = handle === false ? false : undefined;
      
      const scrapResult = await startScrapBol(startDate, endDate, dateFilterType, handleValue);
      
      setBolScrapingMessage(`BOL scraping started. Scraping ID: ${scrapResult.scraping_id}`);
      
      // Start polling for BOL scraping status
      pollBolScrapingStatus(scrapResult.scraping_id);
    } catch (err) {
      console.error('Error starting BOL scraping:', err);
      setBolScrapingMessage('Failed to start BOL scraping');
      setError(err);
    }
  };

  // Poll for BOL scraping status
  const pollBolScrapingStatus = async (scrapingId: string) => {
    try {
      const statusResponse = await getAllScrapBolStatus();
      const scrapingStatus = statusResponse.scraping_operations.find(s => s.scraping_id === scrapingId);
      
      if (scrapingStatus) {
        setBolScrapingStatus(scrapingStatus);
        setBolScrapingProgress(scrapingStatus.progress);
        setBolScrapingMessage(scrapingStatus.message);
        setScrapedCount(scrapingStatus.scraped_count);
        setSavedCount(scrapingStatus.saved_count);

        // If BOL scraping is complete and Excel upload is also complete, clear cache
        if ((scrapingStatus.status === 'success' || scrapingStatus.status === 'error') && 
            excelUploadProgress === 100) {
          clearCache();
        }

        // If still processing, continue polling
        if (scrapingStatus.status === 'scraping' || scrapingStatus.status === 'processing') {
          return true; // Continue polling
        }
      }
      return false; // Stop polling
    } catch (err) {
      console.error('Error polling BOL scraping status:', err);
      return false;
    }
  };

  // Start polling when Excel upload completes
  useEffect(() => {
    if (response?.upload_id && !pollingIntervalRef.current) {
      // Poll every 2 seconds for Excel upload status
      pollingIntervalRef.current = setInterval(async () => {
        const shouldContinue = await pollExcelUploadStatus(response.upload_id);
        if (!shouldContinue && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [response?.upload_id]);

  // Start polling for BOL scraping when it starts
  useEffect(() => {
    if (scrapingStarted && bolScrapingStatus?.scraping_id) {
      const bolInterval = setInterval(async () => {
        const shouldContinue = await pollBolScrapingStatus(bolScrapingStatus.scraping_id);
        if (!shouldContinue) {
          clearInterval(bolInterval);
        }
      }, 2000);

      return () => {
        clearInterval(bolInterval);
      };
    }
  }, [scrapingStarted, bolScrapingStatus?.scraping_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please fill BOL scraping form (Start Date and End Date are required)');
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

    setUploading(true);
    setError(null);
    setResponse(null);
    setExcelUploadProgress(0);
    setExcelUploadMessage('Uploading Excel file...');
    setScrapingStarted(false);
    setBolScrapingProgress(0);
    setBolScrapingMessage('');
    setScrapedCount(0);
    setSavedCount(0);

    try {
      // Only pass handle if it's explicitly false (show browser), otherwise don't send (backend defaults to true)
      const handleValue = handle === false ? false : undefined;
      const result = await uploadExcel(file, handleValue);
      setResponse(result);
      setExcelUploadMessage('Excel file uploaded. Processing...');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err);
      setExcelUploadMessage('Excel upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResponse(null);
    setError(null);
    setExcelUploadStatus(null);
    setExcelUploadProgress(0);
    setExcelUploadMessage('');
    setBolScrapingStatus(null);
    setBolScrapingProgress(0);
    setBolScrapingMessage('');
    setScrapingStarted(false);
    setScrapedCount(0);
    setSavedCount(0);
    // Don't clear BOL form fields on reset - keep them cached
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateExcel = async () => {
    if (orders.length === 0) {
      setError('No orders selected to generate Excel file');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Generate Excel from template (template should be in public folder)
      const blob = await generateExcelFromTemplate('/3PL_EXCEL.xlsx', orders);
      
      // Create File object from blob
      const filename = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      const generatedFile = blobToFile(blob, filename);
      
      // Set the generated file in the input
      setFile(generatedFile);
      
      // Also set it in the file input element
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(generatedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
      
      // Download the file automatically
      downloadExcelFile(blob, filename);
      
      setError(null);
      setResponse(null); // Clear any previous response
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 left-56 sm:left-64 right-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up-and-scale m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Parcel Management - Import Excel
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Upload an Excel file to automatically import orders to Giga Fedex via browser automation.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Generate Excel Button */}
            <div>
              <button
                type="button"
                onClick={handleGenerateExcel}
                disabled={generating || orders.length === 0}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors mb-4
                  ${generating || orders.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }
                `}
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} />
                    <span>Generate Excel from {orders.length} Order{orders.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Excel File <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`
                    flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer
                    transition-colors
                    ${file
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <FileSpreadsheet
                    size={24}
                    className={file ? 'text-blue-600' : 'text-slate-400'}
                  />
                  <div className="text-center">
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-blue-700">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Click to select Excel file
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports .xlsx and .xls files
                        </p>
                      </div>
                    )}
                  </div>
                </label>
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
                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="browserMode"
                    checked={handle === null || handle === true}
                    onChange={() => setHandle(null)}
                    disabled={uploading}
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
                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="browserMode"
                    checked={handle === false}
                    onChange={() => setHandle(false)}
                    disabled={uploading}
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
                    Browser will open automatically when upload starts
                  </p>
                </div>
              )}
            </div>

            {/* BOL Scraping Form Fields */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">BOL Scraping Configuration</h3>
              
              {/* Date Filter Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Filter By Date Range <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    dateFilterType === 'both'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="dateFilterType"
                      value="both"
                      checked={dateFilterType === 'both'}
                      onChange={(e) => setDateFilterType(e.target.value as 'both')}
                      disabled={uploading}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Both Date Ranges</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Recommended</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Filter by both "Successful Buy Label Date" AND "Creation Date"
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    dateFilterType === 'successfulBuyLabel'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="dateFilterType"
                      value="successfulBuyLabel"
                      checked={dateFilterType === 'successfulBuyLabel'}
                      onChange={(e) => setDateFilterType(e.target.value as 'successfulBuyLabel')}
                      disabled={uploading}
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
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="dateFilterType"
                      value="creationDate"
                      checked={dateFilterType === 'creationDate'}
                      onChange={(e) => setDateFilterType(e.target.value as 'creationDate')}
                      disabled={uploading}
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
                    <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={maxDateString}
                      required
                      disabled={uploading}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white text-slate-900 font-medium"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">mm/dd/yyyy</p>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      max={maxDateString}
                      required
                      disabled={uploading || !startDate}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white text-slate-900 font-medium"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">mm/dd/yyyy</p>
                  {startDate && (
                    <p className="text-xs text-slate-500 mt-1">
                      Must be greater than or equal to start date
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error !== null && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ErrorDisplay error={error} />
              </div>
            )}

            {/* Excel Upload Progress */}
            {(uploading || excelUploadMessage || excelUploadProgress > 0) && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileSpreadsheet size={20} className="text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">Excel Upload Progress</p>
                    <p className="text-xs text-blue-600 mt-1">{excelUploadMessage || 'Uploading...'}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-700">{excelUploadProgress}%</span>
                </div>
                <div className="relative w-full bg-white/60 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      excelUploadProgress === 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-600 animate-pulse'
                    }`}
                    style={{ width: `${excelUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* BOL Scraping Progress */}
            {(scrapingStarted || bolScrapingMessage || bolScrapingProgress > 0) && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Package size={20} className="text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-800">BOL Scraping Progress</p>
                    <p className="text-xs text-purple-600 mt-1">{bolScrapingMessage || 'Initializing...'}</p>
                  </div>
                  <span className="text-lg font-bold text-purple-700">{bolScrapingProgress}%</span>
                </div>
                <div className="relative w-full bg-white/60 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bolScrapingProgress === 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-600 animate-pulse'
                    }`}
                    style={{ width: `${bolScrapingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Cards - Scraped and Saved */}
            {(scrapingStarted || scrapedCount > 0 || savedCount > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={20} className="text-green-600" />
                      <p className="text-sm font-semibold text-green-800">Scraped</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{scrapedCount}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-blue-600" />
                      <p className="text-sm font-semibold text-blue-800">Saved</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{savedCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Status Text */}
            {(excelUploadMessage || bolScrapingMessage) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-slate-600 animate-pulse" />
                  <p className="text-sm font-medium text-slate-700">
                    {bolScrapingMessage || excelUploadMessage || 'Idle'}
                  </p>
                </div>
              </div>
            )}

            {/* Response Display */}
            {response && !excelUploadMessage && (
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
                    {response.upload_id && (
                      <p className="text-xs text-slate-600 mt-1">
                        Upload ID: <span className="font-mono">{response.upload_id}</span>
                      </p>
                    )}
                    {response.imported_count !== undefined && (
                      <p className="text-sm text-slate-700 mt-2">
                        Imported: {response.imported_count} | Failed: {response.failed_count || 0}
                      </p>
                    )}
                    {response.processing_time && (
                      <p className="text-xs text-slate-500 mt-1">
                        Processing time: {response.processing_time.toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Note:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Files are processed in the background. Use the Status page to track progress.</li>
                    <li>Only .xlsx and .xls files are supported.</li>
                    <li>Maximum file size: 10MB</li>
                    <li>Credentials are loaded from the backend .env file.</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormComplete || uploading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
              ${!isFormComplete || uploading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload Excel & Start BOL Scraping</span>
              </>
            )}
          </button>
          {!isFormComplete && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              {!file && !startDate && !endDate && 'Please select Excel file and fill BOL scraping form'}
              {!file && (startDate || endDate) && 'Please select Excel file'}
              {file && (!startDate || !endDate) && 'Please fill BOL scraping form (Start Date and End Date)'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
