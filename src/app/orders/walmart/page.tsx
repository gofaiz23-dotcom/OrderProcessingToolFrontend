'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderList } from '../_components';
import { getWalmartOrders } from '@/app/api/walmart-api/orders';
import type { Order, PaginationMeta } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { Loader2 } from 'lucide-react';
import { useWalmartTokenRefresh } from '@/app/hooks/useWalmartTokenRefresh';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100; // Walmart API default

function WalmartOrdersPageContent() {
  // Initialize token refresh hook - automatically fetches token on mount and refreshes every 10 min
  // Hook handles client-side check internally
  useWalmartTokenRefresh();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  
  // Walmart API Filters
  const [sku, setSku] = useState('');
  const [customerOrderId, setCustomerOrderId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [status, setStatus] = useState('');
  const [createdStartDate, setCreatedStartDate] = useState('');
  const [createdEndDate, setCreatedEndDate] = useState('');
  const [limit, setLimit] = useState<string>('100'); // Can be '10', '50', '100', or custom number
  const [customLimit, setCustomLimit] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const isInitialMount = useRef(true);

  // Get pagination params from URL
  const currentPage = useMemo(() => {
    const pageParam = searchParams?.get('page');
    const pageNum = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE;
    return isNaN(pageNum) || pageNum < 1 ? DEFAULT_PAGE : pageNum;
  }, [searchParams]);

  // Calculate the actual limit value - use default if not set
  const actualLimit = useMemo(() => {
    if (limit === 'custom') {
      if (!customLimit) return DEFAULT_LIMIT; // Use default if custom limit not set
      const customLimitNum = parseInt(customLimit, 10);
      return isNaN(customLimitNum) || customLimitNum < 1 ? DEFAULT_LIMIT : customLimitNum;
    }
    const limitNum = parseInt(limit, 10);
    return isNaN(limitNum) || limitNum < 1 ? DEFAULT_LIMIT : limitNum;
  }, [limit, customLimit]);

  // Check if dates are selected to enable/disable limit dropdown
  const areDatesSelected = createdStartDate && createdEndDate;

  // Check if date range exceeds 180 days (approximately 6 months)
  const dateRangeExceeds180Days = useMemo(() => {
    if (!createdStartDate || !createdEndDate) return false;
    const start = new Date(createdStartDate);
    const end = new Date(createdEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 180;
  }, [createdStartDate, createdEndDate]);

  // Update URL params when page changes
  const updatePageInUrl = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (page === DEFAULT_PAGE) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
  }, [searchParams, router, pathname]);

  // Helper to format date to ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    // If date string is already in YYYY-MM-DD format, add time portion
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${dateString}T00:00:00Z`;
    }
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    // Try to parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching Walmart orders...', {
        page: currentPage,
        limit: actualLimit,
        filters: {
          sku,
          customerOrderId,
          purchaseOrderId,
          status,
          createdStartDate,
          createdEndDate,
        },
      });
      
      // Build query params - include date filters only if both dates are set
      const queryParams: any = {
        page: currentPage,
        limit: actualLimit,
        sku: sku || undefined,
        customerOrderId: customerOrderId || undefined,
        purchaseOrderId: purchaseOrderId || undefined,
        status: status || undefined,
      };

      // Only include date filters if both dates are selected
      if (createdStartDate && createdEndDate) {
        queryParams.createdStartDate = formatDateToISO(createdStartDate);
        queryParams.createdEndDate = formatDateToISO(createdEndDate);
      }
      
      const result = await getWalmartOrders(queryParams);
      
      console.log('📦 Walmart orders result:', {
        success: result.success,
        ordersCount: result.orders?.length || 0,
        pagination: result.pagination,
        message: result.message,
        error: result.error,
      });
      
      if (!result.success) {
        const errorMessage = result.message || 'Failed to fetch Walmart orders';
        console.error('❌ Failed to fetch orders:', errorMessage, result.error);
        throw new Error(errorMessage);
      }
      
      if (!result.orders || result.orders.length === 0) {
        console.warn('⚠️ No orders returned from API');
        setOrders([]);
        setPagination(result.pagination || null);
      } else {
        setOrders(result.orders);
        setPagination(result.pagination || null);
      }
    } catch (err) {
      setError(err);
      console.error('❌ Error loading Walmart orders:', err);
      setOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    actualLimit,
    sku,
    customerOrderId,
    purchaseOrderId,
    status,
    createdStartDate,
    createdEndDate,
  ]);

  // Fetch orders on initial mount and when page changes (for pagination)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchOrders();
    } else {
      // Page changed - fetch new page
      const timer = setTimeout(() => {
        fetchOrders();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // Watch page changes

  const handleSearch = useCallback(() => {
    // Reset to page 1 when searching with filters, then fetch
    if (currentPage !== DEFAULT_PAGE) {
      updatePageInUrl(DEFAULT_PAGE);
      // fetchOrders will be called automatically when page changes via useEffect
    } else {
      // Already on page 1, fetch directly
      fetchOrders();
    }
  }, [fetchOrders, currentPage, updatePageInUrl]);

  const handleClearSearch = useCallback(() => {
    setSku('');
    setCustomerOrderId('');
    setPurchaseOrderId('');
    setStatus('');
    setCreatedStartDate('');
    setCreatedEndDate('');
    setLimit('100');
    setCustomLimit('');
  }, []);

  const handlePageChange = useCallback((page: number) => {
    updatePageInUrl(page);
    // fetchOrders will be called automatically when currentPage changes via useEffect
  }, [updatePageInUrl]);

  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
  }, []);

  const handleOrderDelete = useCallback(async (id: number) => {
    // Walmart orders are read-only, cannot delete
    console.warn('Walmart orders cannot be deleted from this interface');
  }, []);

  const handleCreateNew = useCallback(() => {
    // Walmart orders are read-only, cannot create
    console.warn('Walmart orders cannot be created from this interface');
  }, []);

  const handleImportFile = useCallback(async (file: File) => {
    // Walmart orders are read-only, cannot import
    console.warn('Walmart orders cannot be imported');
  }, []);

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <ErrorDisplay error={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden w-full">
      {/* Top Bar with Show Filters and Action Buttons */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-2"
          >
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
          </button>
          
          {/* Total Orders Count Badge */}
          {!loading && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
              <span className="text-xs font-medium text-blue-700">Total Orders</span>
              <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 bg-blue-600 text-white text-sm font-bold rounded-full">
                {pagination?.totalCount || orders.length || 0}
              </span>
            </div>
          )}
        </div>
        
        {/* Search and Clear Buttons - Only show when filters are visible */}
        {showFilters && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleClearSearch}
              className="px-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Walmart API Filters Panel - Collapsible */}
      {showFilters && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 space-y-3">
          {/* First Row - Existing Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-slate-900 mb-0.5">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Product SKU"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Purchase Order ID */}
            <div>
              <label className="block text-xs font-medium text-slate-900 mb-0.5">Purchase Order ID</label>
              <input
                type="text"
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                placeholder="Purchase Order ID"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-900 mb-0.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Created">Created</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Second Row - API-based Date Filters and Limit */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {/* Created Start Date */}
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={createdStartDate}
                  onChange={(e) => setCreatedStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Created End Date */}
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-0.5">End Date</label>
                <input
                  type="date"
                  value={createdEndDate}
                  onChange={(e) => setCreatedEndDate(e.target.value)}
                  min={createdStartDate || undefined}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Limit Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-0.5">Limit</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  disabled={!areDatesSelected}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  <option value="10">10</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Limit Input - Only show when "custom" is selected */}
              {limit === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-0.5">Custom Limit</label>
                  <input
                    type="number"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    placeholder="Enter limit"
                    min="1"
                    disabled={!areDatesSelected}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Date Range Validation Message */}
            {dateRangeExceeds180Days && areDatesSelected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <span className="text-yellow-600 text-xs">⚠️</span>
                <span className="text-xs text-yellow-700 font-medium">
                  Date range should not exceed 180 days (approximately 6 months). Please select a shorter date range.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Table - Always visible, takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden w-full">
      <OrderList
        orders={orders}
        selectedOrderId={selectedOrder?.id || null}
        loading={loading}
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onOrderSelect={handleOrderSelect}
        onOrderDelete={handleOrderDelete}
          hideTitle={true}
          hideSearch={true}
          fullWidth={true}
      />
      </div>
    </div>
  );
}

export default function WalmartOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    }>
      <WalmartOrdersPageContent />
    </Suspense>
  );
}
