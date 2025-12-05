'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Upload, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { uploadExcel, type UploadExcelResponse } from '@/app/api/3plGigaFedexApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

export default function ImportExcelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [handle, setHandle] = useState<boolean | null>(null); // null = default (true/headless), false = show browser
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<UploadExcelResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setResponse(null);

    try {
      // Only pass handle if it's explicitly false (show browser), otherwise don't send (backend defaults to true)
      const handleValue = handle === false ? false : undefined;
      const result = await uploadExcel(file, handleValue);
      setResponse(result);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Navigate to status page first, then after completion navigate to scrap-bol
      setTimeout(() => {
        router.push('/3plGigaFedex/status');
      }, 1500); // Small delay to show success message
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResponse(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Import Excel to Giga Fedex</h1>
            <p className="text-slate-600">
              Upload an Excel file to automatically import orders to Giga Fedex via browser automation.
            </p>
          </div>

          {/* Upload Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Error Display */}
              {error && (
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                    ${!file || uploading
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
                      <span>Upload Excel</span>
                    </>
                  )}
                </button>
                {(file || response) && !uploading && (
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
                  <li>Files are processed in the background. Use the Status page to track progress.</li>
                  <li>Only .xlsx and .xls files are supported.</li>
                  <li>Maximum file size: 10MB</li>
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
