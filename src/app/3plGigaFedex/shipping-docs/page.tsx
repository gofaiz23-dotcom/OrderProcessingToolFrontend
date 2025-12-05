'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, RefreshCw, Loader2, Folder, FileText, Calendar, X, Download, Eye } from 'lucide-react';
import {
  getAllThreePlGigaFedex,
  deleteThreePlGigaFedex,
  deleteThreePlGigaFedexByDateRange,
  type ThreePlGigaFedexRecord,
  type GetAllThreePlGigaFedexQueryOptions,
} from '@/app/api/3plGigaFedexApi/shippingDocsApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildFileUrl } from '../../../../BaseUrl';
import { DateFilter } from '@/app/components/shared/DateFilter';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100; // Increased limit to show more records per page

export default function ShippingDocsPage() {
  const [records, setRecords] = useState<ThreePlGigaFedexRecord[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [dateRangeDeleteModalOpen, setDateRangeDeleteModalOpen] = useState(false);
  const [dateRangeDeleteLoading, setDateRangeDeleteLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string } | null>(null);
  const [timeDetailsModal, setTimeDetailsModal] = useState<{ record: ThreePlGigaFedexRecord | null }>({ record: null });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const options: GetAllThreePlGigaFedexQueryOptions = {
        page: currentPage,
        limit: DEFAULT_LIMIT,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (searchQuery.trim()) {
        options.trackingNo = searchQuery.trim();
      }

      const response = await getAllThreePlGigaFedex(options);
      setRecords(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedRecordId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecordId) return;

    setDeleteLoading(true);
    try {
      await deleteThreePlGigaFedex(selectedRecordId);
      setDeleteModalOpen(false);
      setSelectedRecordId(null);
      fetchRecords();
    } catch (err) {
      setError(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDateRangeDelete = async () => {
    if (!startDate || !endDate) return;

    setDateRangeDeleteLoading(true);
    try {
      await deleteThreePlGigaFedexByDateRange(startDate, endDate);
      setDateRangeDeleteModalOpen(false);
      setStartDate('');
      setEndDate('');
      fetchRecords();
    } catch (err) {
      setError(err);
    } finally {
      setDateRangeDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileClick = (filePath: string) => {
    const fileUrl = buildFileUrl(filePath);
    const filename = filePath.split('/').pop() || 'file';
    setPreviewFile({ url: fileUrl, filename });
  };

  // Get all unique keys from fedexJson across all records for dynamic columns
  // Exclude time fields as they will be shown in a separate column
  const fedexJsonColumns = useMemo(() => {
    const allKeys = new Set<string>();
    const timeFields = ['creationTime', 'successfulBuyLabelTime', 'createdAt', 'updatedAt'];
    records.forEach((record) => {
      if (record.fedexJson && typeof record.fedexJson === 'object') {
        Object.keys(record.fedexJson).forEach((key) => {
          if (!timeFields.includes(key)) {
            allKeys.add(key);
          }
        });
      }
    });
    return Array.from(allKeys).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (dateFilter === 'all') return records;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);

    return records.filter((record) => {
      const recordDate = new Date(record.createdAt);

      switch (dateFilter) {
        case 'today':
          return recordDate >= today;
        case 'thisWeek':
          return recordDate >= thisWeek;
        case 'specificDate':
          if (!startDate) return true;
          const filterDate = new Date(startDate);
          return recordDate.toDateString() === filterDate.toDateString();
        case 'custom':
          if (!startDate || !endDate) return true;
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return recordDate >= start && recordDate <= end;
        default:
          return true;
      }
    });
  }, [records, dateFilter, startDate, endDate]);

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Format column header (convert camelCase to Title Case)
  const formatColumnHeader = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Shipping Docs</h1>
              <p className="text-slate-600">
                Manage 3PL Giga Fedex shipping documents and tracking records
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <ErrorDisplay error={error} />
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search by Tracking Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Enter tracking number..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Search
                  </button>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <DateFilter
                  dateFilter={dateFilter}
                  startDate={startDate}
                  endDate={endDate}
                  onDateFilterChange={setDateFilter}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            </div>

            {/* Delete by Date Range */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setDateRangeDeleteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={18} />
                <span>Delete by Date Range</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Folder size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Records</p>
                  <p className="text-2xl font-bold text-slate-800">{pagination?.total || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Showing</p>
                  <p className="text-2xl font-bold text-green-600">
                    {pagination ? `${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)}` : '0 - 0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading && records.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Folder size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium mb-2">No records found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery ? 'Try a different search query' : 'No shipping documents available'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-12 bg-slate-50 z-10">
                        Tracking Number
                      </th>
                      {/* Dynamic FedEx JSON columns */}
                      {fedexJsonColumns.map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[150px]"
                        >
                          {formatColumnHeader(key)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Creation Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Successful Buy Label Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Files
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky right-0 bg-slate-50 z-10">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10">
                          {record.id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700 sticky left-12 bg-white z-10">
                          <span className="font-mono font-semibold">{record.trackingNo}</span>
                        </td>
                        {/* Dynamic FedEx JSON values */}
                        {fedexJsonColumns.map((key) => (
                          <td
                            key={key}
                            className="px-4 py-4 text-sm text-slate-700 max-w-[200px]"
                            title={formatValue(record.fedexJson?.[key])}
                          >
                            <div className="truncate">
                              {formatValue(record.fedexJson?.[key])}
                            </div>
                          </td>
                        ))}
                        {/* Creation Time */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                          {record.fedexJson?.creationTime ? (
                            <span>{String(record.fedexJson.creationTime)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        {/* Successful Buy Label Time */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                          {record.fedexJson?.successfulBuyLabelTime ? (
                            <span>{String(record.fedexJson.successfulBuyLabelTime)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {record.uploadArray && record.uploadArray.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {record.uploadArray.map((filePath, index) => {
                                const filename = filePath.split('/').pop() || 'file';
                                return (
                                  <button
                                    key={index}
                                    onClick={() => handleFileClick(filePath)}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                                  >
                                    <FileText size={12} />
                                    <span className="max-w-[150px] truncate">{filename}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No files</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm sticky right-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setTimeDetailsModal({ record })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              title="View time details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(record.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1.5 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-sm text-slate-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1.5 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Confirm Delete</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedRecordId(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin inline mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Delete Modal */}
      {dateRangeDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Delete by Date Range</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDateRangeDeleteModalOpen(false);
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDateRangeDelete}
                disabled={dateRangeDeleteLoading || !startDate || !endDate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {dateRangeDeleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin inline mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Details Modal */}
      {timeDetailsModal.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Record Details</h3>
              <button
                onClick={() => setTimeDetailsModal({ record: null })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">ID</p>
                    <p className="text-sm text-slate-800 font-medium">{timeDetailsModal.record.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Tracking Number</p>
                    <p className="text-sm text-slate-800 font-mono font-semibold">{timeDetailsModal.record.trackingNo}</p>
                  </div>
                </div>
              </div>

              {/* FedEx JSON Data */}
              {timeDetailsModal.record.fedexJson && typeof timeDetailsModal.record.fedexJson === 'object' && Object.keys(timeDetailsModal.record.fedexJson).length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">FedEx Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(timeDetailsModal.record.fedexJson).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-semibold text-slate-500 mb-1">{formatColumnHeader(key)}</p>
                        <p className="text-sm text-slate-800 break-words">
                          {formatValue(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {timeDetailsModal.record.uploadArray && timeDetailsModal.record.uploadArray.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Files</h4>
                  <div className="flex flex-wrap gap-2">
                    {timeDetailsModal.record.uploadArray.map((filePath, index) => {
                      const filename = filePath.split('/').pop() || 'file';
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setTimeDetailsModal({ record: null });
                            handleFileClick(filePath);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <FileText size={16} />
                          <span>{filename}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Database Timestamps */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Database Timestamps</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Created At (Database)</p>
                    <p className="text-sm text-slate-800">
                      {formatDate(timeDetailsModal.record.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Updated At (Database)</p>
                    <p className="text-sm text-slate-800">
                      {formatDate(timeDetailsModal.record.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setTimeDetailsModal({ record: null })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <iframe
                src={previewFile.url}
                className="w-full h-[600px] border-0"
                title={previewFile.filename}
              />
            </div>
            <div className="mt-4 flex gap-3 justify-end">
              <a
                href={previewFile.url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                <span>Download</span>
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
