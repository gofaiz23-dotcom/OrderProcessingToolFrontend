'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, Zap, Activity, FileSpreadsheet, TrendingUp, Brain, Package } from 'lucide-react';
import { getAllUploadStatus, type UploadStatusItem, getAllScrapBolStatus, type ScrapBolStatusItem } from '@/app/api/3plGigaFedexApi';
import { getAllEstesPickupStatus, type EstesPickupStatusItem } from '@/app/api/3plGigaFedexApi/estesPickupApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

export default function StatusPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'excel' | 'scrapbol' | 'estespickup'>('excel');
  const hasNavigatedRef = useRef({ excel: false, scrapbol: false, estespickup: false }); // Track navigation to prevent duplicates
  
  // Excel Import Status
  const [statuses, setStatuses] = useState<UploadStatusItem[]>([]);
  const [totalUploads, setTotalUploads] = useState(0);
  const [note, setNote] = useState('');
  
  // Scrap-Bol Status
  const [scrapBolStatuses, setScrapBolStatuses] = useState<ScrapBolStatusItem[]>([]);
  const [totalScrapingOps, setTotalScrapingOps] = useState(0);
  const [totalScraped, setTotalScraped] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [scrapBolNote, setScrapBolNote] = useState('');
  
  // Estes Pickup Status
  const [estesPickupStatuses, setEstesPickupStatuses] = useState<EstesPickupStatusItem[]>([]);
  const [totalEstesPickupOps, setTotalEstesPickupOps] = useState(0);
  const [totalEstesPickupErrors, setTotalEstesPickupErrors] = useState(0);
  const [estesPickupNote, setEstesPickupNote] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchStatuses = async () => {
    try {
      setError(null);
      // Fetch all statuses
      const [excelResponse, scrapBolResponse, estesPickupResponse] = await Promise.all([
        getAllUploadStatus(),
        getAllScrapBolStatus(),
        getAllEstesPickupStatus()
      ]);
      
      // Excel Import Status
      setStatuses(excelResponse.uploads);
      setTotalUploads(excelResponse.total_uploads);
      setNote(excelResponse.note);
      
      // Scrap-Bol Status
      setScrapBolStatuses(scrapBolResponse.scraping_operations);
      setTotalScrapingOps(scrapBolResponse.total_scraping_operations);
      setTotalScraped(scrapBolResponse.total_scraped);
      setTotalSaved(scrapBolResponse.total_saved);
      setScrapBolNote(scrapBolResponse.note);
      
      // Estes Pickup Status
      setEstesPickupStatuses(estesPickupResponse.automation_operations);
      setTotalEstesPickupOps(estesPickupResponse.total_automation_operations);
      setTotalEstesPickupErrors(estesPickupResponse.total_errors);
      setEstesPickupNote(estesPickupResponse.note);
      
      // Check if all Excel imports are complete, navigate to scrap-bol
      const allExcelComplete = excelResponse.uploads.length > 0 && excelResponse.uploads.every(
        upload => upload.status === 'success' || upload.status === 'completed' || upload.status === 'error'
      );
      if (allExcelComplete && excelResponse.uploads.length > 0 && activeTab === 'excel' && !hasNavigatedRef.current.excel) {
        // Check if we just completed, navigate to scrap-bol
        const hasRecentSuccess = excelResponse.uploads.some(
          upload => (upload.status === 'success' || upload.status === 'completed') && upload.progress === 100
        );
        if (hasRecentSuccess) {
          hasNavigatedRef.current.excel = true;
          setTimeout(() => {
            router.push('/3plGigaFedex/scrap-bol');
          }, 3000);
        }
      }
      
      // Check if all Scrap-Bol operations are complete, navigate to shipping-docs
      const allScrapBolComplete = scrapBolResponse.scraping_operations.length > 0 && scrapBolResponse.scraping_operations.every(
        op => op.status === 'success' || op.status === 'error'
      );
      if (allScrapBolComplete && scrapBolResponse.scraping_operations.length > 0 && activeTab === 'scrapbol' && !hasNavigatedRef.current.scrapbol) {
        // Check if we just completed, navigate to shipping-docs
        const hasRecentSuccess = scrapBolResponse.scraping_operations.some(
          op => op.status === 'success' && op.progress === 100
        );
        if (hasRecentSuccess) {
          hasNavigatedRef.current.scrapbol = true;
          setTimeout(() => {
            router.push('/3plGigaFedex/shipping-docs');
          }, 3000);
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();

    // Auto-refresh every 3 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchStatuses, 3000);
      setRefreshInterval(interval);
      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return <CheckCircle2 size={24} className="text-green-500" />;
      case 'error':
      case 'failed':
        return <XCircle size={24} className="text-red-500" />;
      case 'processing':
      case 'uploading':
      case 'validating':
      case 'preparing':
      case 'initializing':
        return <Loader2 size={24} className="text-blue-500 animate-spin" />;
      default:
        return <Clock size={24} className="text-slate-400" />;
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'from-green-50 via-emerald-50 to-green-50 border-green-300';
      case 'error':
      case 'failed':
        return 'from-red-50 via-rose-50 to-red-50 border-red-300';
      case 'processing':
      case 'uploading':
      case 'validating':
      case 'preparing':
      case 'initializing':
        return 'from-blue-50 via-cyan-50 to-blue-50 border-blue-300';
      default:
        return 'from-slate-50 via-gray-50 to-slate-50 border-slate-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200';
      case 'error':
      case 'failed':
        return 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200';
      case 'processing':
      case 'uploading':
      case 'validating':
      case 'preparing':
      case 'initializing':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-blue-200';
      default:
        return 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-slate-200';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    return `${seconds.toFixed(2)}s`;
  };

  const successfulCount = statuses.filter(s => s.status === 'success' || s.status === 'completed').length;
  const failedCount = statuses.filter(s => s.status === 'error' || s.status === 'failed').length;
  const processingCount = statuses.filter(s => 
    s.status === 'processing' || s.status === 'uploading' || 
    s.status === 'validating' || s.status === 'preparing' || s.status === 'initializing'
  ).length;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Modern Header with AI Theme */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Brain size={28} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                      AI Automation Dashboard
                    </h1>
                    <p className="text-slate-600 flex items-center gap-2">
                      <Activity size={16} className="text-blue-500 animate-pulse" />
                      Real-time monitoring of automation processes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Auto-refresh</span>
                  </label>
                  <button
                    onClick={fetchStatuses}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span className="font-medium">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error !== null && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
              <ErrorDisplay error={error} />
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-2 bg-white rounded-xl border-2 border-slate-200 p-2 shadow-lg">
            <button
              onClick={() => setActiveTab('excel')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'excel'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet size={18} />
              <span>Excel Import</span>
            </button>
            <button
              onClick={() => setActiveTab('scrapbol')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'scrapbol'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package size={18} />
              <span>Scrap-Bol</span>
            </button>
            <button
              onClick={() => setActiveTab('estespickup')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'estespickup'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package size={18} />
              <span>Estes Pickup</span>
            </button>
          </div>

          {/* Enhanced Stats Cards */}
          {activeTab === 'excel' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                    <FileSpreadsheet size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-700">{totalUploads}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-blue-800">Total Uploads</p>
                <p className="text-xs text-blue-600 mt-1">All automation tasks</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">{successfulCount}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-800">Successful</p>
                <p className="text-xs text-green-600 mt-1">Completed tasks</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                    <XCircle size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-700">{failedCount}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-red-800">Failed</p>
                <p className="text-xs text-red-600 mt-1">Error tasks</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-700">{processingCount}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-purple-800">Processing</p>
                <p className="text-xs text-purple-600 mt-1">Active automation</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                    <Package size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-700">{totalScrapingOps}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-blue-800">Total Operations</p>
                <p className="text-xs text-blue-600 mt-1">Scraping tasks</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">{totalScraped}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-800">Scraped</p>
                <p className="text-xs text-green-600 mt-1">Records scraped</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-700">{totalSaved}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-purple-800">Saved</p>
                <p className="text-xs text-purple-600 mt-1">Saved to backend</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                    <Activity size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-700">
                      {scrapBolStatuses.filter(s => s.status === 'scraping' || s.status === 'processing').length}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-orange-800">Processing</p>
                <p className="text-xs text-orange-600 mt-1">Active scraping</p>
              </div>
            </div>
          )}

          {/* Status List with Modern Design */}
          {activeTab === 'excel' ? (
            <>
              {loading && statuses.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 animate-pulse">
                <Loader2 size={40} className="text-white animate-spin" />
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">Loading automation status...</p>
              <p className="text-sm text-slate-500">Fetching real-time data</p>
            </div>
          ) : statuses.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full mb-6">
                <BarChart3 size={40} className="text-white" />
              </div>
              <p className="text-xl font-bold text-slate-700 mb-2">No Automation Tasks Found</p>
              <p className="text-sm text-slate-500 mb-4">
                Upload an Excel file to start the automation process
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                <Brain size={14} />
                <span>AI automation will process your files</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {statuses.map((status, index) => (
                <div
                  key={status.upload_id}
                  className={`bg-gradient-to-br ${getStatusGradient(status.status)} rounded-2xl border-2 p-6 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                        {getStatusIcon(status.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">{status.filename}</h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getStatusBadgeColor(status.status)}`}>
                            {status.status.toUpperCase()}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-2">
                          <Activity size={14} className={status.status === 'processing' || status.status === 'uploading' ? 'animate-pulse' : ''} />
                          {status.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Automation Progress
                      </span>
                      <span className="font-bold text-lg text-slate-800">{status.progress}%</span>
                    </div>
                    <div className="relative w-full bg-white/60 backdrop-blur-sm rounded-full h-4 shadow-inner overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out shadow-lg ${
                          status.status === 'success' || status.status === 'completed'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : status.status === 'error' || status.status === 'failed'
                            ? 'bg-gradient-to-r from-red-500 to-rose-600'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-600 animate-pulse'
                        }`}
                        style={{ width: `${status.progress}%` }}
                      >
                        {status.status === 'processing' || status.status === 'uploading' ? (
                          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Upload ID</p>
                      <p className="font-mono text-sm font-bold text-slate-800 break-all">{status.upload_id}</p>
                    </div>
                    {status.imported_count !== undefined && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Imported</p>
                        <p className="text-2xl font-bold text-green-600">{status.imported_count}</p>
                      </div>
                    )}
                    {status.failed_count !== undefined && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{status.failed_count}</p>
                      </div>
                    )}
                    {status.processing_time !== undefined && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Processing Time</p>
                        <p className="text-2xl font-bold text-blue-600">{formatTime(status.processing_time)}</p>
                      </div>
                    )}
                  </div>

                  {/* Errors Section */}
                  {status.errors && status.errors.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-red-200 bg-red-50/50 rounded-xl p-4">
                      <p className="text-xs font-bold text-red-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <AlertCircle size={14} />
                        Errors Detected
                      </p>
                      <ul className="space-y-2">
                        {status.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-2 bg-white/60 rounded-lg p-2">
                            <span className="text-red-500 mt-1 font-bold">•</span>
                            <span className="flex-1">{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          {note && (
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <AlertCircle size={20} className="text-white" />
                </div>
                <p className="text-sm font-medium text-blue-900 flex-1">{note}</p>
              </div>
            </div>
          )}
            </>
          ) : activeTab === 'scrapbol' ? (
            <>
              {loading && scrapBolStatuses.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 animate-pulse">
                    <Loader2 size={40} className="text-white animate-spin" />
                  </div>
                  <p className="text-lg font-semibold text-slate-700 mb-2">Loading scraping status...</p>
                  <p className="text-sm text-slate-500">Fetching real-time data</p>
                </div>
              ) : scrapBolStatuses.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full mb-6">
                    <Package size={40} className="text-white" />
                  </div>
                  <p className="text-xl font-bold text-slate-700 mb-2">No Scraping Operations Found</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Start a scraping operation to see status here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {scrapBolStatuses.map((status, index) => (
                    <div
                      key={status.scraping_id}
                      className={`bg-gradient-to-br ${getStatusGradient(status.status)} rounded-2xl border-2 p-6 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                            {getStatusIcon(status.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-800">
                                Scraping: {status.start_date} {status.end_date !== status.start_date ? `to ${status.end_date}` : ''}
                              </h3>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getStatusBadgeColor(status.status)}`}>
                                {status.status.toUpperCase()}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                              <Activity size={14} className={status.status === 'scraping' || status.status === 'processing' ? 'animate-pulse' : ''} />
                              {status.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Scraping Progress
                          </span>
                          <span className="font-bold text-lg text-slate-800">{status.progress}%</span>
                        </div>
                        <div className="relative w-full bg-white/60 backdrop-blur-sm rounded-full h-4 shadow-inner overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out shadow-lg ${
                              status.status === 'success'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                : status.status === 'error'
                                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-600 animate-pulse'
                            }`}
                            style={{ width: `${status.progress}%` }}
                          >
                            {status.status === 'scraping' || status.status === 'processing' ? (
                              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Scraping ID</p>
                          <p className="font-mono text-sm font-bold text-slate-800 break-all">{status.scraping_id}</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Scraped</p>
                          <p className="text-2xl font-bold text-green-600">{status.scraped_count}</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Saved</p>
                          <p className="text-2xl font-bold text-blue-600">{status.saved_count}</p>
                        </div>
                        {status.processing_time !== undefined && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Processing Time</p>
                            <p className="text-2xl font-bold text-purple-600">{formatTime(status.processing_time)}</p>
                          </div>
                        )}
                      </div>

                      {/* Errors Section */}
                      {status.errors && status.errors.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-red-200 bg-red-50/50 rounded-xl p-4">
                          <p className="text-xs font-bold text-red-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <AlertCircle size={14} />
                            Errors Detected
                          </p>
                          <ul className="space-y-2">
                            {status.errors.map((error, idx) => (
                              <li key={idx} className="text-sm text-red-700 flex items-start gap-2 bg-white/60 rounded-lg p-2">
                                <span className="text-red-500 mt-1 font-bold">•</span>
                                <span className="flex-1">{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              {scrapBolNote && (
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-blue-900 flex-1">{scrapBolNote}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Estes Pickup Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                      <Package size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-700">{totalEstesPickupOps}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-blue-800">Total Operations</p>
                  <p className="text-xs text-blue-600 mt-1">Pickup requests</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <CheckCircle2 size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-700">
                        {estesPickupStatuses.filter(s => s.status === 'success').length}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-800">Successful</p>
                  <p className="text-xs text-green-600 mt-1">Completed requests</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                      <XCircle size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-red-700">{totalEstesPickupErrors}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-800">Errors</p>
                  <p className="text-xs text-red-600 mt-1">Failed requests</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-700">
                        {estesPickupStatuses.filter(s => s.status === 'automating' || s.status === 'preparing' || s.status === 'initializing').length}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-purple-800">Processing</p>
                  <p className="text-xs text-purple-600 mt-1">Active automation</p>
                </div>
              </div>

              {/* Estes Pickup Status List */}
              {loading && estesPickupStatuses.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 animate-pulse">
                    <Loader2 size={40} className="text-white animate-spin" />
                  </div>
                  <p className="text-lg font-semibold text-slate-700 mb-2">Loading pickup status...</p>
                  <p className="text-sm text-slate-500">Fetching real-time data</p>
                </div>
              ) : estesPickupStatuses.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border-2 border-slate-200 p-16 text-center shadow-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full mb-6">
                    <Package size={40} className="text-white" />
                  </div>
                  <p className="text-xl font-bold text-slate-700 mb-2">No Pickup Requests Found</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Create a pickup request to see status here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {estesPickupStatuses.map((status, index) => (
                    <div
                      key={status.automation_id}
                      className={`bg-gradient-to-br ${getStatusGradient(status.status)} rounded-2xl border-2 p-6 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                            {getStatusIcon(status.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-800">Estes Pickup Request</h3>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getStatusBadgeColor(status.status)}`}>
                                {status.status.toUpperCase()}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                              <Activity size={14} className={status.status === 'automating' || status.status === 'preparing' ? 'animate-pulse' : ''} />
                              {status.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Automation Progress
                          </span>
                          <span className="font-bold text-lg text-slate-800">{status.progress}%</span>
                        </div>
                        <div className="relative w-full bg-white/60 backdrop-blur-sm rounded-full h-4 shadow-inner overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out shadow-lg ${
                              status.status === 'success'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                : status.status === 'error'
                                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-600 animate-pulse'
                            }`}
                            style={{ width: `${status.progress}%` }}
                          >
                            {status.status === 'automating' || status.status === 'preparing' ? (
                              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Automation ID</p>
                          <p className="font-mono text-sm font-bold text-slate-800 break-all">{status.automation_id}</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Browser</p>
                          <p className="text-sm font-bold text-blue-600 capitalize">{status.browser_type}</p>
                        </div>
                        {status.processing_time !== undefined && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Processing Time</p>
                            <p className="text-2xl font-bold text-purple-600">{formatTime(status.processing_time)}</p>
                          </div>
                        )}
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Show Browser</p>
                          <p className="text-sm font-bold text-slate-800">{status.show_browser ? 'Yes' : 'No'}</p>
                        </div>
                      </div>

                      {/* Errors Section */}
                      {status.errors && status.errors.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-red-200 bg-red-50/50 rounded-xl p-4">
                          <p className="text-xs font-bold text-red-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <AlertCircle size={14} />
                            Errors Detected
                          </p>
                          <ul className="space-y-2">
                            {status.errors.map((error, idx) => (
                              <li key={idx} className="text-sm text-red-700 flex items-start gap-2 bg-white/60 rounded-lg p-2">
                                <span className="text-red-500 mt-1 font-bold">•</span>
                                <span className="flex-1">{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              {estesPickupNote && (
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-blue-900 flex-1">{estesPickupNote}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add shimmer animation style */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
